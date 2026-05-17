import Link from "next/link";
import type { OrderData } from "@/lib/design-agent/types";

interface Props {
  data: OrderData;
}

const PRODUCT_LABEL: Record<string, string> = {
  acrylic_standee: "アクリルスタンド",
  tshirt: "Tシャツ",
};

/** チャットフローで productType → 商品ページの slug に変換 */
const PRODUCT_SLUG: Record<string, string> = {
  acrylic_standee: "free-acrylic-stand-clear",
  tshirt: "custom-tshirt-fullprint",
};

export default function OrderConfirmCard({ data }: Props) {
  const label = PRODUCT_LABEL[data.productType] ?? data.productType;
  const slug = PRODUCT_SLUG[data.productType] ?? "free-acrylic-stand-clear";
  const params = new URLSearchParams({
    qty: String(data.quantity),
    chatSize: data.size,
  });
  const customizePath = `/shop/customize/${slug}?${params.toString()}`;

  return (
    <div className="my-2 rounded-2xl overflow-hidden shadow-md border border-[#06C755]/30">
      {/* Header */}
      <div className="bg-[#06C755] px-4 py-3 flex items-center gap-2">
        <span className="text-xl">✅</span>
        <div>
          <p className="text-white font-bold text-sm">デザインの内容が決まりました！</p>
          <p className="text-white/80 text-xs">以下の内容でご注文に進めます</p>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white px-4 py-3 space-y-2">
        {[
          ["📦 商品", label],
          ["📐 サイズ", data.size],
          ["🔢 数量", `${data.quantity}個`],
          ["💴 単価", `¥${data.unitPrice.toLocaleString()}`],
        ].map(([rowLabel, value]) => (
          <div key={rowLabel} className="flex justify-between items-center text-sm">
            <span className="text-gray-500">{rowLabel}</span>
            <span className="text-gray-800 font-medium">{value}</span>
          </div>
        ))}

        <div className="border-t border-gray-100 pt-2 flex justify-between items-center">
          <span className="text-sm font-bold text-gray-700">💰 お見積もり</span>
          <span className="text-lg font-bold text-[#06C755]">
            ¥{data.totalPrice.toLocaleString()}〜
          </span>
        </div>
      </div>

      {/* Footer — real CTA linking to the customize editor */}
      <div className="bg-[#F0FDF4] px-4 py-3 flex items-center justify-between gap-2">
        <span className="text-xs text-gray-500">
          ⏰ 発送予定：<strong className="text-gray-700">{data.estimatedDays}</strong>
        </span>
        <Link
          href={customizePath}
          className="inline-flex items-center gap-1 rounded-full bg-[#06C755] px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[#05b34a] transition-colors"
        >
          デザインして注文へ →
        </Link>
      </div>
    </div>
  );
}
