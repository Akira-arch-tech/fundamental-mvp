/**
 * AIGC 任务编排：内存（无 DATABASE_URL）或 Postgres（有 DATABASE_URL）。
 */
import { randomBytes } from "node:crypto";
import {
  dbGetAigcJob,
  dbInsertAigcJob,
  dbListQueuedJobIds,
  dbTryClaimQueuedJob,
  dbUpdateAigcJob,
} from "@/lib/db/aigc-generation-repository";
import { getDb } from "@/lib/db/client";
import { getAigcModelProvider } from "@/lib/aigc-provider";
import { resolveReferenceAssetForGeneration } from "@/lib/aigc-reference-asset-store";
import type { AigcGenerationJob, AigcGenerationMode, AigcReferenceItem } from "@/lib/aigc-types";

export const AIGC_CONFIRM_WINDOW_MS = 10 * 60 * 1000;
const QUEUE_HINT_MS = 30 * 60 * 1000;

const mem = globalThis as unknown as { __aigcJobsV2?: Map<string, AigcGenerationJob> };
function memoryJobs(): Map<string, AigcGenerationJob> {
  if (!mem.__aigcJobsV2) mem.__aigcJobsV2 = new Map();
  return mem.__aigcJobsV2;
}

const inflight = new Set<string>();

function newJobId(): string {
  return `aigc_${Date.now().toString(36)}_${randomBytes(5).toString("hex")}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function applyExpirySync(job: AigcGenerationJob): AigcGenerationJob {
  if (job.status !== "ready") return job;
  if (Date.now() > new Date(job.confirm_deadline_at).getTime()) {
    return { ...job, status: "expired", candidates: [] };
  }
  return job;
}

async function persistJob(job: AigcGenerationJob): Promise<void> {
  const db = getDb();
  if (db) {
    await dbUpdateAigcJob(db, job.job_id, {
      status: job.status,
      candidates: job.candidates,
      confirmDeadlineAt: new Date(job.confirm_deadline_at),
      confirmedIndex: job.confirmed_index,
      errorCode: job.error_code,
      errorMessage: job.error_message,
      providerRequestId: job.provider_request_id,
      warnings: job.warnings,
    });
    return;
  }
  memoryJobs().set(job.job_id, job);
}

async function loadJob(jobId: string): Promise<AigcGenerationJob | undefined> {
  const db = getDb();
  if (db) {
    const row = await dbGetAigcJob(db, jobId);
    if (!row) return undefined;
    const j = applyExpirySync(row);
    if (row.status === "ready" && j.status === "expired") await persistJob(j);
    return j;
  }
  const raw = memoryJobs().get(jobId);
  if (!raw) return undefined;
  const j = applyExpirySync(raw);
  if (raw.status === "ready" && j.status === "expired") memoryJobs().set(jobId, j);
  return j;
}

export interface EnqueueAigcParams {
  product_id: string;
  mode: AigcGenerationMode;
  prompt: string | null;
  negative_prompt: string | null;
  aspect_ratio: string | null;
  candidate_count: number;
  seed: string | null;
  strength: number | null;
  reference_asset_ids: string[];
  references: AigcReferenceItem[] | null;
  composition_mode: AigcGenerationJob["composition_mode"];
}

export async function enqueueAigcGeneration(p: EnqueueAigcParams): Promise<AigcGenerationJob> {
  const job_id = newJobId();
  const created = nowIso();
  const hintDeadline = new Date(Date.now() + QUEUE_HINT_MS).toISOString();
  const job: AigcGenerationJob = {
    job_id,
    product_id: p.product_id,
    mode: p.mode,
    prompt: p.prompt,
    negative_prompt: p.negative_prompt,
    aspect_ratio: p.aspect_ratio,
    candidate_count: p.candidate_count,
    seed: p.seed,
    strength: p.strength,
    reference_asset_count: p.reference_asset_ids.length,
    reference_asset_ids: p.reference_asset_ids,
    references: p.references,
    composition_mode: p.composition_mode,
    status: "queued",
    created_at: created,
    confirm_deadline_at: hintDeadline,
    candidates: [],
    confirmed_index: null,
    error_code: null,
    error_message: null,
    provider_request_id: null,
    warnings: ["リクエストを受け付けました。候補が生成されると確認期限が更新されます。"],
  };

  const db = getDb();
  if (db) {
    await dbInsertAigcJob(db, { job, confirmDeadlineAt: new Date(hintDeadline) });
  } else {
    memoryJobs().set(job_id, job);
  }
  return job;
}

async function processAigcJobInternal(jobId: string): Promise<void> {
  if (inflight.has(jobId)) return;
  inflight.add(jobId);
  try {
    const db = getDb();
    let job = await loadJob(jobId);
    if (!job) return;
    if (
      job.status === "ready" ||
      job.status === "confirmed" ||
      job.status === "failed" ||
      job.status === "expired"
    ) {
      return;
    }
    if (job.status === "processing") return;

    let claimed = false;
    if (db) {
      claimed = await dbTryClaimQueuedJob(db, jobId);
    } else {
      const cur = memoryJobs().get(jobId);
      if (cur?.status === "queued") {
        memoryJobs().set(jobId, { ...cur, status: "processing" });
        claimed = true;
      }
    }
    if (!claimed) return;

    job = (await loadJob(jobId))!;
    const refUrls: string[] = [];
    for (const id of job.reference_asset_ids) {
      const url = await resolveReferenceAssetForGeneration(id);
      if (!url) {
        const failed: AigcGenerationJob = {
          ...job,
          status: "failed",
          error_code: "MISSING_REFERENCE",
          error_message: `reference asset not found or expired: ${id}`,
        };
        await persistJob(failed);
        return;
      }
      refUrls.push(url);
    }

    try {
      const provider = getAigcModelProvider();
      const result = await provider.generate({
        mode: job.mode,
        prompt: job.prompt,
        negative_prompt: job.negative_prompt,
        aspect_ratio: job.aspect_ratio,
        candidate_count: job.candidate_count,
        seed: job.seed,
        strength: job.strength,
        reference_data_urls: refUrls,
        references: job.references,
        composition_mode: job.composition_mode,
        job_id: job.job_id,
      });
      const confirmDeadline = new Date(Date.now() + AIGC_CONFIRM_WINDOW_MS).toISOString();
      const ready: AigcGenerationJob = {
        ...job,
        status: "ready",
        candidates: result.candidates,
        confirm_deadline_at: confirmDeadline,
        provider_request_id: result.provider_request_id,
        warnings: [...job.warnings, ...result.warnings],
      };
      await persistJob(ready);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "provider_error";
      const failed: AigcGenerationJob = {
        ...job,
        status: "failed",
        error_code: "PROVIDER_ERROR",
        error_message: msg,
      };
      await persistJob(failed);
    }
  } finally {
    inflight.delete(jobId);
  }
}

export async function getAigcJob(
  jobId: string,
  opts?: { runLazyProcessor?: boolean },
): Promise<AigcGenerationJob | undefined> {
  if (opts?.runLazyProcessor !== false) {
    await processAigcJobInternal(jobId);
  }
  return loadJob(jobId);
}

export async function confirmAigcGeneration(
  jobId: string,
  candidate_index: number,
): Promise<{ ok: true; job: AigcGenerationJob } | { ok: false; code: string; message: string }> {
  const job = await getAigcJob(jobId, { runLazyProcessor: true });
  if (!job) return { ok: false, code: "NOT_FOUND", message: "job not found" };
  if (job.status === "expired") return { ok: false, code: "EXPIRED", message: "confirm window elapsed" };
  if (job.status === "confirmed")
    return { ok: false, code: "ALREADY_CONFIRMED", message: "job already confirmed" };
  if (job.status !== "ready")
    return { ok: false, code: "INVALID_STATE", message: `cannot confirm in status ${job.status}` };
  if (!job.candidates.some((c) => c.index === candidate_index))
    return { ok: false, code: "INVALID_CANDIDATE", message: "candidate_index not found" };

  const updated: AigcGenerationJob = { ...job, status: "confirmed", confirmed_index: candidate_index };
  await persistJob(updated);
  return { ok: true, job: updated };
}

export async function runAigcWorkerBatch(limit: number): Promise<{ processed: number }> {
  const db = getDb();
  const ids = db
    ? await dbListQueuedJobIds(db, limit)
    : Array.from(memoryJobs().values())
        .filter((j) => j.status === "queued")
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, limit)
        .map((j) => j.job_id);
  let processed = 0;
  for (const id of ids) {
    await processAigcJobInternal(id);
    const j = await loadJob(id);
    if (j && (j.status === "ready" || j.status === "failed")) processed++;
  }
  return { processed };
}

export function __clearAigcJobsForTests(): void {
  memoryJobs().clear();
}

/** 兼容旧 tests / 脚本：等价于仅文生图且无参考图 */
export async function createGenerationJob(input: {
  product_id: string;
  prompt: string | null;
  reference_asset_count: number;
}): Promise<AigcGenerationJob> {
  return enqueueAigcGeneration({
    product_id: input.product_id,
    mode: "txt2img",
    prompt: input.prompt,
    negative_prompt: null,
    aspect_ratio: null,
    candidate_count: 2,
    seed: null,
    strength: null,
    reference_asset_ids: [],
    references: null,
    composition_mode: null,
  });
}

export async function getGenerationJob(jobId: string): Promise<AigcGenerationJob | undefined> {
  return getAigcJob(jobId, { runLazyProcessor: true });
}

export async function confirmGenerationJob(
  jobId: string,
  candidate_index: number,
): Promise<{ ok: true; job: AigcGenerationJob } | { ok: false; code: string; message: string }> {
  return confirmAigcGeneration(jobId, candidate_index);
}
