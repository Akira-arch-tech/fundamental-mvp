import { NextResponse } from "next/server";
import {
  getAiSceneVersions,
  listAiScenes,
  type AiSceneAction,
  type AiSceneAsset,
  type AiSceneLayer,
  type AiScenePublishTarget,
  type AiSceneRecord,
  type AiSceneStatus,
  upsertAiScene,
} from "@/lib/ai-scene-store";
import { newRequestId } from "@/lib/request-id";
import { getAuthedUser } from "@/lib/server-auth";

function parseLimit(v: string | null, fallback: number, max: number): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), max);
}

function isSafeEdge(v: unknown): v is { top: number; right: number; bottom: number; left: number } {
  if (!v || typeof v !== "object") return false;
  const row = v as Record<string, unknown>;
  return (
    typeof row.top === "number" &&
    typeof row.right === "number" &&
    typeof row.bottom === "number" &&
    typeof row.left === "number"
  );
}

function isValidScenePayload(scene: unknown): scene is Omit<AiSceneRecord, "version" | "audit"> {
  if (!scene || typeof scene !== "object") return false;
  const row = scene as Record<string, unknown>;
  if (
    typeof row.scene_id !== "string" ||
    typeof row.store_id !== "string" ||
    typeof row.product_id !== "string" ||
    typeof row.status !== "string"
  ) {
    return false;
  }
  const status = row.status as AiSceneStatus;
  if (!["draft", "review_pending", "published"].includes(status)) return false;
  if (!row.canvas || typeof row.canvas !== "object") return false;
  const canvas = row.canvas as Record<string, unknown>;
  if (
    typeof canvas.width !== "number" ||
    typeof canvas.height !== "number" ||
    !isSafeEdge(canvas.safe_area) ||
    !isSafeEdge(canvas.bleed)
  ) {
    return false;
  }
  if (!Array.isArray(row.layers) || !Array.isArray(row.assets) || !Array.isArray(row.ai_actions) || !Array.isArray(row.publish_targets)) {
    return false;
  }
  return true;
}

export async function GET(req: Request) {
  const requestId = newRequestId();
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "login required", requestId },
      { status: 401, headers: { "X-Request-Id": requestId } },
    );
  }

  const url = new URL(req.url);
  const sceneId = url.searchParams.get("scene_id")?.trim();
  if (sceneId) {
    const versions = await getAiSceneVersions(sceneId, parseLimit(url.searchParams.get("limit"), 10, 50));
    return NextResponse.json({ scene_id: sceneId, versions, requestId }, { headers: { "X-Request-Id": requestId } });
  }
  const items = await listAiScenes(parseLimit(url.searchParams.get("limit"), 20, 100));
  return NextResponse.json({ items, requestId }, { headers: { "X-Request-Id": requestId } });
}

export async function POST(req: Request) {
  const requestId = newRequestId();
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "login required", requestId },
      { status: 401, headers: { "X-Request-Id": requestId } },
    );
  }

  let body: { scene?: unknown };
  try {
    body = (await req.json()) as { scene?: unknown };
  } catch {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: "invalid json body", requestId },
      { status: 400, headers: { "X-Request-Id": requestId } },
    );
  }
  if (!isValidScenePayload(body.scene)) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "invalid scene payload", requestId },
      { status: 422, headers: { "X-Request-Id": requestId } },
    );
  }

  const scene = body.scene;
  const saved = await upsertAiScene({
    scene_id: scene.scene_id.trim(),
    store_id: scene.store_id.trim(),
    product_id: scene.product_id.trim(),
    status: scene.status,
    canvas: scene.canvas,
    layers: scene.layers as AiSceneLayer[],
    assets: scene.assets as AiSceneAsset[],
    ai_actions: scene.ai_actions as AiSceneAction[],
    publish_targets: scene.publish_targets as AiScenePublishTarget[],
    actor: user.user_id,
  });
  return NextResponse.json({ item: saved, requestId }, { headers: { "X-Request-Id": requestId } });
}
