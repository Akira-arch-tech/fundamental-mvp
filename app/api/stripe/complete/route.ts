import { after, NextResponse } from "next/server";
import { enqueueIntegrationJob } from "@/lib/integration/jobs-store";
import { runIntegrationWorker } from "@/lib/integration/worker";
import { fulfillPaidCheckoutSession } from "@/lib/stripe-fulfillment";
import { isStripeConfigured } from "@/lib/stripe-env";
import { newRequestId } from "@/lib/request-id";

export async function POST(req: Request) {
  const requestId = newRequestId();
  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        code: "NOT_CONFIGURED",
        message: "STRIPE_SECRET_KEY が未設定です。",
        requestId,
      },
      { status: 503, headers: { "X-Request-Id": requestId } },
    );
  }

  let body: { session_id?: string };
  try {
    body = (await req.json()) as { session_id?: string };
  } catch {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: "invalid json", requestId },
      { status: 400, headers: { "X-Request-Id": requestId } },
    );
  }

  const sessionId = typeof body.session_id === "string" ? body.session_id.trim() : "";
  if (!sessionId.startsWith("cs_")) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "valid session_id (cs_*) is required", requestId },
      { status: 422, headers: { "X-Request-Id": requestId } },
    );
  }

  const result = await fulfillPaidCheckoutSession(sessionId, requestId);
  if (!result.ok) {
    return NextResponse.json(
      { code: result.code, message: result.message, requestId: result.requestId },
      { status: result.httpStatus, headers: { "X-Request-Id": result.requestId } },
    );
  }

  const order = result.order;
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
}
