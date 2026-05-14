/**
 * 参考图临时存储：无 BLOB_READ_WRITE_TOKEN 时为进程内 Map；
 * 有 Token 时写入 Vercel Blob（公开 URL），多实例间通过 URL 共享像素数据。
 */
import { randomBytes } from "node:crypto";

const TTL_MS = 60 * 60 * 1000;
const MAX_BYTES = 4 * 1024 * 1024;

type AssetRow =
  | { kind: "memory"; mime: string; base64: string; created_at: number }
  | { kind: "blob"; mime: string; url: string; created_at: number };

const g = globalThis as unknown as {
  __aigcRefAssets?: Map<string, AssetRow>;
};

function map(): Map<string, AssetRow> {
  if (!g.__aigcRefAssets) g.__aigcRefAssets = new Map();
  return g.__aigcRefAssets;
}

function newAssetId(): string {
  return `ref_${Date.now().toString(36)}_${randomBytes(4).toString("hex")}`;
}

function extFromMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes("jpeg") || m.includes("jpg")) return ".jpg";
  if (m.includes("png")) return ".png";
  if (m.includes("webp")) return ".webp";
  if (m.includes("gif")) return ".gif";
  return ".bin";
}

export async function registerReferenceAsset(input: {
  buffer: Buffer;
  mime: string;
}): Promise<{ asset_id: string; expires_at: string }> {
  if (input.buffer.byteLength > MAX_BYTES) {
    throw new Error(`reference asset exceeds ${MAX_BYTES} bytes`);
  }
  const asset_id = newAssetId();
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();

  if (token) {
    const { put } = await import("@vercel/blob");
    const pathname = `aigc-ref/${asset_id}${extFromMime(input.mime)}`;
    const blob = await put(pathname, input.buffer, {
      access: "public",
      token,
      contentType: input.mime || "application/octet-stream",
    });
    map().set(asset_id, {
      kind: "blob",
      mime: input.mime,
      url: blob.url,
      created_at: Date.now(),
    });
  } else {
    map().set(asset_id, {
      kind: "memory",
      mime: input.mime,
      base64: input.buffer.toString("base64"),
      created_at: Date.now(),
    });
  }

  return { asset_id, expires_at: new Date(Date.now() + TTL_MS).toISOString() };
}

/** 仅内存行返回 data URL；Blob 行返回 null（请用 resolveReferenceAssetForGeneration）。 */
export function getReferenceAssetDataUrl(asset_id: string): string | null {
  prune();
  const row = map().get(asset_id);
  if (!row || row.kind !== "memory") return null;
  return `data:${row.mime};base64,${row.base64}`;
}

/** 供 worker / provider：返回 data URL 或 Blob 公开 HTTPS URL。 */
export async function resolveReferenceAssetForGeneration(asset_id: string): Promise<string | null> {
  prune();
  const row = map().get(asset_id);
  if (!row) return null;
  if (row.kind === "blob") return row.url;
  return `data:${row.mime};base64,${row.base64}`;
}

function prune() {
  const now = Date.now();
  for (const [k, v] of map()) {
    if (now - v.created_at > TTL_MS) map().delete(k);
  }
}

export function __clearReferenceAssetsForTests(): void {
  map().clear();
}
