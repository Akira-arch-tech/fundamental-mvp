import { cookies } from "next/headers";
import path from "node:path";

export const STORE_PROFILE_COOKIE = "fdm_store_profile";

/** 演示用多店配置：仅小写 slug，避免路径遍历 */
export function isValidStoreProfileSlug(slug: string): boolean {
  return /^[a-z][a-z0-9-]{0,30}$/.test(slug);
}

export async function getActiveStoreProfileSlug(): Promise<string> {
  try {
    const jar = await cookies();
    const raw = jar.get(STORE_PROFILE_COOKIE)?.value?.trim().toLowerCase() ?? "";
    if (raw && isValidStoreProfileSlug(raw)) return raw;
  } catch {
    /* cookies() unavailable during static prerender */
  }
  return "default";
}

export function storeSettingsPathForSlug(slug: string): string {
  const safe = slug === "default" ? "default" : slug;
  if (safe === "default") {
    return process.env.VERCEL ? "/tmp/.fdm-store-settings.json" : path.join(process.cwd(), ".fdm-store-settings.json");
  }
  return path.join(process.cwd(), `.fdm-store-settings.${safe}.json`);
}
