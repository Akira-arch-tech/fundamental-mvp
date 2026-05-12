import { after, NextResponse } from "next/server";
import { enqueueIntegrationJob } from "@/lib/integration/jobs-store";
import { runIntegrationWorker } from "@/lib/integration/worker";
import { fulfillPaidCheckoutSession, getStripeClient } from "@/lib/stripe-fulfillment";
import { newRequestId } from "@/lib/request-id";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const requestId = newRequestId();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      {
        code: "NOT_CONFIGURED",
        message: "STRIPE_WEBHOOK_SECRET が未設定のため Webhook を受け付けません。",
        requestId,
      },
      { status: 503, headers: { "X-Request-Id": requestId } },
    );
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "missing stripe-signature", requestId },
      { status: 400, headers: { "X-Request-Id": requestId } },
    );
  }

  const rawBody = await req.text();
  let event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "webhook verify failed";
    return NextResponse.json(
      { code: "WEBHOOK_VERIFY_FAILED", message: msg, requestId },
      { status: 400, headers: { "X-Request-Id": requestId } },
    );
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true, requestId }, { headers: { "X-Request-Id": requestId } });
  }

  const session = event.data.object as { id?: string };
  const sessionId = session.id;
  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json({ received: true, requestId }, { headers: { "X-Request-Id": requestId } });
  }

  const result = await fulfillPaidCheckoutSession(sessionId, requestId);
  if (!result.ok) {
    return NextResponse.json(
      { code: result.code, message: result.message, requestId: result.requestId },
      { status: 500, headers: { "X-Request-Id": result.requestId } },
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

  return NextResponse.json({ received: true, requestId }, { headers: { "X-Request-Id": requestId } });
}
