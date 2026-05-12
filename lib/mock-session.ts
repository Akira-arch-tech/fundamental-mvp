import type { OperatorRole } from "@/lib/types";

export const MOCK_SESSION_COOKIE = "fdm_session";

export interface MockSessionPayload {
  user_id: string;
  display_name: string;
  role: OperatorRole;
}

export function encodeMockSession(payload: MockSessionPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
}

export function decodeMockSession(value: string): MockSessionPayload | null {
  try {
    const raw = Buffer.from(value, "base64url").toString("utf-8");
    const data = JSON.parse(raw) as Partial<MockSessionPayload>;
    const roles: OperatorRole[] = ["customer_service", "ops", "admin"];
    if (!data.user_id || !data.display_name || !data.role || !roles.includes(data.role)) {
      return null;
    }
    return {
      user_id: data.user_id,
      display_name: data.display_name,
      role: data.role,
    };
  } catch {
    return null;
  }
}
