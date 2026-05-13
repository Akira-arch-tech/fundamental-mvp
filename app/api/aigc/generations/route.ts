import { NextResponse } from "next/server";
import { products } from "@/data/seed";
import { createGenerationJob } from "@/lib/aigc-generation-store";
import { newRequestId } from "@/lib/request-id";
import type { AigcGenerationCreateBody } from "@/lib/aigc-types";

/** 创建生图任务（MVP 骨架：立即 ready + 占位候选；后续换队列 + 真模型） */
export async function POST(req: Request) {
  const requestId = newRequestId();
  try {
    const body = (await req.json()) as Partial<AigcGenerationCreateBody>;
    if (!body.product_id || typeof body.product_id !== "string") {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "product_id is required", requestId },
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

    const prompt =
      typeof body.prompt === "string" && body.prompt.trim() ? body.prompt.trim().slice(0, 2000) : null;
    const reference_asset_count =
      typeof body.reference_asset_count === "number" && body.reference_asset_count >= 0
        ? Math.min(8, Math.floor(body.reference_asset_count))
        : 0;

    const job = createGenerationJob({
      product_id: body.product_id,
      prompt,
      reference_asset_count,
    });

    return NextResponse.json(
      {
        job_id: job.job_id,
        status: job.status,
        confirm_deadline_at: job.confirm_deadline_at,
        candidate_count: job.candidates.length,
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
