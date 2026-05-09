import { NextResponse } from "next/server";
import { listIntegrationJobsByRequestId } from "@/lib/integration/jobs-store";
import { newRequestId } from "@/lib/request-id";

/**
 * PRD：request 全链路可追踪；执行清单复用 GET /api/traces/{requestId}
 * 当前实现：返回与该 request_id 关联的集成任务（如 POST /api/orders/batch 入队 ERP 任务）。
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  const apiRequestId = newRequestId();
  const { requestId: raw } = await params;
  const traceId = decodeURIComponent(raw ?? "").trim();
  if (!traceId.startsWith("req_")) {
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message: "requestId must start with req_",
        requestId: apiRequestId,
      },
      { status: 422, headers: { "X-Request-Id": apiRequestId } },
    );
  }

  const jobs = await listIntegrationJobsByRequestId(traceId);
  return NextResponse.json(
    {
      trace_id: traceId,
      integration_jobs: jobs.map((j) => ({
        job_id: j.id,
        event_type: j.event_type,
        target_system: j.target_system,
        status: j.status,
        created_at: j.created_at,
        updated_at: j.updated_at,
        last_error: j.last_error,
      })),
      requestId: apiRequestId,
    },
    { headers: { "X-Request-Id": apiRequestId } },
  );
}
