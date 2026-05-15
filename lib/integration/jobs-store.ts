import fs from "node:fs/promises";
import path from "node:path";
import { and, asc, count, desc, eq, inArray, isNull, lt, lte, or } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { integrationJobs } from "@/lib/db/schema";
import { recordIntegrationAlert } from "@/lib/integration/alerts-store";
import type {
  IntegrationJobRecord,
  IntegrationJobStatus,
  IntegrationTarget,
} from "@/lib/integration/types";
import { MAX_JOB_RETRIES, RETRY_BACKOFF_MINUTES } from "@/lib/integration/types";

const FILE_PATH = process.env.VERCEL ? "/tmp/.integration-jobs.json" : path.join(process.cwd(), ".integration-jobs.json");

type JobsFileShape = {
  jobs: Record<string, IntegrationJobRecord>;
  idempotency: Record<string, string>;
};

async function readFileStore(): Promise<JobsFileShape> {
  try {
    const raw = await fs.readFile(FILE_PATH, "utf-8");
    return JSON.parse(raw) as JobsFileShape;
  } catch {
    return { jobs: {}, idempotency: {} };
  }
}

async function writeFileStore(data: JobsFileShape) {
  await fs.writeFile(FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

function newJobId(): string {
  return `job_${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}`;
}

function rowToJob(row: typeof integrationJobs.$inferSelect): IntegrationJobRecord {
  return {
    id: row.id,
    target_system: row.targetSystem as IntegrationTarget,
    event_type: row.eventType,
    payload: row.payload,
    idempotency_key: row.idempotencyKey,
    status: row.status as IntegrationJobStatus,
    retry_count: row.retryCount,
    next_retry_at: row.nextRetryAt ? row.nextRetryAt.toISOString() : null,
    last_error: row.lastError,
    request_id: row.requestId ?? "",
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export async function enqueueIntegrationJob(input: {
  target_system: IntegrationTarget;
  event_type: string;
  payload: unknown;
  idempotency_key: string;
  request_id: string;
}): Promise<{ job: IntegrationJobRecord; created: boolean }> {
  const db = getDb();
  const now = new Date().toISOString();

  if (db) {
    const existing = await db
      .select()
      .from(integrationJobs)
      .where(eq(integrationJobs.idempotencyKey, input.idempotency_key))
      .limit(1);
    if (existing[0]) {
      return { job: rowToJob(existing[0]), created: false };
    }
    const id = newJobId();
    await db.insert(integrationJobs).values({
      id,
      targetSystem: input.target_system,
      eventType: input.event_type,
      payload: input.payload as object,
      idempotencyKey: input.idempotency_key,
      status: "pending",
      retryCount: 0,
      nextRetryAt: null,
      lastError: null,
      requestId: input.request_id,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    });
    const [row] = await db.select().from(integrationJobs).where(eq(integrationJobs.id, id)).limit(1);
    return { job: rowToJob(row!), created: true };
  }

  const store = await readFileStore();
  const existingId = store.idempotency[input.idempotency_key];
  if (existingId && store.jobs[existingId]) {
    return { job: store.jobs[existingId], created: false };
  }
  const id = newJobId();
  const job: IntegrationJobRecord = {
    id,
    target_system: input.target_system,
    event_type: input.event_type,
    payload: input.payload,
    idempotency_key: input.idempotency_key,
    status: "pending",
    retry_count: 0,
    next_retry_at: null,
    last_error: null,
    request_id: input.request_id,
    created_at: now,
    updated_at: now,
  };
  store.jobs[id] = job;
  store.idempotency[input.idempotency_key] = id;
  await writeFileStore(store);
  return { job, created: true };
}

export async function listIntegrationJobs(params: {
  page: number;
  pageSize: number;
  status?: IntegrationJobStatus;
}): Promise<{ items: IntegrationJobRecord[]; total: number }> {
  const offset = (params.page - 1) * params.pageSize;
  const db = getDb();
  if (db) {
    const where = params.status ? eq(integrationJobs.status, params.status) : undefined;
    const rows = await db
      .select()
      .from(integrationJobs)
      .where(where)
      .orderBy(desc(integrationJobs.createdAt))
      .limit(params.pageSize)
      .offset(offset);
    const [cnt] = await db.select({ n: count() }).from(integrationJobs).where(where);
    return { items: rows.map(rowToJob), total: cnt?.n ?? 0 };
  }
  const store = await readFileStore();
  let items = Object.values(store.jobs).sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (params.status) items = items.filter((j) => j.status === params.status);
  const total = items.length;
  return { items: items.slice(offset, offset + params.pageSize), total };
}

/** 按下单等写操作传入的 request_id 回溯集成任务（PRD / 执行清单：链路可追踪） */
export async function listIntegrationJobsByRequestId(
  requestId: string,
): Promise<IntegrationJobRecord[]> {
  const db = getDb();
  if (db) {
    const rows = await db
      .select()
      .from(integrationJobs)
      .where(eq(integrationJobs.requestId, requestId))
      .orderBy(asc(integrationJobs.createdAt));
    return rows.map(rowToJob);
  }
  const store = await readFileStore();
  return Object.values(store.jobs)
    .filter((j) => j.request_id === requestId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function getIntegrationJobById(id: string): Promise<IntegrationJobRecord | null> {
  const db = getDb();
  if (db) {
    const [row] = await db.select().from(integrationJobs).where(eq(integrationJobs.id, id)).limit(1);
    return row ? rowToJob(row) : null;
  }
  const store = await readFileStore();
  return store.jobs[id] ?? null;
}

export async function pickDueJobs(limit: number): Promise<IntegrationJobRecord[]> {
  const now = new Date();
  const db = getDb();
  if (db) {
    const rows = await db
      .select()
      .from(integrationJobs)
      .where(
        or(
          eq(integrationJobs.status, "pending"),
          and(
            eq(integrationJobs.status, "failed"),
            lt(integrationJobs.retryCount, MAX_JOB_RETRIES),
            or(isNull(integrationJobs.nextRetryAt), lte(integrationJobs.nextRetryAt, now)),
          ),
        ),
      )
      .orderBy(asc(integrationJobs.createdAt))
      .limit(limit);
    return rows.map(rowToJob);
  }
  const store = await readFileStore();
  const due = Object.values(store.jobs).filter((j) => {
    if (j.status === "pending") return true;
    if (j.status === "failed" && j.retry_count < MAX_JOB_RETRIES) {
      if (!j.next_retry_at) return true;
      return new Date(j.next_retry_at) <= now;
    }
    return false;
  });
  due.sort((a, b) => a.created_at.localeCompare(b.created_at));
  return due.slice(0, limit);
}

export async function markJobProcessing(id: string): Promise<void> {
  const now = new Date();
  const db = getDb();
  if (db) {
    await db
      .update(integrationJobs)
      .set({ status: "processing", updatedAt: now })
      .where(eq(integrationJobs.id, id));
    return;
  }
  const store = await readFileStore();
  const j = store.jobs[id];
  if (j) {
    j.status = "processing";
    j.updated_at = now.toISOString();
    await writeFileStore(store);
  }
}

export async function markJobSuccess(id: string): Promise<void> {
  const now = new Date();
  const db = getDb();
  if (db) {
    await db
      .update(integrationJobs)
      .set({
        status: "success",
        lastError: null,
        nextRetryAt: null,
        updatedAt: now,
      })
      .where(eq(integrationJobs.id, id));
    return;
  }
  const store = await readFileStore();
  const j = store.jobs[id];
  if (j) {
    j.status = "success";
    j.last_error = null;
    j.next_retry_at = null;
    j.updated_at = now.toISOString();
    await writeFileStore(store);
  }
}

export async function markJobFailed(id: string, err: string): Promise<void> {
  const now = new Date();
  const db = getDb();
  if (db) {
    const [cur] = await db.select().from(integrationJobs).where(eq(integrationJobs.id, id)).limit(1);
    if (!cur) return;
    const nextRetry = cur.retryCount + 1;
    if (nextRetry >= MAX_JOB_RETRIES) {
      await db
        .update(integrationJobs)
        .set({
          status: "dead_letter",
          retryCount: nextRetry,
          lastError: err,
          nextRetryAt: null,
          updatedAt: now,
        })
        .where(eq(integrationJobs.id, id));
      await recordIntegrationAlert({
        level: "error",
        code: "INTEGRATION_DEAD_LETTER",
        message: `Job ${id} (${cur.eventType}) moved to dead_letter: ${err}`,
        requestId: cur.requestId,
        meta: { job_id: id, target: cur.targetSystem },
      });
      return;
    }
    const idx = Math.min(nextRetry - 1, RETRY_BACKOFF_MINUTES.length - 1);
    const nextAt = new Date(Date.now() + RETRY_BACKOFF_MINUTES[idx] * 60 * 1000);
    await db
      .update(integrationJobs)
      .set({
        status: "failed",
        retryCount: nextRetry,
        lastError: err,
        nextRetryAt: nextAt,
        updatedAt: now,
      })
      .where(eq(integrationJobs.id, id));
    return;
  }
  const store = await readFileStore();
  const j = store.jobs[id];
  if (!j) return;
  const nextRetry = j.retry_count + 1;
  if (nextRetry >= MAX_JOB_RETRIES) {
    j.status = "dead_letter";
    j.retry_count = nextRetry;
    j.last_error = err;
    j.next_retry_at = null;
    j.updated_at = now.toISOString();
    await writeFileStore(store);
    await recordIntegrationAlert({
      level: "error",
      code: "INTEGRATION_DEAD_LETTER",
      message: `Job ${id} (${j.event_type}) moved to dead_letter: ${err}`,
      requestId: j.request_id,
      meta: { job_id: id, target: j.target_system },
    });
    return;
  }
  const idx = Math.min(nextRetry - 1, RETRY_BACKOFF_MINUTES.length - 1);
  j.status = "failed";
  j.retry_count = nextRetry;
  j.last_error = err;
  j.next_retry_at = new Date(Date.now() + RETRY_BACKOFF_MINUTES[idx] * 60 * 1000).toISOString();
  j.updated_at = now.toISOString();
  await writeFileStore(store);
}

/** 人工重放：将 dead_letter / failed 重置为 pending（admin） */
export async function resetJobForManualRetry(id: string): Promise<IntegrationJobRecord | null> {
  const now = new Date();
  const db = getDb();
  if (db) {
    const rows = await db
      .update(integrationJobs)
      .set({
        status: "pending",
        retryCount: 0,
        nextRetryAt: null,
        lastError: null,
        updatedAt: now,
      })
      .where(
        and(eq(integrationJobs.id, id), inArray(integrationJobs.status, ["failed", "dead_letter"])),
      )
      .returning();
    return rows[0] ? rowToJob(rows[0]) : null;
  }
  const store = await readFileStore();
  const j = store.jobs[id];
  if (!j || (j.status !== "failed" && j.status !== "dead_letter")) return null;
  j.status = "pending";
  j.retry_count = 0;
  j.next_retry_at = null;
  j.last_error = null;
  j.updated_at = now.toISOString();
  await writeFileStore(store);
  return j;
}
