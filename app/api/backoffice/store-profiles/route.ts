import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { newRequestId } from "@/lib/request-id";
import { getAuthedUser } from "@/lib/server-auth";
import { cloneStoreProfileToSlug, listExistingStoreProfileSlugs } from "@/lib/store-profiles-list";
import { isValidStoreProfileSlug, STORE_PROFILE_COOKIE } from "@/lib/store-profile";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = newRequestId();
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "login required", requestId },
      { status: 401, headers: { "X-Request-Id": requestId } },
    );
  }
  const slugs = await listExistingStoreProfileSlugs();
  return NextResponse.json({ slugs, requestId }, { headers: { "X-Request-Id": requestId } });
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
  try {
    const body = (await req.json()) as { action?: string; from_slug?: string; new_slug?: string };
    if (body.action !== "clone") {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "action must be clone", requestId },
        { status: 422, headers: { "X-Request-Id": requestId } },
      );
    }
    const fromSlug =
      typeof body.from_slug === "string" && body.from_slug.trim() ? body.from_slug.trim().toLowerCase() : "default";
    const newSlug = typeof body.new_slug === "string" ? body.new_slug.trim().toLowerCase() : "";
    if (!isValidStoreProfileSlug(newSlug)) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "invalid new_slug", requestId },
        { status: 422, headers: { "X-Request-Id": requestId } },
      );
    }
    const existing = await listExistingStoreProfileSlugs();
    if (existing.includes(newSlug)) {
      return NextResponse.json(
        { code: "CONFLICT", message: "profile already exists", requestId },
        { status: 409, headers: { "X-Request-Id": requestId } },
      );
    }
    await cloneStoreProfileToSlug(fromSlug, newSlug);
    const jar = await cookies();
    jar.set(STORE_PROFILE_COOKIE, newSlug, {
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
      sameSite: "lax",
      httpOnly: true,
    });
    return NextResponse.json(
      { ok: true, active_slug: newSlug, slugs: await listExistingStoreProfileSlugs(), requestId },
      { headers: { "X-Request-Id": requestId } },
    );
  } catch {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: "invalid json body", requestId },
      { status: 400, headers: { "X-Request-Id": requestId } },
    );
  }
}
