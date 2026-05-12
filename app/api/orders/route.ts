import { after, NextResponse } from "next/server";
import { products } from "@/data/seed";
import { getCustomization } from "@/lib/customizations-store";
import { enqueueIntegrationJob } from "@/lib/integration/jobs-store";
import { runIntegrationWorker } from "@/lib/integration/worker";
import { saveOrder } from "@/lib/orders-store";
import { newRequestId } from "@/lib/request-id";
import type { OrderCreateInput } from "@/lib/types";

export async function POST(req: Request) {
  const requestId = newRequestId();
  try {
    const body = (await req.json()) as Partial<OrderCreateInput>;
    const required = [
      "customization_id",
      "product_id",
      "qty",
      "recipient_name",
      "recipient_phone",
      "shipping_address",
    ] as const;
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { code: "VALIDATION_ERROR", message: `${field} is required`, requestId },
          { status: 422, headers: { "X-Request-Id": requestId } },
        );
      }
    }

    const qty = Number(body.qty);
    if (!Number.isInteger(qty) || qty < 1) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "qty must be integer >= 1", requestId },
        { status: 422, headers: { "X-Request-Id": requestId } },
      );
    }

    const pay = body.payment_method ?? "demo_instant";
    if (pay !== "demo_instant") {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message:
            "このエンドポイントでは demo_instant のみです。Stripe は /api/stripe/checkout-session からお進みください（PRD §8.5）。",
          requestId,
        },
        { status: 422, headers: { "X-Request-Id": requestId } },
      );
    }
    if (body.copyright_acknowledged !== true) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "copyright_acknowledged must be true (PRD 上传/内容声明)",
          requestId,
        },
        { status: 422, headers: { "X-Request-Id": requestId } },
      );
    }

    const product = products.find((p) => p.product_id === body.product_id);
    if (!product) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "product not found", requestId },
        { status: 404, headers: { "X-Request-Id": requestId } },
      );
    }
    const customization = await getCustomization(body.customization_id as string);
    if (!customization) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "customization not found", requestId },
        { status: 404, headers: { "X-Request-Id": requestId } },
      );
    }

    const order = await saveOrder({
      customization_id: body.customization_id as string,
      product_id: body.product_id as string,
      qty,
      recipient_name: body.recipient_name as string,
      recipient_phone: body.recipient_phone as string,
      shipping_address: body.shipping_address as string,
      note: body.note,
      payment_method: "demo_instant",
      copyright_acknowledged: true,
    });

    after(async () => {
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
      await enqueueIntegrationJob({
        target_system: "crm",
        event_type: "crm.order_created",
        payload: {
          order_id: order.order_id,
          order_no: order.order_no,
          product_id: order.product_id,
          qty: order.qty,
          total_amount: order.total_amount,
        },
        idempotency_key: `crm:order:${order.order_id}`,
        request_id: requestId,
      });
      await runIntegrationWorker(8);
    });

    return NextResponse.json(
      {
        order_id: order.order_id,
        order_no: order.order_no,
        status: order.status,
        total_amount: order.total_amount,
        shipping_fee: order.shipping_fee,
        unit_price: order.unit_price,
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
