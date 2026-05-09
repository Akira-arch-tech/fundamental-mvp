import fs from "node:fs/promises";
import path from "node:path";

const FILE = path.join(process.cwd(), ".fdm-product-ai-cover.json");

type FileShape = {
  covers: Record<string, { cover_url: string; updated_at: string }>;
};

async function readCovers(): Promise<FileShape["covers"]> {
  try {
    const raw = await fs.readFile(FILE, "utf-8");
    const data = JSON.parse(raw) as FileShape;
    return data.covers && typeof data.covers === "object" ? data.covers : {};
  } catch {
    return {};
  }
}

/** product_id → 前台列表/详情用作 cover 的 URL（演示用本地文件覆盖） */
export async function getProductAiCoverMap(): Promise<Record<string, string>> {
  const covers = await readCovers();
  const out: Record<string, string> = {};
  for (const [productId, row] of Object.entries(covers)) {
    const u = row?.cover_url?.trim();
    if (u) out[productId] = u;
  }
  return out;
}

export async function setProductAiCover(productId: string, coverUrl: string): Promise<void> {
  const url = coverUrl.trim();
  if (!url.startsWith("https://") && !url.startsWith("http://")) {
    throw new Error("INVALID_COVER_URL");
  }
  const covers = await readCovers();
  covers[productId] = { cover_url: url, updated_at: new Date().toISOString() };
  const payload: FileShape = { covers };
  await fs.writeFile(FILE, JSON.stringify(payload, null, 2), "utf-8");
}
