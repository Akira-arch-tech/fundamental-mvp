import fs from "node:fs/promises";
import path from "node:path";

export interface AiArtifactRecord {
  id: string;
  task_id: string | null;
  asset_url: string | null;
  note: string | null;
  /** 若登记时填写了订单引用，写入对应 order_id */
  linked_order_id?: string | null;
  /** 若登记时关联商品并写入了封面，对应 product_id（如 p1） */
  linked_product_id?: string | null;
  /** 前台商详路径用，与 linked_product_id 同时写入 */
  linked_product_slug?: string | null;
  created_at: string;
}

const FILE = path.join(process.cwd(), ".fdm-ai-artifacts.json");

type FileShape = { items: AiArtifactRecord[] };

async function readAll(): Promise<AiArtifactRecord[]> {
  try {
    const raw = await fs.readFile(FILE, "utf-8");
    const data = JSON.parse(raw) as FileShape;
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}

async function writeAll(items: AiArtifactRecord[]) {
  const payload: FileShape = { items };
  await fs.writeFile(FILE, JSON.stringify(payload, null, 2), "utf-8");
}

function newId(): string {
  return `aia_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function appendAiArtifact(input: {
  task_id?: string | null;
  asset_url?: string | null;
  note?: string | null;
  linked_order_id?: string | null;
  linked_product_id?: string | null;
  linked_product_slug?: string | null;
}): Promise<AiArtifactRecord> {
  const task_id = input.task_id?.trim() || null;
  const asset_url = input.asset_url?.trim() || null;
  const note = input.note?.trim() || null;
  const linked_order_id = input.linked_order_id?.trim() || null;
  const linked_product_id = input.linked_product_id?.trim() || null;
  const linked_product_slug = input.linked_product_slug?.trim() || null;
  const rec: AiArtifactRecord = {
    id: newId(),
    task_id,
    asset_url,
    note,
    linked_order_id,
    linked_product_id,
    linked_product_slug,
    created_at: new Date().toISOString(),
  };
  const items = await readAll();
  items.unshift(rec);
  await writeAll(items.slice(0, 200));
  return rec;
}

export async function listAiArtifacts(limit: number): Promise<AiArtifactRecord[]> {
  const items = await readAll();
  return items.slice(0, Math.min(Math.max(limit, 1), 100));
}
