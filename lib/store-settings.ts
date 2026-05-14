import fs from "node:fs/promises";
import { DEFAULT_STORE_SETTINGS, type StorefrontSettings } from "@/lib/storefront-constants";
import { getActiveStoreProfileSlug, storeSettingsPathForSlug } from "@/lib/store-profile";


/** PRD §8.1：主推语言、币种展示（演示用 JSON 文件；多 profile 见 cookie `fdm_store_profile`） */
export type { StoreCurrency, StoreLocale, StorefrontSettings } from "@/lib/storefront-constants";
export { DEFAULT_STORE_SETTINGS, JPY_TO_KRW_DISPLAY, storefrontTagline } from "@/lib/storefront-constants";

async function readSettingsFromFile(filePath: string): Promise<StorefrontSettings> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<StorefrontSettings>;
    return {
      store_name: typeof parsed.store_name === "string" ? parsed.store_name : DEFAULT_STORE_SETTINGS.store_name,
      locale: parsed.locale === "ko" ? "ko" : "ja",
      currency: parsed.currency === "KRW" ? "KRW" : "JPY",
    };
  } catch {
    return { ...DEFAULT_STORE_SETTINGS };
  }
}

export async function getStoreSettings(): Promise<StorefrontSettings> {
  const slug = await getActiveStoreProfileSlug();
  const filePath = storeSettingsPathForSlug(slug);
  return readSettingsFromFile(filePath);
}

export async function saveStoreSettings(
  input: StorefrontSettings,
  opts?: { profileSlug?: string },
): Promise<StorefrontSettings> {
  const slug = opts?.profileSlug ?? (await getActiveStoreProfileSlug());
  const next: StorefrontSettings = {
    store_name: input.store_name.trim().slice(0, 80) || DEFAULT_STORE_SETTINGS.store_name,
    locale: input.locale === "ko" ? "ko" : "ja",
    currency: input.currency === "KRW" ? "KRW" : "JPY",
  };
  const filePath = storeSettingsPathForSlug(slug);
  await fs.writeFile(filePath, JSON.stringify(next, null, 2), "utf-8");
  return next;
}
