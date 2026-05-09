import { appendCrmTimelineEntry } from "@/lib/integration/crm-timeline-store";

type ExceptionCrmPayload = {
  order_id: string;
  order_no: string;
  exception_request_id: string;
  status: string;
  operator: string;
  note?: string;
};

type OrderCreatedCrmPayload = {
  order_id: string;
  order_no: string;
  product_id: string;
  qty: number;
  total_amount: number;
};

export async function executeCrmExceptionJob(payload: unknown, requestId: string): Promise<void> {
  const p = payload as Partial<ExceptionCrmPayload>;
  if (!p.order_no || !p.exception_request_id || !p.status) {
    throw new Error("invalid crm.exception_updated payload");
  }
  await appendCrmTimelineEntry({
    order_id: p.order_id ?? null,
    order_no: p.order_no,
    exception_request_id: p.exception_request_id,
    event_type: "exception.updated",
    summary: `异常 ${p.exception_request_id} → ${p.status}（${p.operator ?? "unknown"}）`,
    payload: { status: p.status, note: p.note ?? null },
    request_id: requestId,
  });
}

export async function executeCrmOrderCreatedJob(payload: unknown, requestId: string): Promise<void> {
  const p = payload as Partial<OrderCreatedCrmPayload>;
  if (!p.order_no || !p.order_id || !p.product_id || !Number.isFinite(p.qty) || !Number.isFinite(p.total_amount)) {
    throw new Error("invalid crm.order_created payload");
  }
  await appendCrmTimelineEntry({
    order_id: p.order_id,
    order_no: p.order_no,
    exception_request_id: null,
    event_type: "order.created",
    summary: `订单 ${p.order_no} 已创建（商品 ${p.product_id} × ${p.qty}）`,
    payload: { product_id: p.product_id, qty: p.qty, total_amount: p.total_amount },
    request_id: requestId,
  });
}
