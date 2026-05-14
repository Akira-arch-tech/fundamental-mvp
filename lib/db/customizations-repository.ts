import { eq } from "drizzle-orm";
import { customizations } from "@/lib/db/schema";
import type { DrizzleDb } from "@/lib/db/client";
import type { CustomizationDesignStored, CustomizationRecord } from "@/lib/types";

function recordToRow(record: CustomizationRecord) {
  const designData: CustomizationDesignStored = {
    text_layers: record.text_layers,
    color_layers: record.color_layers,
    user_images: record.user_images,
    transform_matrix: record.transform_matrix,
    estimated_dpi: record.estimated_dpi,
  };
  const createdAt = new Date(record.created_at);
  const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
  return {
    customizationId: record.customization_id,
    productId: record.product_id,
    templateId: record.template_id,
    designData,
    dpiCheckResult: record.dpi_check_result,
    warnings: record.warnings,
    previewUrl: record.preview_url,
    status: "draft",
    createdAt,
    expiresAt,
  };
}

function rowToRecord(row: typeof customizations.$inferSelect): CustomizationRecord {
  const d = row.designData;
  return {
    customization_id: row.customizationId,
    product_id: row.productId,
    template_id: row.templateId,
    text_layers: d.text_layers,
    color_layers: d.color_layers,
    user_images: d.user_images,
    transform_matrix: d.transform_matrix,
    estimated_dpi: d.estimated_dpi,
    preview_url: row.previewUrl,
    dpi_check_result: row.dpiCheckResult,
    warnings: row.warnings,
    created_at: row.createdAt.toISOString(),
  };
}

export async function insertCustomization(db: DrizzleDb, record: CustomizationRecord): Promise<void> {
  await db.insert(customizations).values(recordToRow(record));
}

export async function selectCustomizationById(
  db: DrizzleDb,
  customizationId: string,
): Promise<CustomizationRecord | undefined> {
  const [row] = await db
    .select()
    .from(customizations)
    .where(eq(customizations.customizationId, customizationId))
    .limit(1);
  return row ? rowToRecord(row) : undefined;
}
