import { NextResponse } from "next/server";
import { addShipmentEvent } from "@/lib/shipment-events-store";
import { recordIntegrationAlert } from "@/lib/integration/alerts-store";
import { isWebhookEventDuplicate, markWebhookEventProcessed } from "@/lib/integration/webhook-dedupe";
import { verifyErpWebhookSignature } from "@/lib/integration/webhook-signature";
import { getOrderByOrderNo, updateOrderStatus } from "@/lib/orders-store";
import { newRequestId } from "@/lib/request-id";
import type { OrderRecord } from "@/lib/types";

type ErpWebhookBody = {
  event_id?: string;
  event_type?: string;
  order_no?: string;
  status?: string;
  erp_status?: string;
  tracking_no?: string;
  occurred_at?: string;
};

function mapErpToOrderStatus(erp: string): OrderRecord["status"] | null {
  const s = erp.toUpperCase();
  if (s === "ERP_NEW" || s === "NEW") return "reviewing";
  if (s === "ERP_WORKING" || s === "WORKING" || s === "IN_PRODUCTION") return "in_production";
  if (s === "ERP_SENT" || s === "SENT" || s === "SHIPPED" || s === "IN_TRANSIT" || s === "ERP_DONE" || s === "DONE")
    return "shipped";
  if (s === "ERP_CANCELLED" || s === "CANCELLED") return "created";
  return null;
}

export async function POST(req: Request) {
  const requestId = newRequestId();
  const secret = process.env.ERP_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { code: "NOT_CONFIGURED", message: "ERP_WEBHOOK_SECRET is not set", requestId },
      { status: 503, headers: { "X-Request-Id": requestId } },
    );
  }

  const raw = await req.text();
  const sig = req.headers.get("x-signature") ?? req.headers.get("X-Signature");
  if (!verifyErpWebhookSignature(raw, sig, secret)) {
    await recordIntegrationAlert({
      level: "error",
      code: "WEBHOOK_SIGNATURE_INVALID",
      message: "ERP webhook signature verification failed",
      requestId,
      meta: { has_sig: Boolean(sig) },
    });
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "invalid webhook signature", requestId },
      { status: 401, headers: { "X-Request-Id": requestId } },
    );
  }

  let body: ErpWebhookBody;
  try {
    body = JSON.parse(raw) as ErpWebhookBody;
  } catch {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: "invalid json", requestId },
      { status: 400, headers: { "X-Request-Id": requestId } },
    );
  }

  if (await isWebhookEventDuplicate(body.event_id)) {
    return NextResponse.json(
      { code: "DUPLICATE_EVENT", message: "event already processed", requestId },
      { status: 409, headers: { "X-Request-Id": requestId } },
    );
  }

  const orderNo = body.order_no?.trim();
  if (!orderNo) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "order_no is required", requestId },
      { status: 422, headers: { "X-Request-Id": requestId } },
    );
  }

  const order = await getOrderByOrderNo(orderNo);
  if (!order) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "order not found for order_no", requestId },
      { status: 404, headers: { "X-Request-Id": requestId } },
    );
  }

  const erpStatus = (body.status ?? body.erp_status ?? "").trim();
  if (!erpStatus) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "status is required", requestId },
      { status: 422, headers: { "X-Request-Id": requestId } },
    );
  }

  const next = mapErpToOrderStatus(erpStatus);
  if (!next) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: `unknown ERP status: ${erpStatus}`, requestId },
      { status: 422, headers: { "X-Request-Id": requestId } },
    );
  }

  await updateOrderStatus(order.order_id, next);

  const label =
    body.event_type === "shipment.updated"
      ? `物流更新（${erpStatus}）`
      : `ERP 状态同步（${erpStatus}）`;

  await addShipmentEvent({
    order_id: order.order_id,
    event_type: next === "shipped" ? "shipped" : "in_transit",
    event_label: label,
    location: "ERP",
    tracking_no: body.tracking_no,
    occurred_at: body.occurred_at,
  });

  await markWebhookEventProcessed(body.event_id);

  return NextResponse.json({ ok: true, order_id: order.order_id, status: next, requestId }, { headers: { "X-Request-Id": requestId } });
}
