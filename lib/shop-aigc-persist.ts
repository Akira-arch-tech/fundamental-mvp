/** 买家店：AI 确认图写入 localStorage，供商详页展示「会话内上次生成」缩略图（演示）。 */
export const FDM_AIGC_LAST_KEY = "fdm_aigc_last_confirmed_v1";

export type FdmAigcLastPayload = {
  product_id: string;
  url: string;
  t: number;
};

export function readFdmAigcLastFromWindow(): FdmAigcLastPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(FDM_AIGC_LAST_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw) as Partial<FdmAigcLastPayload>;
    if (typeof j.product_id === "string" && typeof j.url === "string" && typeof j.t === "number") {
      return { product_id: j.product_id, url: j.url, t: j.t };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function writeFdmAigcLastToWindow(payload: FdmAigcLastPayload): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FDM_AIGC_LAST_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}
