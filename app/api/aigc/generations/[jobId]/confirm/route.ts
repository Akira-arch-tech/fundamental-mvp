import { NextResponse } from "next/server";
import { confirmAigcGeneration } from "@/lib/aigc-job-service";
import { newRequestId } from "@/lib/request-id";
import type { AigcGenerationConfirmBody } from "@/lib/aigc-types";

/** 在确认窗内选定一张候选图 */
export async function POST(req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const requestId = newRequestId();
  const { jobId } = await ctx.params;
  let body: Partial<AigcGenerationConfirmBody> = {};
  try {
    body = (await req.json()) as Partial<AigcGenerationConfirmBody>;
  } catch {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: "invalid json body", requestId },
      { status: 400, headers: { "X-Request-Id": requestId } },
    );
  }

  if (typeof body.candidate_index !== "number" || !Number.isInteger(body.candidate_index)) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "candidate_index (integer) is required", requestId },
      { status: 422, headers: { "X-Request-Id": requestId } },
    );
  }

  const result = await confirmAigcGeneration(jobId, body.candidate_index);
  if (!result.ok) {
    const status =
      result.code === "NOT_FOUND"
        ? 404
        : result.code === "EXPIRED" || result.code === "ALREADY_CONFIRMED"
          ? 409
          : 422;
    return NextResponse.json(
      { code: result.code, message: result.message, requestId },
      { status, headers: { "X-Request-Id": requestId } },
    );
  }

  const selected = result.job.candidates.find((c) => c.index === result.job.confirmed_index!)!;

  return NextResponse.json(
    {
      job_id: result.job.job_id,
      status: result.job.status,
      selected: {
        index: selected.index,
        url: selected.url,
        width: selected.width,
        height: selected.height,
      },
      next_step_hint: "Call POST /api/customizations with user_images including this URL, or attach asset_id when storage is wired.",
      requestId,
    },
    { headers: { "X-Request-Id": requestId } },
  );
}
