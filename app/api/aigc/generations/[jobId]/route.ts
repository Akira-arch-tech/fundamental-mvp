import { NextResponse } from "next/server";
import { getAigcJob } from "@/lib/aigc-job-service";
import { newRequestId } from "@/lib/request-id";

/** 查询任务状态与候选图（轮询用）；无 DB 时懒触发 queued → ready */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ jobId: string }> },
) {
  const requestId = newRequestId();
  const { jobId } = await ctx.params;
  const job = await getAigcJob(jobId, { runLazyProcessor: true });
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
      mode: job.mode,
      prompt: job.prompt,
      negative_prompt: job.negative_prompt,
      aspect_ratio: job.aspect_ratio,
      candidate_count: job.candidate_count,
      seed: job.seed,
      strength: job.strength,
      reference_asset_count: job.reference_asset_count,
      reference_asset_ids: job.reference_asset_ids,
      references: job.references,
      composition_mode: job.composition_mode,
      status: job.status,
      created_at: job.created_at,
      confirm_deadline_at: job.confirm_deadline_at,
      candidates: job.status === "ready" || job.status === "confirmed" ? job.candidates : [],
      confirmed_index: job.confirmed_index,
      warnings: job.warnings,
      provider_request_id: job.provider_request_id,
      error:
        job.error_code != null
          ? { code: job.error_code, message: job.error_message ?? "" }
          : null,
      requestId,
    },
    { headers: { "X-Request-Id": requestId } },
  );
}
