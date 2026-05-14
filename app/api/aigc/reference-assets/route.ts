import { NextResponse } from "next/server";
import { AIGC_MAX_REFERENCE_ASSET_COUNT } from "@/lib/aigc-shared-constants";
import { registerReferenceAsset } from "@/lib/aigc-reference-asset-store";
import { newRequestId } from "@/lib/request-id";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** multipart：字段名 `files`，多文件；返回 asset_id 供 POST /api/aigc/generations 使用 */
export async function POST(req: Request) {
  const requestId = newRequestId();
  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("multipart/form-data")) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "Content-Type must be multipart/form-data", requestId },
      { status: 422, headers: { "X-Request-Id": requestId } },
    );
  }

  try {
    const form = await req.formData();
    const raw = form.getAll("files");
    const files: File[] = [];
    for (const entry of raw) {
      if (entry instanceof File && entry.size > 0) files.push(entry);
    }
    if (files.length === 0) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "at least one file under field name files", requestId },
        { status: 422, headers: { "X-Request-Id": requestId } },
      );
    }
    const slice = files.slice(0, AIGC_MAX_REFERENCE_ASSET_COUNT);
    const assets: { asset_id: string; expires_at: string; name: string }[] = [];
    for (const f of slice) {
      const buf = Buffer.from(await f.arrayBuffer());
      const mime = f.type || "application/octet-stream";
      const { asset_id, expires_at } = await registerReferenceAsset({ buffer: buf, mime });
      assets.push({ asset_id, expires_at, name: f.name });
    }
    return NextResponse.json({ assets, requestId }, { headers: { "X-Request-Id": requestId } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "upload failed";
    return NextResponse.json(
      { code: "BAD_REQUEST", message: msg, requestId },
      { status: 400, headers: { "X-Request-Id": requestId } },
    );
  }
}
