/** 买家端展示常量（无 Node fs，可供 Client Components 引用） */

export type StoreLocale = "ja" | "ko";
export type StoreCurrency = "JPY" | "KRW";

export interface StorefrontSettings {
  store_name: string;
  locale: StoreLocale;
  currency: StoreCurrency;
}

export const DEFAULT_STORE_SETTINGS: StorefrontSettings = {
  store_name: "FUNDAMENTAL",
  locale: "ja",
  currency: "JPY",
};

export const JPY_TO_KRW_DISPLAY = 9.2;

export function storefrontTagline(locale: StoreLocale): string {
  if (locale === "ko") return "맞춤 응원 굿즈 스토어";
  return "推し活カスタムストア";
}

/** 买家店路由前缀（与营销落地页 `/` 并存，部署于主域名的子路径） */
export const STORE_BASE_PATH = "/shop";

/** 拼接店内路径，例如 `storePath("/favorite")` → `/shop/favorite` */
export function storePath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === STORE_BASE_PATH || normalized.startsWith(`${STORE_BASE_PATH}/`)) {
    return normalized;
  }
  return `${STORE_BASE_PATH}${normalized}`;
}
