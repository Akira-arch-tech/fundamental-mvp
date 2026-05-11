import { NextResponse } from "next/server";
import {
  createSessionForUser,
  findUserByEmail,
  verifyPassword,
} from "@/lib/db/auth-repository";
import { getDb } from "@/lib/db/client";
import { encodeMockSession, MOCK_SESSION_COOKIE } from "@/lib/mock-session";
import { newRequestId } from "@/lib/request-id";
import { isDatabaseEnabled } from "@/lib/runtime";
import type { OperatorRole } from "@/lib/types";

type MockLoginBody = {
  display_name: string;
  role: OperatorRole;
};

type DbLoginBody = {
  email: string;
  password: string;
};

export async function POST(req: Request) {
  const requestId = newRequestId();
  try {
    const body = (await req.json()) as Partial<MockLoginBody & DbLoginBody>;

    if (isDatabaseEnabled()) {
      const email = (body.email ?? "").trim().toLowerCase();
      const password = body.password ?? "";
      if (!email || !password) {
        return NextResponse.json(
          { code: "VALIDATION_ERROR", message: "email and password are required", requestId },
          { status: 422, headers: { "X-Request-Id": requestId } },
        );
      }
      const db = getDb();
      if (!db) {
        return NextResponse.json(
          { code: "SERVICE_UNAVAILABLE", message: "database not configured", requestId },
          { status: 503, headers: { "X-Request-Id": requestId } },
        );
      }
      const user = await findUserByEmail(db, email);
      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        return NextResponse.json(
          { code: "UNAUTHORIZED", message: "invalid email or password", requestId },
          { status: 401, headers: { "X-Request-Id": requestId } },
        );
      }
      const token = await createSessionForUser(db, user.id);
      const res = NextResponse.json(
        {
          user_id: user.id,
          display_name: user.displayName,
          role: user.role,
          requestId,
        },
        { headers: { "X-Request-Id": requestId } },
      );
      res.cookies.set(MOCK_SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
      return res;
    }

    const displayName = (body.display_name ?? "").trim();
    const role = body.role as OperatorRole | undefined;
    const allowed: OperatorRole[] = ["customer_service", "ops", "admin"];
    if (!displayName || !role || !allowed.includes(role)) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "display_name and valid role are required", requestId },
        { status: 422, headers: { "X-Request-Id": requestId } },
      );
    }

    const userId = `usr_${Math.random().toString(16).slice(2, 10)}`;
    const payload = { user_id: userId, display_name: displayName, role };
    const token = encodeMockSession(payload);

    const res = NextResponse.json(
      { user_id: userId, display_name: displayName, role, requestId },
      { headers: { "X-Request-Id": requestId } },
    );
    res.cookies.set(MOCK_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: "invalid json body", requestId },
      { status: 400, headers: { "X-Request-Id": requestId } },
    );
  }
}
