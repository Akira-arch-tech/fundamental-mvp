import { cookies } from "next/headers";
import { getDb } from "@/lib/db/client";
import { findUserBySessionToken } from "@/lib/db/auth-repository";
import { decodeMockSession, MOCK_SESSION_COOKIE } from "@/lib/mock-session";
import { isDatabaseEnabled } from "@/lib/runtime";
import type { OperatorRole } from "@/lib/types";

export type AuthedUser = {
  user_id: string;
  display_name: string;
  role: OperatorRole;
};

/**
 * 读取当前登录用户。启用 DATABASE_URL 时仅信任数据库会话（Cookie 为不透明 token）；否则使用 W10 Mock Cookie。
 */
export async function getAuthedUser(): Promise<AuthedUser | null> {
  const jar = await cookies();
  const raw = jar.get(MOCK_SESSION_COOKIE)?.value;
  if (!raw) return null;

  if (isDatabaseEnabled()) {
    const db = getDb();
    if (!db) return null;
    const u = await findUserBySessionToken(db, raw);
    return u;
  }

  return decodeMockSession(raw);
}
