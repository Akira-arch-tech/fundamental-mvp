import { desc, eq, sql } from "drizzle-orm";
import type { DrizzleDb } from "@/lib/db/client";
import { generations } from "@/lib/db/schema";
import type { GenerationRecord } from "@/lib/image-generation/types";

const globalForGenerationsRepo = globalThis as unknown as {
  fdmGenerationTableEnsured?: Promise<void>;
};

async function ensureGenerationsTable(db: DrizzleDb): Promise<void> {
  if (!globalForGenerationsRepo.fdmGenerationTableEnsured) {
    globalForGenerationsRepo.fdmGenerationTableEnsured = (async () => {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS generations (
          generation_id text PRIMARY KEY,
          store_id text NOT NULL,
          product_id text,
          user_id text,
          mode text NOT NULL,
          prompt text NOT NULL,
          negative_prompt text,
          style_preset_id text,
          reference_asset_ids jsonb NOT NULL,
          provider text NOT NULL,
          model text NOT NULL,
          request_id text NOT NULL,
          provider_request_id text,
          status text NOT NULL,
          outputs jsonb NOT NULL,
          error_code text,
          message text,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        );
      `);
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS generations_created_idx ON generations(created_at);`,
      );
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS generations_store_created_idx ON generations(store_id, created_at);`,
      );
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS generations_request_id_idx ON generations(request_id);`,
      );
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS generations_status_idx ON generations(status);`,
      );
    })();
  }
  await globalForGenerationsRepo.fdmGenerationTableEnsured;
}

function rowToRecord(row: typeof generations.$inferSelect): GenerationRecord {
  return {
    generation_id: row.generationId,
    store_id: row.storeId,
    product_id: row.productId ?? null,
    user_id: row.userId ?? null,
    mode: row.mode as GenerationRecord["mode"],
    prompt: row.prompt,
    negative_prompt: row.negativePrompt ?? null,
    style_preset_id: row.stylePresetId ?? null,
    reference_asset_ids: Array.isArray(row.referenceAssetIds) ? row.referenceAssetIds : [],
    provider: row.provider as GenerationRecord["provider"],
    model: row.model,
    request_id: row.requestId,
    provider_request_id: row.providerRequestId ?? null,
    status: row.status as GenerationRecord["status"],
    outputs: Array.isArray(row.outputs) ? row.outputs : [],
    error_code: row.errorCode ?? null,
    message: row.message ?? null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export async function insertGenerationRecord(db: DrizzleDb, rec: GenerationRecord): Promise<void> {
  await ensureGenerationsTable(db);
  await db.insert(generations).values({
    generationId: rec.generation_id,
    storeId: rec.store_id,
    productId: rec.product_id ?? null,
    userId: rec.user_id ?? null,
    mode: rec.mode,
    prompt: rec.prompt,
    negativePrompt: rec.negative_prompt ?? null,
    stylePresetId: rec.style_preset_id ?? null,
    referenceAssetIds: rec.reference_asset_ids,
    provider: rec.provider,
    model: rec.model,
    requestId: rec.request_id,
    providerRequestId: rec.provider_request_id ?? null,
    status: rec.status,
    outputs: rec.outputs,
    errorCode: rec.error_code ?? null,
    message: rec.message ?? null,
    createdAt: new Date(rec.created_at),
    updatedAt: new Date(rec.updated_at),
  });
}

export async function updateGenerationRecord(
  db: DrizzleDb,
  generationId: string,
  patch: Partial<
    Pick<
      GenerationRecord,
      "status" | "outputs" | "error_code" | "message" | "provider_request_id" | "updated_at"
    >
  >,
): Promise<GenerationRecord | null> {
  await ensureGenerationsTable(db);
  const rows = await db
    .update(generations)
    .set({
      status: patch.status,
      outputs: patch.outputs,
      errorCode: patch.error_code,
      message: patch.message,
      providerRequestId: patch.provider_request_id,
      updatedAt: patch.updated_at ? new Date(patch.updated_at) : new Date(),
    })
    .where(eq(generations.generationId, generationId))
    .returning();
  return rows[0] ? rowToRecord(rows[0]) : null;
}

export async function selectGenerationById(
  db: DrizzleDb,
  generationId: string,
): Promise<GenerationRecord | null> {
  await ensureGenerationsTable(db);
  const [row] = await db
    .select()
    .from(generations)
    .where(eq(generations.generationId, generationId))
    .limit(1);
  return row ? rowToRecord(row) : null;
}

export async function listGenerationRecords(db: DrizzleDb, limit: number): Promise<GenerationRecord[]> {
  await ensureGenerationsTable(db);
  const rows = await db
    .select()
    .from(generations)
    .orderBy(desc(generations.createdAt))
    .limit(Math.min(Math.max(limit, 1), 100));
  return rows.map(rowToRecord);
}

