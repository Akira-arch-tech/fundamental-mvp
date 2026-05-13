/**
 * AIGC 生图任务 — MVP 内存存储（单 Node 进程内有效；Serverless 多实例不共享）。
 * 生产应换 Redis / Postgres + 队列 worker。
 */
import type { AigcCandidate, AigcGenerationJob } from "@/lib/aigc-types";

const CONFIRM_WINDOW_MS = 10 * 60 * 1000;

const g = globalThis as unknown as { __aigcJobMap?: Map<string, AigcGenerationJob> };

function jobMap(): Map<string, AigcGenerationJob> {
  if (!g.__aigcJobMap) g.__aigcJobMap = new Map();
  return g.__aigcJobMap;
}

function newJobId(): string {
  return `aigc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function placeholderCandidates(jobId: string): AigcCandidate[] {
  const seed = jobId.replace(/\W/g, "").slice(-8) || "demo";
  return [
    { index: 0, url: `https://picsum.photos/seed/${seed}a/512/512`, width: 512, height: 512 },
    { index: 1, url: `https://picsum.photos/seed/${seed}b/512/512`, width: 512, height: 512 },
  ];
}

function nowIso(): string {
  return new Date().toISOString();
}

function deadlineIso(): string {
  return new Date(Date.now() + CONFIRM_WINDOW_MS).toISOString();
}

/** 若超过确认截止时间且仍未确认，将 ready 置为 expired（惰性检查） */
function applyExpiry(job: AigcGenerationJob): AigcGenerationJob {
  if (job.status !== "ready") return job;
  if (Date.now() > new Date(job.confirm_deadline_at).getTime()) {
    const next: AigcGenerationJob = { ...job, status: "expired" };
    jobMap().set(job.job_id, next);
    return next;
  }
  return job;
}

export function createGenerationJob(input: {
  product_id: string;
  prompt: string | null;
  reference_asset_count: number;
}): AigcGenerationJob {
  const job_id = newJobId();
  const confirm_deadline_at = deadlineIso();

  // 骨架：直接进入 ready + 占位候选；真实链路为 queued → worker → ready
  const job: AigcGenerationJob = {
    job_id,
    product_id: input.product_id,
    prompt: input.prompt,
    reference_asset_count: input.reference_asset_count,
    status: "ready",
    created_at: nowIso(),
    confirm_deadline_at,
    candidates: placeholderCandidates(job_id),
    confirmed_index: null,
    error_code: null,
    error_message: null,
  };
  jobMap().set(job_id, job);
  return job;
}

export function getGenerationJob(jobId: string): AigcGenerationJob | undefined {
  const job = jobMap().get(jobId);
  if (!job) return undefined;
  return applyExpiry(job);
}

export function confirmGenerationJob(
  jobId: string,
  candidate_index: number,
): { ok: true; job: AigcGenerationJob } | { ok: false; code: string; message: string } {
  const job = getGenerationJob(jobId);
  if (!job) {
    return { ok: false, code: "NOT_FOUND", message: "job not found" };
  }
  if (job.status === "expired") {
    return { ok: false, code: "EXPIRED", message: "confirm window elapsed" };
  }
  if (job.status === "confirmed") {
    return { ok: false, code: "ALREADY_CONFIRMED", message: "job already confirmed" };
  }
  if (job.status !== "ready") {
    return { ok: false, code: "INVALID_STATE", message: `cannot confirm in status ${job.status}` };
  }
  const exists = job.candidates.some((c) => c.index === candidate_index);
  if (!exists) {
    return { ok: false, code: "INVALID_CANDIDATE", message: "candidate_index not found" };
  }

  const updated: AigcGenerationJob = {
    ...job,
    status: "confirmed",
    confirmed_index: candidate_index,
  };
  jobMap().set(jobId, updated);
  return { ok: true, job: updated };
}

/** 测试或管理用：清空内存任务 */
export function __clearAigcJobsForTests(): void {
  jobMap().clear();
}
