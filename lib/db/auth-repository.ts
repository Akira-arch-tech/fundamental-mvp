import { randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import type { DrizzleDb } from "@/lib/db/client";
import { sessions, users } from "@/lib/db/schema";
import type { OperatorRole } from "@/lib/types";

export async function findUserByEmail(db: DrizzleDb, email: string) {
  const normalized = email.trim().toLowerCase();
  const [u] = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
  return u;
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function createSessionForUser(db: DrizzleDb, userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const id = `ses_${randomBytes(8).toString("hex")}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({
    id,
    token,
    userId,
    expiresAt,
  });
  return token;
}

export async function deleteSessionByToken(db: DrizzleDb, token: string) {
  await db.delete(sessions).where(eq(sessions.token, token));
}

export async function findUserBySessionToken(
  db: DrizzleDb,
  token: string,
): Promise<{ user_id: string; display_name: string; role: OperatorRole } | null> {
  const [row] = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);
  if (!row) return null;
  const roles: OperatorRole[] = ["customer_service", "ops", "admin"];
  const role = row.user.role as OperatorRole;
  if (!roles.includes(role)) return null;
  return {
    user_id: row.user.id,
    display_name: row.user.displayName,
    role,
  };
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}
