import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { newRequestId } from "@/lib/request-id";
import { listExistingStoreProfileSlugs } from "@/lib/store-profiles-list";
import { isValidStoreProfileSlug, STORE_PROFILE_COOKIE } from "@/lib/store-profile";

export const dynamic = "force-dynamic";

/** 买家域切换演示店 profile（仅允许已存在的 slug 文件） */
export async function POST(req: Request) {
  const requestId = newRequestId();
  try {
    const body = (await req.json()) as { slug?: string };
    const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
    if (!isValidStoreProfileSlug(slug)) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "invalid slug", requestId },
        { status: 422, headers: { "X-Request-Id": requestId } },
      );
    }
    const ok = await listExistingStoreProfileSlugs();
    if (!ok.includes(slug)) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "unknown store profile", requestId },
        { status: 404, headers: { "X-Request-Id": requestId } },
      );
    }
    const jar = await cookies();
    jar.set(STORE_PROFILE_COOKIE, slug, {
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
      sameSite: "lax",
      httpOnly: true,
    });
    return NextResponse.json({ ok: true, slug, requestId }, { headers: { "X-Request-Id": requestId } });
  } catch {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: "invalid json body", requestId },
      { status: 400, headers: { "X-Request-Id": requestId } },
    );
  }
}
