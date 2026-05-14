import { and, desc, eq, lt } from "drizzle-orm";
import type { DrizzleDb } from "@/lib/db/client";
import { aigcGenerationJobs } from "@/lib/db/schema";
import type {
  AigcCandidate,
  AigcGenerationJob,
  AigcGenerationMode,
} from "@/lib/aigc-types";

type Row = typeof aigcGenerationJobs.$inferSelect;

function rowToJob(r: Row): AigcGenerationJob {
  const ids = r.referenceAssetIds ?? [];
  return {
    job_id: r.jobId,
    product_id: r.productId,
    mode: (r.mode as AigcGenerationMode) ?? "txt2img",
    prompt: r.prompt,
    negative_prompt: r.negativePrompt,
    aspect_ratio: r.aspectRatio,
    candidate_count: r.candidateCount ?? 2,
    seed: r.seed,
    strength: r.strength != null ? Number(r.strength) : null,
    reference_asset_count: ids.length,
    reference_asset_ids: ids,
    references: r.referencesPayload ?? null,
    composition_mode: (r.compositionMode as AigcGenerationJob["composition_mode"]) ?? null,
    status: r.status as AigcGenerationJob["status"],
    created_at: r.createdAt.toISOString(),
    confirm_deadline_at: r.confirmDeadlineAt.toISOString(),
    candidates: (r.candidates as AigcCandidate[]) ?? [],
    confirmed_index: r.confirmedIndex,
    error_code: r.errorCode,
    error_message: r.errorMessage,
    provider_request_id: r.providerRequestId,
    warnings: (r.warnings as string[]) ?? [],
  };
}

export async function dbInsertAigcJob(
  db: DrizzleDb,
  input: {
    job: AigcGenerationJob;
    confirmDeadlineAt: Date;
  },
) {
  const j = input.job;
  await db.insert(aigcGenerationJobs).values({
    jobId: j.job_id,
    productId: j.product_id,
    mode: j.mode,
    prompt: j.prompt,
    negativePrompt: j.negative_prompt,
    aspectRatio: j.aspect_ratio,
    candidateCount: j.candidate_count,
    seed: j.seed,
    strength: j.strength != null ? String(j.strength) : null,
    referenceAssetIds: j.reference_asset_ids,
    referencesPayload: j.references,
    compositionMode: j.composition_mode,
    status: j.status,
    candidates: j.candidates,
    confirmDeadlineAt: input.confirmDeadlineAt,
    confirmedIndex: j.confirmed_index,
    errorCode: j.error_code,
    errorMessage: j.error_message,
    providerRequestId: j.provider_request_id,
    warnings: j.warnings,
  });
}

export async function dbGetAigcJob(db: DrizzleDb, jobId: string): Promise<AigcGenerationJob | undefined> {
  const rows = await db.select().from(aigcGenerationJobs).where(eq(aigcGenerationJobs.jobId, jobId)).limit(1);
  const r = rows[0];
  return r ? rowToJob(r) : undefined;
}

export async function dbUpdateAigcJob(
  db: DrizzleDb,
  jobId: string,
  patch: Partial<{
    status: string;
    candidates: AigcCandidate[];
    confirmDeadlineAt: Date;
    confirmedIndex: number | null;
    errorCode: string | null;
    errorMessage: string | null;
    providerRequestId: string | null;
    warnings: string[];
  }>,
) {
  await db
    .update(aigcGenerationJobs)
    .set({
      ...(patch.status != null ? { status: patch.status } : {}),
      ...(patch.candidates != null ? { candidates: patch.candidates } : {}),
      ...(patch.confirmDeadlineAt != null ? { confirmDeadlineAt: patch.confirmDeadlineAt } : {}),
      ...(patch.confirmedIndex !== undefined ? { confirmedIndex: patch.confirmedIndex } : {}),
      ...(patch.errorCode !== undefined ? { errorCode: patch.errorCode } : {}),
      ...(patch.errorMessage !== undefined ? { errorMessage: patch.errorMessage } : {}),
      ...(patch.providerRequestId !== undefined ? { providerRequestId: patch.providerRequestId } : {}),
      ...(patch.warnings != null ? { warnings: patch.warnings } : {}),
      updatedAt: new Date(),
    })
    .where(eq(aigcGenerationJobs.jobId, jobId));
}

export async function dbTryClaimQueuedJob(db: DrizzleDb, jobId: string): Promise<boolean> {
  const res = await db
    .update(aigcGenerationJobs)
    .set({ status: "processing", updatedAt: new Date() })
    .where(and(eq(aigcGenerationJobs.jobId, jobId), eq(aigcGenerationJobs.status, "queued")))
    .returning({ jobId: aigcGenerationJobs.jobId });
  return res.length > 0;
}

export async function dbListQueuedJobIds(db: DrizzleDb, limit: number): Promise<string[]> {
  const rows = await db
    .select({ jobId: aigcGenerationJobs.jobId })
    .from(aigcGenerationJobs)
    .where(eq(aigcGenerationJobs.status, "queued"))
    .orderBy(desc(aigcGenerationJobs.createdAt))
    .limit(limit);
  return rows.map((r) => r.jobId);
}

export async function dbListStaleProcessingIds(db: DrizzleDb, olderThanMs: number, limit: number): Promise<string[]> {
  const cutoff = new Date(Date.now() - olderThanMs);
  const rows = await db
    .select({ jobId: aigcGenerationJobs.jobId })
    .from(aigcGenerationJobs)
    .where(and(eq(aigcGenerationJobs.status, "processing"), lt(aigcGenerationJobs.updatedAt, cutoff)))
    .limit(limit);
  return rows.map((r) => r.jobId);
}
