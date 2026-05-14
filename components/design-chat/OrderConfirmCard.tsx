import type { OrderData } from "@/lib/design-agent/types";

interface Props {
  data: OrderData;
}

const PRODUCT_LABEL: Record<string, string> = {
  acrylic_standee: "アクリルスタンド",
  tshirt: "Tシャツ",
};

export default function OrderConfirmCard({ data }: Props) {
  const label = PRODUCT_LABEL[data.productType] ?? data.productType;

  return (
    <div className="my-2 rounded-2xl overflow-hidden shadow-md border border-[#06C755]/30">
      {/* Header */}
      <div className="bg-[#06C755] px-4 py-3 flex items-center gap-2">
        <span className="text-xl">🎉</span>
        <div>
          <p className="text-white font-bold text-sm">ご注文が完了しました！</p>
          <p className="text-white/80 text-xs">注文番号: {data.orderId}</p>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white px-4 py-3 space-y-2">
        {[
          ["📦 商品", label],
          ["📐 サイズ", data.size],
          ["🔢 数量", `${data.quantity}個`],
          ["💴 単価", `¥${data.unitPrice.toLocaleString()}`],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between items-center text-sm">
            <span className="text-gray-500">{label}</span>
            <span className="text-gray-800 font-medium">{value}</span>
          </div>
        ))}

        <div className="border-t border-gray-100 pt-2 flex justify-between items-center">
          <span className="text-sm font-bold text-gray-700">💰 合計金額</span>
          <span className="text-lg font-bold text-[#06C755]">
            ¥{data.totalPrice.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-[#F0FDF4] px-4 py-2.5 flex items-center gap-2">
        <span className="text-sm">⏰</span>
        <span className="text-xs text-gray-600">
          発送予定：<strong className="text-gray-800">{data.estimatedDays}</strong>
        </span>
        <span className="ml-auto text-xs text-[#06C755] font-semibold">製作開始 ▶</span>
      </div>
    </div>
  );
}
