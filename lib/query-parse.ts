import type { SortKey } from "@/lib/types";
import type { ProductListParams } from "@/lib/catalog";

const SORTS: SortKey[] = [
  "popularity",
  "price_asc",
  "price_desc",
  "new",
  "lead_time",
];

function first(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

function num(v: string | undefined): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function parseProductListParams(
  sp: Record<string, string | string[] | undefined>,
): ProductListParams {
  const sortRaw = first(sp.sort);
  const sort_by = SORTS.includes(sortRaw as SortKey)
    ? (sortRaw as SortKey)
    : "popularity";
  const catRaw = first(sp.category_ids);
  const category_ids = catRaw
    ? catRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;
  return {
    query: first(sp.query),
    category_ids,
    oshi_color: first(sp.oshi_color),
    price_min: num(first(sp.price_min)),
    price_max: num(first(sp.price_max)),
    lead_time_days: num(first(sp.lead_time_days)),
    sort_by,
    page: num(first(sp.page)),
    page_size: num(first(sp.page_size)),
  };
}
