import type { MockSessionPayload } from "@/lib/mock-session";
import { MOCK_SESSION_COOKIE, decodeMockSession } from "@/lib/mock-session";

export function getSessionFromCookieHeader(cookieHeader: string | null): MockSessionPayload | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((p) => p.trim());
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (name === MOCK_SESSION_COOKIE && value) {
      return decodeMockSession(decodeURIComponent(value));
    }
  }
  return null;
}
