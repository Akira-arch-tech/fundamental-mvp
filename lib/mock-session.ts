import { createHmac, timingSafeEqual } from "node:crypto";
import type { OperatorRole } from "@/lib/types";

export const MOCK_SESSION_COOKIE = "fdm_session";

export interface MockSessionPayload {
  user_id: string;
  display_name: string;
  role: OperatorRole;
}

// Production last resort when SESSION_SECRET is unset (single-instance demos only).
const _ephemeralProdFallback = `fdm_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

/** 与 Next dev 多 worker 兼容：未设置 SESSION_SECRET 时使用固定 dev 密钥，避免登录与校验落到不同进程时验签失败。 */
const _devStableFallback = "fdm_dev_mock_session_not_for_production________";

function getSecret(): string {
  const fromEnv = process.env.SESSION_SECRET?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV !== "production") return _devStableFallback;
  return _ephemeralProdFallback;
}

function sign(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

export function encodeMockSession(payload: MockSessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
  const sig = sign(body, getSecret());
  return `${body}.${sig}`;
}

export function decodeMockSession(value: string): MockSessionPayload | null {
  try {
    const dot = value.lastIndexOf(".");
    if (dot === -1) return null;
    const body = value.slice(0, dot);
    const sig = value.slice(dot + 1);
    const expected = sign(body, getSecret());
    if (sig.length !== expected.length) return null;
    if (!timingSafeEqual(Buffer.from(sig, "utf-8"), Buffer.from(expected, "utf-8"))) {
      return null;
    }
    const raw = Buffer.from(body, "base64url").toString("utf-8");
    const data = JSON.parse(raw) as Partial<MockSessionPayload>;
    const roles: OperatorRole[] = ["customer_service", "ops", "admin"];
    if (!data.user_id || !data.display_name || !data.role || !roles.includes(data.role)) {
      return null;
    }
    return { user_id: data.user_id, display_name: data.display_name, role: data.role };
  } catch {
    return null;
  }
}
