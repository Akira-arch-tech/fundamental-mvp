import { getProductBySlug, products, topicOshi } from "@/data/seed";
import { getProductAiCoverMap } from "@/lib/product-ai-cover-store";
import type { ProductCard, ProductDetail, SortKey } from "@/lib/types";

export interface ProductListParams {
  query?: string;
  category_ids?: string[];
  oshi_color?: string;
  price_min?: number;
  price_max?: number;
  lead_time_days?: number;
  sort_by?: SortKey;
  page?: number;
  page_size?: number;
}

function matchesFilters(p: ProductDetail, q: ProductListParams): boolean {
  if (q.query) {
    const t = q.query.toLowerCase();
    if (!p.title.toLowerCase().includes(t) && !p.slug.includes(t)) {
      return false;
    }
  }
  if (q.category_ids?.length) {
    const hit = q.category_ids.some((c) => p.category_ids.includes(c));
    if (!hit) return false;
  }
  if (q.oshi_color && !p.oshi_color_tags.includes(q.oshi_color)) {
    return false;
  }
  if (q.price_min != null && p.price_from < q.price_min) return false;
  if (q.price_max != null && p.price_from > q.price_max) return false;
  if (q.lead_time_days != null && p.lead_time_days > q.lead_time_days) {
    return false;
  }
  return true;
}

function sortProducts(list: ProductDetail[], sort_by: SortKey): ProductDetail[] {
  const copy = [...list];
  switch (sort_by) {
    case "price_asc":
      return copy.sort((a, b) => a.price_from - b.price_from);
    case "price_desc":
      return copy.sort((a, b) => b.price_from - a.price_from);
    case "new":
      return copy.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    case "lead_time":
      return copy.sort((a, b) => a.lead_time_days - b.lead_time_days);
    case "popularity":
    default:
      return copy.sort((a, b) => b.popularity - a.popularity);
  }
}

export function listProducts(params: ProductListParams): {
  items: ProductCard[];
  total: number;
  page: number;
  page_size: number;
} {
  const page_size = Math.min(Math.max(params.page_size ?? 24, 1), 60);
  const page = Math.max(params.page ?? 1, 1);
  const sort_by = params.sort_by ?? "popularity";
  const filtered = products.filter((p) => matchesFilters(p, params));
  const sorted = sortProducts(filtered, sort_by);
  const start = (page - 1) * page_size;
  const slice = sorted.slice(start, start + page_size);
  const items: ProductCard[] = slice.map((p) => ({
    product_id: p.product_id,
    slug: p.slug,
    title: p.title,
    cover_url: p.cover_url,
    price_from: p.price_from,
    badge: p.badge,
    lead_time_days: p.lead_time_days,
    min_qty: p.min_qty,
    category_ids: p.category_ids,
    oshi_color_tags: p.oshi_color_tags,
    popularity: p.popularity,
    created_at: p.created_at,
  }));
  return { items, total: filtered.length, page, page_size };
}

export function getTopic(topicId: string) {
  if (topicId === topicOshi.topic_id) return topicOshi;
  return null;
}

export function listTopicProducts(
  topicId: string,
  params: Omit<ProductListParams, "category_ids"> & { category_ids?: string[] },
) {
  if (topicId !== topicOshi.topic_id) {
    return { items: [] as ProductCard[], total: 0, page: 1, page_size: 24 };
  }
  return listProducts(params);
}

/** 按内部 product_id 或 slug 解析种子商品（用于后台 AI 回写关联） */
export function resolveProductRef(ref: string): ProductDetail | undefined {
  const t = ref.trim();
  if (!t) return undefined;
  const byId = products.find((p) => p.product_id === t);
  if (byId) return byId;
  return getProductBySlug(t);
}

async function patchProductCardsWithAiCovers<T extends { product_id: string; cover_url: string }>(
  items: T[],
): Promise<T[]> {
  const map = await getProductAiCoverMap();
  return items.map((c) => {
    const u = map[c.product_id];
    return u ? { ...c, cover_url: u } : c;
  });
}

export async function listProductsMerged(params: ProductListParams) {
  const base = listProducts(params);
  const items = await patchProductCardsWithAiCovers(base.items);
  return { ...base, items };
}

export async function listTopicProductsMerged(
  topicId: string,
  params: Omit<ProductListParams, "category_ids"> & { category_ids?: string[] },
) {
  const base = listTopicProducts(topicId, params);
  const items = await patchProductCardsWithAiCovers(base.items);
  return { ...base, items };
}

export async function getProductBySlugMerged(slug: string): Promise<ProductDetail | undefined> {
  const p = getProductBySlug(slug);
  if (!p) return undefined;
  const map = await getProductAiCoverMap();
  const url = map[p.product_id];
  if (!url) return p;
  return {
    ...p,
    cover_url: url,
    gallery: p.gallery.length ? [url, ...p.gallery.slice(1)] : [url],
  };
}

export async function getProductByIdMerged(productId: string): Promise<ProductDetail | undefined> {
  const p = products.find((x) => x.product_id === productId);
  if (!p) return undefined;
  const map = await getProductAiCoverMap();
  const url = map[p.product_id];
  if (!url) return p;
  return {
    ...p,
    cover_url: url,
    gallery: p.gallery.length ? [url, ...p.gallery.slice(1)] : [url],
  };
}
