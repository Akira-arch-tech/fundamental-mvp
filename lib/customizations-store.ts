import fs from "node:fs/promises";
import path from "node:path";
import type {
  CustomizationCreateInput,
  CustomizationRecord,
  DpiCheckResult,
} from "@/lib/types";

const STORE_PATH = path.join(process.cwd(), ".customizations-store.json");

function newCustomizationId(): string {
  const hex = () => Math.random().toString(16).slice(2, 10);
  return `cus_${hex()}${hex()}`;
}

function buildDpiResult(estimatedDpi?: number): DpiCheckResult {
  const min = 200;
  const value = Number.isFinite(estimatedDpi) ? Number(estimatedDpi) : 180;
  if (value >= min) {
    return {
      status: "ok",
      estimated_dpi: value,
      min_recommended_dpi: min,
      message: "印刷推奨解像度です。",
    };
  }
  return {
    status: "warning",
    estimated_dpi: value,
    min_recommended_dpi: min,
    message: "解像度が低い可能性があります。画像サイズの見直しを推奨します。",
  };
}

export function createCustomization(input: CustomizationCreateInput): CustomizationRecord {
  const customization_id = newCustomizationId();
  const dpi_check_result = buildDpiResult(input.estimated_dpi);
  const warnings =
    dpi_check_result.status === "warning"
      ? [dpi_check_result.message, "プレビュー上問題なくても印刷時に粗くなる可能性があります。"]
      : [];

  const record: CustomizationRecord = {
    ...input,
    customization_id,
    preview_url: `/api/customizations/${customization_id}/preview`,
    dpi_check_result,
    warnings,
    created_at: new Date().toISOString(),
  };
  return record;
}

async function readStore(): Promise<Record<string, CustomizationRecord>> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf-8");
    return JSON.parse(raw) as Record<string, CustomizationRecord>;
  } catch {
    return {};
  }
}

async function writeStore(data: Record<string, CustomizationRecord>) {
  await fs.writeFile(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export async function saveCustomization(input: CustomizationCreateInput) {
  const record = createCustomization(input);
  const store = await readStore();
  store[record.customization_id] = record;
  await writeStore(store);
  return record;
}

export async function getCustomization(customizationId: string) {
  const store = await readStore();
  return store[customizationId];
}
