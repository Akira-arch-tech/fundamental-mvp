import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { deleteSessionByToken } from "@/lib/db/auth-repository";
import { getDb } from "@/lib/db/client";
import { MOCK_SESSION_COOKIE } from "@/lib/mock-session";
import { newRequestId } from "@/lib/request-id";
import { isDatabaseEnabled } from "@/lib/runtime";

export async function POST() {
  const requestId = newRequestId();
  const jar = await cookies();
  const token = jar.get(MOCK_SESSION_COOKIE)?.value;

  if (isDatabaseEnabled() && token) {
    const db = getDb();
    if (db) {
      try {
        await deleteSessionByToken(db, token);
      } catch {
        // ignore — cookie will still be cleared
      }
    }
  }

  const res = NextResponse.json({ ok: true, requestId }, { headers: { "X-Request-Id": requestId } });
  res.cookies.set(MOCK_SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
