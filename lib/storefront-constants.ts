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
