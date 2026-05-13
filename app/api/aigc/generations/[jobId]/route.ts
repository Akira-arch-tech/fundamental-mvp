import { NextResponse } from "next/server";
import { getGenerationJob } from "@/lib/aigc-generation-store";
import { newRequestId } from "@/lib/request-id";

/** 查询任务状态与候选图（轮询用） */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ jobId: string }> },
) {
  const requestId = newRequestId();
  const { jobId } = await ctx.params;
  const job = getGenerationJob(jobId);
  if (!job) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "job not found", requestId },
      { status: 404, headers: { "X-Request-Id": requestId } },
    );
  }

  return NextResponse.json(
    {
      job_id: job.job_id,
      product_id: job.product_id,
      prompt: job.prompt,
      reference_asset_count: job.reference_asset_count,
      status: job.status,
      created_at: job.created_at,
      confirm_deadline_at: job.confirm_deadline_at,
      candidates: job.status === "ready" || job.status === "confirmed" ? job.candidates : [],
      confirmed_index: job.confirmed_index,
      error:
        job.error_code != null
          ? { code: job.error_code, message: job.error_message ?? "" }
          : null,
      requestId,
    },
    { headers: { "X-Request-Id": requestId } },
  );
}
