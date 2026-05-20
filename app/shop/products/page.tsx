import Link from "next/link";
import { categories, topicOshi } from "@/data/seed";
import { ProductCard } from "@/components/ProductCard";
import { listProductsMerged } from "@/lib/catalog";
import { withQuery } from "@/lib/build-url";
import { storePath } from "@/lib/storefront-constants";
import { parseProductListParams } from "@/lib/query-parse";
import { flattenSearchParams } from "@/lib/search-params";
import type { SortKey } from "@/lib/types";

export const metadata = {
  title: "商品一覧 | FUNDAMENTAL",
  description: "推し活・ノベルティ向けオリジナルグッズ（アクリルスタンド・Tシャツ・缶バッジなど）",
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = flattenSearchParams(await searchParams);
  const parsed = parseProductListParams(raw);
  const { items, total, page, page_size } = await listProductsMerged(parsed);
  const currentSort = (parsed.sort_by ?? "popularity") as SortKey;
  const totalPages = Math.max(1, Math.ceil(total / page_size));
  const nextPage = page < totalPages ? page + 1 : null;
  const prevPage = page > 1 ? page - 1 : null;

  /** サイドバー・並び替え・ページ送りで共通の query 断片（URL 共有可能なフィルタ） */
  const navBase = {
    query: raw.query as string | undefined,
    category_ids: raw.category_ids as string | undefined,
    oshi_color: raw.oshi_color as string | undefined,
    sort: raw.sort as string | undefined,
    lead_time_days: raw.lead_time_days as string | undefined,
    price_min: raw.price_min as string | undefined,
    price_max: raw.price_max as string | undefined,
  };

  const priceBandActive =
    raw.price_max === "700" && !raw.price_min
      ? "lte700"
      : raw.price_min === "701" && raw.price_max === "1000"
        ? "range"
        : raw.price_min === "1001" && !raw.price_max
          ? "gte1001"
          : "none";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">商品一覧</h1>
          <p className="text-sm text-zinc-500">
            {total} 件中 {(page - 1) * page_size + 1}–
            {Math.min(page * page_size, total)} 件を表示
          </p>
        </div>
        <form action={storePath("/products")} method="get" className="flex w-full gap-2 md:max-w-md">
          <input type="hidden" name="category_ids" value={String(raw.category_ids ?? "")} />
          <input type="hidden" name="oshi_color" value={String(raw.oshi_color ?? "")} />
          <input type="hidden" name="sort" value={String(raw.sort ?? "")} />
          <input type="hidden" name="lead_time_days" value={String(raw.lead_time_days ?? "")} />
          <input type="hidden" name="price_min" value={String(raw.price_min ?? "")} />
          <input type="hidden" name="price_max" value={String(raw.price_max ?? "")} />
          <input
            name="query"
            defaultValue={String(raw.query ?? "")}
            placeholder="商品名で検索"
            className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-[#e85c22]"
          />
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
          >
            検索
          </button>
        </form>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 text-sm">
          <div>
            <p className="mb-2 font-bold text-zinc-800">種類</p>
            <ul className="space-y-1">
              <li>
                <Link
                  href={withQuery(storePath("/products"), {
                    ...navBase,
                    category_ids: undefined,
                  })}
                  className={!raw.category_ids ? "text-[#e85c22]" : "text-zinc-600"}
                >
                  すべて
                </Link>
              </li>
              {categories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={withQuery(storePath("/products"), {
                      ...navBase,
                      category_ids: c.id,
                    })}
                    className={
                      raw.category_ids === c.id
                        ? "font-semibold text-[#e85c22]"
                        : "text-zinc-600 hover:text-zinc-900"
                    }
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 font-bold text-zinc-800">推し色</p>
            <div className="flex flex-wrap gap-1">
              <Link
                href={withQuery(storePath("/products"), {
                  ...navBase,
                  oshi_color: undefined,
                })}
                className={`rounded-full px-2 py-0.5 text-xs ${
                  !raw.oshi_color ? "bg-zinc-900 text-white" : "bg-zinc-100"
                }`}
              >
                指定なし
              </Link>
              {topicOshi.oshi_colors.map((col) => (
                <Link
                  key={col.code}
                  href={withQuery(storePath("/products"), {
                    ...navBase,
                    oshi_color: col.code,
                  })}
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    raw.oshi_color === col.code
                      ? "bg-[#e85c22] text-white"
                      : "bg-zinc-100"
                  }`}
                >
                  {col.name}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 font-bold text-zinc-800">納期</p>
            <div className="flex flex-wrap gap-1">
              <Link
                href={withQuery(storePath("/products"), {
                  ...navBase,
                  lead_time_days: undefined,
                })}
                className={`rounded-full px-2 py-0.5 text-xs ${
                  !raw.lead_time_days ? "bg-zinc-900 text-white" : "bg-zinc-100"
                }`}
              >
                指定なし
              </Link>
              {["3", "5", "7"].map((d) => (
                <Link
                  key={d}
                  href={withQuery(storePath("/products"), {
                    ...navBase,
                    lead_time_days: d,
                  })}
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    String(raw.lead_time_days) === d
                      ? "bg-[#e85c22] text-white"
                      : "bg-zinc-100"
                  }`}
                >
                  {d}日以内
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 font-bold text-zinc-800">価格帯</p>
            <p className="mb-2 text-xs text-zinc-500">
              税込目安（表示価格の下限）。URL に反映され共有可能です。
            </p>
            <div className="flex flex-wrap gap-1">
              <Link
                href={withQuery(storePath("/products"), {
                  ...navBase,
                  price_min: undefined,
                  price_max: undefined,
                  page: 1,
                })}
                className={`rounded-full px-2 py-0.5 text-xs ${
                  priceBandActive === "none"
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-700"
                }`}
              >
                指定なし
              </Link>
              <Link
                href={withQuery(storePath("/products"), {
                  ...navBase,
                  price_max: "700",
                  price_min: undefined,
                  page: 1,
                })}
                className={`rounded-full px-2 py-0.5 text-xs ${
                  priceBandActive === "lte700"
                    ? "bg-[#e85c22] text-white"
                    : "bg-zinc-100 text-zinc-700"
                }`}
              >
                〜¥700
              </Link>
              <Link
                href={withQuery(storePath("/products"), {
                  ...navBase,
                  price_min: "701",
                  price_max: "1000",
                  page: 1,
                })}
                className={`rounded-full px-2 py-0.5 text-xs ${
                  priceBandActive === "range"
                    ? "bg-[#e85c22] text-white"
                    : "bg-zinc-100 text-zinc-700"
                }`}
              >
                ¥701〜1000
              </Link>
              <Link
                href={withQuery(storePath("/products"), {
                  ...navBase,
                  price_min: "1001",
                  price_max: undefined,
                  page: 1,
                })}
                className={`rounded-full px-2 py-0.5 text-xs ${
                  priceBandActive === "gte1001"
                    ? "bg-[#e85c22] text-white"
                    : "bg-zinc-100 text-zinc-700"
                }`}
              >
                ¥1001〜
              </Link>
            </div>
          </div>
        </aside>

        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            {topicOshi.sort_options.map((opt) => (
              <Link
                key={opt.key}
                href={withQuery(storePath("/products"), {
                  ...navBase,
                  sort: opt.key,
                  page: 1,
                })}
                className={`rounded-full px-3 py-1 text-xs ${
                  currentSort === opt.key
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-700"
                }`}
              >
                {opt.label}
              </Link>
            ))}
          </div>

          {items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
              該当する商品がありません。
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {items.map((p) => (
                <ProductCard key={p.product_id} p={p} />
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-center gap-4 text-sm">
            {prevPage ? (
              <Link
                href={withQuery(storePath("/products"), {
                  ...navBase,
                  page: prevPage,
                })}
                className="text-[#e85c22] hover:underline"
              >
                ← 前へ
              </Link>
            ) : (
              <span className="text-zinc-300">← 前へ</span>
            )}
            <span className="text-zinc-500">
              {page} / {totalPages}
            </span>
            {nextPage ? (
              <Link
                href={withQuery(storePath("/products"), {
                  ...navBase,
                  page: nextPage,
                })}
                className="text-[#e85c22] hover:underline"
              >
                次へ →
              </Link>
            ) : (
              <span className="text-zinc-300">次へ →</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
