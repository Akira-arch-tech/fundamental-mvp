import { after, NextResponse } from "next/server";
import { clearCart, listCartItems } from "@/lib/cart-store";
import { enqueueIntegrationJob } from "@/lib/integration/jobs-store";
import { runIntegrationWorker } from "@/lib/integration/worker";
import { saveOrder } from "@/lib/orders-store";
import type { OrderRecord } from "@/lib/types";
import { newRequestId } from "@/lib/request-id";

interface BatchOrderBody {
  recipient_name?: string;
  recipient_phone?: string;
  shipping_address?: string;
  note?: string;
  payment_method?: string;
  copyright_acknowledged?: boolean;
}

export async function POST(req: Request) {
  const requestId = newRequestId();
  try {
    const body = (await req.json()) as BatchOrderBody;
    if (!body.recipient_name || !body.recipient_phone || !body.shipping_address) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "recipient_name, recipient_phone, shipping_address are required",
          requestId,
        },
        { status: 422, headers: { "X-Request-Id": requestId } },
      );
    }

    const cartItems = await listCartItems();
    if (cartItems.length === 0) {
      return NextResponse.json(
        { code: "EMPTY_CART", message: "cart is empty", requestId },
        { status: 422, headers: { "X-Request-Id": requestId } },
      );
    }

    const pay = body.payment_method ?? "demo_instant";
    if (pay !== "demo_instant") {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "batch checkout requires payment_method demo_instant (PRD §8.5)",
          requestId,
        },
        { status: 422, headers: { "X-Request-Id": requestId } },
      );
    }
    if (body.copyright_acknowledged !== true) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "copyright_acknowledged must be true",
          requestId,
        },
        { status: 422, headers: { "X-Request-Id": requestId } },
      );
    }

    const createdOrders: OrderRecord[] = [];
    for (const item of cartItems) {
      const customizationId = item.customization_id ?? `cart-${item.cart_item_id}`;
      const order = await saveOrder({
        customization_id: customizationId,
        product_id: item.product_id,
        qty: item.qty,
        recipient_name: body.recipient_name,
        recipient_phone: body.recipient_phone,
        shipping_address: body.shipping_address,
        note: body.note,
        payment_method: "demo_instant",
        copyright_acknowledged: true,
      });
      createdOrders.push(order);
    }

    await clearCart();

    after(async () => {
      for (const order of createdOrders) {
        await enqueueIntegrationJob({
          target_system: "erp",
          event_type: "erp.order_created",
          payload: {
            order_id: order.order_id,
            order_no: order.order_no,
            product_id: order.product_id,
            qty: order.qty,
            customization_id: order.customization_id,
            total_amount: order.total_amount,
          },
          idempotency_key: `erp:order:${order.order_id}`,
          request_id: requestId,
        });
      }
      await runIntegrationWorker(16);
    });

    return NextResponse.json(
      {
        order_count: createdOrders.length,
        total_amount: createdOrders.reduce((sum, o) => sum + o.total_amount, 0),
        orders: createdOrders.map((o) => ({
          order_id: o.order_id,
          order_no: o.order_no,
          total_amount: o.total_amount,
          status: o.status,
        })),
        requestId,
      },
      { headers: { "X-Request-Id": requestId } },
    );
  } catch {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: "invalid json body", requestId },
      { status: 400, headers: { "X-Request-Id": requestId } },
    );
  }
}
