import { appendCrmTimelineEntry } from "@/lib/integration/crm-timeline-store";

type ExceptionCrmPayload = {
  order_id: string;
  order_no: string;
  exception_request_id: string;
  status: string;
  operator: string;
  note?: string;
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
