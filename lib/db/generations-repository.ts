import { desc, eq } from "drizzle-orm";
import type { DrizzleDb } from "@/lib/db/client";
import { generations } from "@/lib/db/schema";
import type { GenerationRecord } from "@/lib/image-generation/types";

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
  const [row] = await db
    .select()
    .from(generations)
    .where(eq(generations.generationId, generationId))
    .limit(1);
  return row ? rowToRecord(row) : null;
}

export async function listGenerationRecords(db: DrizzleDb, limit: number): Promise<GenerationRecord[]> {
  const rows = await db
    .select()
    .from(generations)
    .orderBy(desc(generations.createdAt))
    .limit(Math.min(Math.max(limit, 1), 100));
  return rows.map(rowToRecord);
}

