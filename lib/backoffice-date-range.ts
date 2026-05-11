/**
 * 后台订单列表：日历日 ↔ API 用 ISO 边界（按用户本地时区的一天起止）。
 */

/** YYYY-MM-DD → 该日本地 00:00:00.000 的 ISO */
export function localDayStartIso(ymd: string): string {
  const s = ymd.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(ymd).toISOString();
  const d = new Date(`${s}T00:00:00`);
  return d.toISOString();
}

/** YYYY-MM-DD → 该日本地 23:59:59.999 的 ISO */
export function localDayEndIso(ymd: string): string {
  const s = ymd.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(ymd).toISOString();
  const d = new Date(`${s}T23:59:59.999`);
  return d.toISOString();
}

export function parseIsoToBoundary(iso: string | undefined): number | undefined {
  if (!iso?.trim()) return undefined;
  const t = new Date(iso.trim()).getTime();
  return Number.isNaN(t) ? undefined : t;
}

/** 若开始日晚于结束日，交换两侧（用于 Query / API 一致） */
export function swapYmdIfReversed(
  fromYmd: string,
  toYmd: string,
): { from: string; to: string } {
  const a = fromYmd.trim();
  const b = toYmd.trim();
  if (!a || !b) return { from: a, to: b };
  if (a <= b) return { from: a, to: b };
  return { from: b, to: a };
}

/** 今天 YYYY-MM-DD（本地） */
export function todayYmdLocal(): string {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, "0");
  const d = String(n.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 从今天往前推 `daysBack` 天（含今天算第 0 天）的 YYYY-MM-DD */
export function ymdDaysAgo(daysBack: number): string {
  const n = new Date();
  n.setHours(0, 0, 0, 0);
  n.setDate(n.getDate() - daysBack);
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, "0");
  const d = String(n.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * 对接 API：若 created_from 晚于 created_to，交换（防客户端或手工调接口传反）。
 */
export function normalizeCreatedRangeIso(
  createdFrom?: string,
  createdTo?: string,
): { createdFrom?: string; createdTo?: string } {
  const t0 = parseIsoToBoundary(createdFrom);
  const t1 = parseIsoToBoundary(createdTo);
  if (t0 === undefined && t1 === undefined) return {};
  const cf = createdFrom?.trim();
  const ct = createdTo?.trim();
  if (t0 !== undefined && t1 === undefined && cf) return { createdFrom: cf };
  if (t0 === undefined && t1 !== undefined && ct) return { createdTo: ct };
  if (t0 !== undefined && t1 !== undefined && cf && ct) {
    if (t0 <= t1) return { createdFrom: cf, createdTo: ct };
    return { createdFrom: ct, createdTo: cf };
  }
  return {};
}
