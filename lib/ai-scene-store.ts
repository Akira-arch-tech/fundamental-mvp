import fs from "node:fs/promises";
import path from "node:path";

export type AiSceneStatus = "draft" | "review_pending" | "published";
export type AiLayerType = "text" | "image" | "shape";
export type AiAssetSource = "upload" | "ai" | "external";
export type AiActionType = "rewrite_copy" | "generate_cover" | "apply_template";
export type AiPublishTargetType = "product_cover" | "order_note" | "work_order";

export interface AiSceneLayer {
  id: string;
  type: AiLayerType;
  z_index: number;
  transform: { x: number; y: number; scale: number; rotate: number };
  style: Record<string, string | number | boolean>;
  text?: string;
  asset_id?: string;
}

export interface AiSceneAsset {
  asset_id: string;
  source: AiAssetSource;
  url: string;
  license: string | null;
}

export interface AiSceneAction {
  action_type: AiActionType;
  prompt_ref: string;
  provider: string;
  request_id: string;
  result_ref: string | null;
}

export interface AiScenePublishTarget {
  target_type: AiPublishTargetType;
  target_id: string;
}

export interface AiSceneRecord {
  scene_id: string;
  version: number;
  store_id: string;
  product_id: string;
  status: AiSceneStatus;
  canvas: {
    width: number;
    height: number;
    safe_area: { top: number; right: number; bottom: number; left: number };
    bleed: { top: number; right: number; bottom: number; left: number };
  };
  layers: AiSceneLayer[];
  assets: AiSceneAsset[];
  ai_actions: AiSceneAction[];
  publish_targets: AiScenePublishTarget[];
  audit: {
    created_by: string;
    updated_by: string;
    created_at: string;
    updated_at: string;
  };
}

type FileShape = {
  latest_by_scene: Record<string, AiSceneRecord>;
  versions: AiSceneRecord[];
};

const FILE = process.env.VERCEL ? "/tmp/.fdm-ai-scenes.json" : path.join(process.cwd(), ".fdm-ai-scenes.json");

async function readStore(): Promise<FileShape> {
  try {
    const raw = await fs.readFile(FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<FileShape>;
    return {
      latest_by_scene:
        parsed.latest_by_scene && typeof parsed.latest_by_scene === "object"
          ? (parsed.latest_by_scene as Record<string, AiSceneRecord>)
          : {},
      versions: Array.isArray(parsed.versions) ? (parsed.versions as AiSceneRecord[]) : [],
    };
  } catch {
    return { latest_by_scene: {}, versions: [] };
  }
}

async function writeStore(next: FileShape): Promise<void> {
  await fs.writeFile(FILE, JSON.stringify(next, null, 2), "utf-8");
}

export async function listAiScenes(limit: number): Promise<AiSceneRecord[]> {
  const store = await readStore();
  const items = Object.values(store.latest_by_scene).sort((a, b) =>
    a.audit.updated_at < b.audit.updated_at ? 1 : -1,
  );
  return items.slice(0, Math.min(Math.max(limit, 1), 100));
}

export async function getAiSceneVersions(sceneId: string, limit: number): Promise<AiSceneRecord[]> {
  const store = await readStore();
  const items = store.versions
    .filter((v) => v.scene_id === sceneId)
    .sort((a, b) => b.version - a.version)
    .slice(0, Math.min(Math.max(limit, 1), 50));
  return items;
}

export async function upsertAiScene(input: {
  scene_id: string;
  store_id: string;
  product_id: string;
  status: AiSceneStatus;
  canvas: AiSceneRecord["canvas"];
  layers: AiSceneLayer[];
  assets: AiSceneAsset[];
  ai_actions: AiSceneAction[];
  publish_targets: AiScenePublishTarget[];
  actor: string;
}): Promise<AiSceneRecord> {
  const store = await readStore();
  const now = new Date().toISOString();
  const prev = store.latest_by_scene[input.scene_id];
  const version = prev ? prev.version + 1 : 1;
  const rec: AiSceneRecord = {
    scene_id: input.scene_id,
    version,
    store_id: input.store_id,
    product_id: input.product_id,
    status: input.status,
    canvas: input.canvas,
    layers: input.layers,
    assets: input.assets,
    ai_actions: input.ai_actions,
    publish_targets: input.publish_targets,
    audit: {
      created_by: prev?.audit.created_by ?? input.actor,
      updated_by: input.actor,
      created_at: prev?.audit.created_at ?? now,
      updated_at: now,
    },
  };

  store.latest_by_scene[input.scene_id] = rec;
  store.versions.unshift(rec);
  store.versions = store.versions.slice(0, 1000);
  await writeStore(store);
  return rec;
}
