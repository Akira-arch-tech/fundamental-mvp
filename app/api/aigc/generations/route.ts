import { NextResponse } from "next/server";
import { products } from "@/data/seed";
import {
  AIGC_MAX_CANDIDATE_COUNT,
  AIGC_MAX_REFERENCE_ASSET_COUNT,
  AIGC_MIN_CANDIDATE_COUNT,
} from "@/lib/aigc-shared-constants";
import { enqueueAigcGeneration } from "@/lib/aigc-job-service";
import { newRequestId } from "@/lib/request-id";
import type {
  AigcCompositionMode,
  AigcGenerationCreateBody,
  AigcGenerationMode,
  AigcReferenceItem,
} from "@/lib/aigc-types";

function clampCandidateCount(n: unknown): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return 2;
  return Math.min(AIGC_MAX_CANDIDATE_COUNT, Math.max(AIGC_MIN_CANDIDATE_COUNT, Math.floor(n)));
}

/** 创建生图任务：queued →（GET 懒执行或 Cron）→ ready + 候选 */
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
    const negative_prompt =
      typeof body.negative_prompt === "string" && body.negative_prompt.trim()
        ? body.negative_prompt.trim().slice(0, 2000)
        : null;
    const aspect_ratio =
      typeof body.aspect_ratio === "string" && body.aspect_ratio.trim() ? body.aspect_ratio.trim() : null;
    const seed = typeof body.seed === "string" && body.seed.trim() ? body.seed.trim().slice(0, 64) : null;
    const candidate_count = clampCandidateCount(body.candidate_count);
    const strength =
      typeof body.strength === "number" && body.strength >= 0 && body.strength <= 1 ? body.strength : null;

    let reference_asset_ids = Array.isArray(body.reference_asset_ids)
      ? body.reference_asset_ids
          .filter((x): x is string => typeof x === "string")
          .map((x) => x.trim())
          .filter(Boolean)
      : [];
    reference_asset_ids = reference_asset_ids.slice(0, AIGC_MAX_REFERENCE_ASSET_COUNT);

    let references: AigcReferenceItem[] | null = Array.isArray(body.references)
      ? body.references
          .filter(
            (r): r is AigcReferenceItem =>
              r != null &&
              typeof r === "object" &&
              typeof (r as AigcReferenceItem).asset_id === "string" &&
              typeof (r as AigcReferenceItem).role === "string",
          )
          .map((r) => ({
            asset_id: (r as AigcReferenceItem).asset_id.trim(),
            role: (r as AigcReferenceItem).role as AigcReferenceItem["role"],
          }))
      : null;
    if (references && references.length > AIGC_MAX_REFERENCE_ASSET_COUNT) {
      references = references.slice(0, AIGC_MAX_REFERENCE_ASSET_COUNT);
    }
    const allowedRoles = new Set(["subject", "style", "layout", "other"]);
    if (references) {
      for (const r of references) {
        if (!allowedRoles.has(r.role)) {
          return NextResponse.json(
            { code: "VALIDATION_ERROR", message: `invalid reference role: ${r.role}`, requestId },
            { status: 422, headers: { "X-Request-Id": requestId } },
          );
        }
      }
    }
    if (references && references.length > 0 && reference_asset_ids.length === 0) {
      reference_asset_ids = references.map((r) => r.asset_id);
    }

    const composition_mode =
      typeof body.composition_mode === "string" && body.composition_mode.trim()
        ? (body.composition_mode.trim() as AigcCompositionMode)
        : null;

    let mode: AigcGenerationMode =
      body.mode === "txt2img" || body.mode === "img2img" || body.mode === "multi_ref" ? body.mode : "txt2img";

    if (!body.mode) {
      if (references && references.length > 0) mode = "multi_ref";
      else if (reference_asset_ids.length > 0) mode = "img2img";
      else mode = "txt2img";
    }

    if (mode === "txt2img" && !prompt) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "prompt is required for txt2img", requestId },
        { status: 422, headers: { "X-Request-Id": requestId } },
      );
    }
    if (mode === "img2img" && reference_asset_ids.length === 0) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "reference_asset_ids required for img2img", requestId },
        { status: 422, headers: { "X-Request-Id": requestId } },
      );
    }
    if (mode === "multi_ref") {
      if (!references || references.length === 0) {
        return NextResponse.json(
          { code: "VALIDATION_ERROR", message: "references required for multi_ref", requestId },
          { status: 422, headers: { "X-Request-Id": requestId } },
        );
      }
      const ids = new Set(reference_asset_ids);
      for (const r of references) {
        if (!ids.has(r.asset_id)) {
          return NextResponse.json(
            {
              code: "VALIDATION_ERROR",
              message: `reference_asset_ids must include asset from references: ${r.asset_id}`,
              requestId,
            },
            { status: 422, headers: { "X-Request-Id": requestId } },
          );
        }
      }
    }

    const job = await enqueueAigcGeneration({
      product_id: body.product_id,
      mode,
      prompt,
      negative_prompt,
      aspect_ratio,
      candidate_count,
      seed,
      strength,
      reference_asset_ids,
      references,
      composition_mode,
    });

    return NextResponse.json(
      {
        job_id: job.job_id,
        status: job.status,
        confirm_deadline_at: job.confirm_deadline_at,
        candidate_count: job.candidate_count,
        mode: job.mode,
        warnings: job.warnings,
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
