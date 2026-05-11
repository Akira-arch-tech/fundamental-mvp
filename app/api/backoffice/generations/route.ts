import { NextResponse } from "next/server";
import { newRequestId } from "@/lib/request-id";
import { getAuthedUser } from "@/lib/server-auth";
import { shouldPersistGeneration } from "@/lib/image-generation/config";
import { listGenerations } from "@/lib/image-generation/generation-store";
import { executeGenerationPipeline, validateCreateBody } from "@/lib/image-generation/run-generation";
import type { CreateGenerationBody } from "@/lib/image-generation/types";

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
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 20, 1), 100);
  if (!shouldPersistGeneration()) {
    return NextResponse.json({ items: [], requestId }, { headers: { "X-Request-Id": requestId } });
  }
  const items = await listGenerations(limit);
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

  let body: CreateGenerationBody;
  try {
    body = (await req.json()) as CreateGenerationBody;
  } catch {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: "invalid json body", requestId },
      { status: 400, headers: { "X-Request-Id": requestId } },
    );
  }

  const pre = validateCreateBody(body);
  if (!pre.ok) {
    return NextResponse.json(
      { code: pre.code, message: pre.message, requestId },
      { status: 422, headers: { "X-Request-Id": requestId } },
    );
  }

  try {
    const generation = await executeGenerationPipeline({
      body,
      user_id: user.user_id,
    });
    const status = generation.status === "failed" ? 502 : 201;
    return NextResponse.json({ generation, requestId }, { status, headers: { "X-Request-Id": requestId } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const code =
      e && typeof e === "object" && "code" in e && typeof (e as { code: unknown }).code === "string"
        ? (e as { code: string }).code
        : "GENERATION_FAILED";
    const http = code === "VALIDATION_ERROR" ? 422 : 500;
    return NextResponse.json({ code, message: msg, requestId }, { status: http, headers: { "X-Request-Id": requestId } });
  }
}
