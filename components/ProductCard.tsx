import Link from "next/link";
import { RemoteSafeFillImage } from "@/components/RemoteSafeImage";
import type { ProductCard as PC } from "@/lib/types";

export function ProductCard({ p }: { p: PC }) {
  const href = `/products/${p.slug}`;
  const promoByProduct: Record<string, { off: number; coin: number }> = {
    p1: { off: 20, coin: 3 },
    p2: { off: 20, coin: 3 },
    p3: { off: 28, coin: 3 },
    p4: { off: 14, coin: 3 },
    p5: { off: 52, coin: 1 },
    p6: { off: 17, coin: 3 },
  };
  const promo = promoByProduct[p.product_id] ?? { off: 10, coin: 2 };
  const originalPrice = Math.round((p.price_from / (1 - promo.off / 100)) * 10) / 10;

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white transition hover:border-[#e85c22]/40 hover:shadow-md"
    >
      <div className="relative aspect-square w-full bg-zinc-100">
        <RemoteSafeFillImage
          src={p.cover_url}
          alt={p.title}
          className="object-cover transition group-hover:scale-[1.02]"
          sizes="(max-width:768px) 50vw, 25vw"
        />
        {p.badge ? (
          <span className="absolute left-2 top-2 rounded bg-[#e85c22] px-2 py-0.5 text-[10px] font-semibold text-white">
            {p.badge}
          </span>
        ) : null}
        <span className="absolute right-2 top-2 rounded bg-rose-500 px-2 py-0.5 text-[10px] font-semibold text-white">
          {promo.off}%OFF
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-3 text-sm font-semibold leading-snug text-zinc-900 group-hover:text-[#e85c22]">
          {p.title}
        </h3>
        <div className="flex items-end gap-2">
          <p className="text-2xl font-extrabold leading-none text-[#e85c22]">
            ¥{p.price_from.toLocaleString("ja-JP")}
          </p>
          <p className="text-xs text-zinc-400 line-through">
            ¥{Math.round(originalPrice).toLocaleString("ja-JP")}
          </p>
        </div>
        <p className="text-[11px] text-zinc-500">coin獲得予定({promo.coin}%)</p>
        <p className="text-xs text-zinc-500">納期目安 {p.lead_time_days}日 · 最低{p.min_qty}点〜</p>
      </div>
    </Link>
  );
}
