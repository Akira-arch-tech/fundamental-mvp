import Link from "next/link";
import { categories, pickupReviews, topicOshi } from "@/data/seed";
import { ProductCard } from "@/components/ProductCard";
import { RemoteSafeFillImage } from "@/components/RemoteSafeImage";
import { listTopicProductsMerged } from "@/lib/catalog";
import { withQuery } from "@/lib/build-url";
import { parseProductListParams } from "@/lib/query-parse";
import { flattenSearchParams } from "@/lib/search-params";
import type { SortKey } from "@/lib/types";

export const metadata = {
  title: "推し活 | FUNDAMENTAL",
  description: topicOshi.topic_subtitle,
};

export default async function FavoritePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = flattenSearchParams(await searchParams);
  const parsed = parseProductListParams(raw);
  const { items } = await listTopicProductsMerged("oshi", parsed);
  const currentSort = (parsed.sort_by ?? "popularity") as SortKey;
  const selectedCategoryId = parsed.category_ids?.[0];
  const selectedCategory = selectedCategoryId
    ? categories.find((c) => c.id === selectedCategoryId)
    : undefined;
  const heroTitle = selectedCategory
    ? `${selectedCategory.name} 特集`
    : topicOshi.topic_title;
  const heroSubtitle = selectedCategory
    ? `${selectedCategory.name} の商品のみ表示しています。小口〜大口まで同じ商品データでご案内します。`
    : topicOshi.topic_subtitle;
  const heroImageUrl =
    items[0]?.cover_url ?? topicOshi.hero_banners[0]?.image_url ?? "";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <section className="mb-8 overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-br from-orange-50 to-white">
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_220px] md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#e85c22]">
              オリジナル推し活グッズ
            </p>
            <h1 className="mt-2 text-2xl font-bold text-zinc-900 md:text-3xl">
              {heroTitle}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-600">
              {heroSubtitle}
            </p>
          </div>
          <div className="relative hidden h-40 md:block">
            <RemoteSafeFillImage
              src={heroImageUrl}
              alt={selectedCategory ? `${selectedCategory.name} バナー` : "推し活バナー"}
              className="rounded-xl object-cover"
            />
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-bold text-zinc-800">
          おすすめから選ぶ
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {topicOshi.recommended_categories.map((c) => (
            <Link
              key={c.id}
              href={withQuery("/favorite", {
                category_ids: c.id,
                oshi_color: raw.oshi_color as string | undefined,
                sort: raw.sort as string | undefined,
              })}
              className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-4 text-center shadow-sm transition hover:border-[#e85c22]/50"
            >
              <span className="text-2xl">{c.icon}</span>
              <span className="mt-2 text-xs font-semibold text-zinc-800">
                {c.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-6 space-y-4 rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-zinc-500">種類</span>
          <Link
            href={withQuery("/favorite", {
              sort: raw.sort as string | undefined,
              oshi_color: raw.oshi_color as string | undefined,
            })}
            className={`rounded-full px-3 py-1 text-xs ${
              !raw.category_ids ? "bg-zinc-900 text-white" : "bg-zinc-100"
            }`}
          >
            すべて
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={withQuery("/favorite", {
                category_ids: c.id,
                sort: raw.sort as string | undefined,
                oshi_color: raw.oshi_color as string | undefined,
              })}
              className={`rounded-full px-3 py-1 text-xs ${
                raw.category_ids === c.id
                  ? "bg-[#e85c22] text-white"
                  : "bg-zinc-100 text-zinc-700"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-zinc-500">推し色</span>
          <Link
            href={withQuery("/favorite", {
              category_ids: raw.category_ids as string | undefined,
              sort: raw.sort as string | undefined,
            })}
            className={`rounded-full px-3 py-1 text-xs ${
              !raw.oshi_color ? "bg-zinc-900 text-white" : "bg-zinc-100"
            }`}
          >
            指定なし
          </Link>
          {topicOshi.oshi_colors.map((col) => (
            <Link
              key={col.code}
              href={withQuery("/favorite", {
                category_ids: raw.category_ids as string | undefined,
                oshi_color: col.code,
                sort: raw.sort as string | undefined,
              })}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${
                raw.oshi_color === col.code
                  ? "border-[#e85c22] bg-orange-50"
                  : "border-zinc-200 bg-white"
              }`}
            >
              <span
                className="h-3 w-3 rounded-full border border-zinc-300"
                style={{ background: col.hex }}
              />
              {col.name}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-3">
          <span className="text-xs font-bold text-zinc-500">並び替え</span>
          {topicOshi.sort_options.map((opt) => (
            <Link
              key={opt.key}
              href={withQuery("/favorite", {
                category_ids: raw.category_ids as string | undefined,
                oshi_color: raw.oshi_color as string | undefined,
                sort: opt.key,
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
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-800">アイテム一覧</h2>
          <Link href="/products" className="text-xs text-[#e85c22] hover:underline">
            全カテゴリへ →
          </Link>
        </div>
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
            条件に一致する商品がありません。フィルタを解除してください。
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {items.map((p) => (
              <ProductCard key={p.product_id} p={p} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-sm font-bold text-zinc-800">
          ピックアップレビュー
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          {pickupReviews.map((r) => (
            <blockquote
              key={r.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 shadow-sm"
            >
              <p className="line-clamp-4">&ldquo;{r.excerpt}&rdquo;</p>
              <footer className="mt-2 text-xs text-zinc-400">
                {r.region} / {r.gender} / {r.month}
              </footer>
            </blockquote>
          ))}
        </div>
      </section>
    </div>
  );
}
