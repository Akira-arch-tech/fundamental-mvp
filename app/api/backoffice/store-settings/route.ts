import { NextResponse } from "next/server";
import { newRequestId } from "@/lib/request-id";
import type { StorefrontSettings } from "@/lib/storefront-constants";
import { getStoreSettings, saveStoreSettings } from "@/lib/store-settings";
import { getAuthedUser } from "@/lib/server-auth";

export async function GET() {
  const requestId = newRequestId();
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "login required", requestId },
      { status: 401, headers: { "X-Request-Id": requestId } },
    );
  }
  const settings = await getStoreSettings();
  return NextResponse.json({ ...settings, requestId }, { headers: { "X-Request-Id": requestId } });
}

export async function PUT(req: Request) {
  const requestId = newRequestId();
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "login required", requestId },
      { status: 401, headers: { "X-Request-Id": requestId } },
    );
  }
  try {
    const body = (await req.json()) as Partial<StorefrontSettings>;
    const next = await saveStoreSettings({
      store_name: typeof body.store_name === "string" ? body.store_name : "",
      locale: body.locale === "ko" ? "ko" : "ja",
      currency: body.currency === "KRW" ? "KRW" : "JPY",
    });
    return NextResponse.json({ ...next, requestId }, { headers: { "X-Request-Id": requestId } });
  } catch {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: "invalid json body", requestId },
      { status: 400, headers: { "X-Request-Id": requestId } },
    );
  }
}
