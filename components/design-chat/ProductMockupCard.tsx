import type { MockupData } from "@/lib/design-agent/types";

interface Props {
  data: MockupData;
}

export default function ProductMockupCard({ data }: Props) {
  if (data.productType === "acrylic_standee") {
    return <AcrylicMockup designUrl={data.designUrl} />;
  }
  return <TshirtMockup designUrl={data.designUrl} />;
}

function AcrylicMockup({ designUrl }: { designUrl: string }) {
  return (
    <div className="my-2 rounded-2xl overflow-hidden bg-white shadow-md border border-gray-100">
      <div className="bg-gradient-to-br from-[#E8F9EE] to-[#d0f0e0] px-3 py-2 flex items-center gap-2">
        <span className="text-base">🎴</span>
        <span className="text-xs font-semibold text-[#00803A]">アクリルスタンド プレビュー</span>
      </div>

      <div className="px-6 py-5 flex justify-center bg-[#f8fafb]">
        {/* Acrylic plate shape */}
        <div className="relative flex flex-col items-center">
          <div
            className="relative overflow-hidden"
            style={{
              width: 140,
              height: 190,
              borderRadius: 12,
              background: "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(240,248,255,0.9))",
              boxShadow: "0 4px 24px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.8)",
              border: "1.5px solid rgba(200,220,240,0.6)",
            }}
          >
            {/* Gloss overlay */}
            <div
              className="absolute inset-0 pointer-events-none z-10"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 60%)",
                borderRadius: 10,
              }}
            />
            {/* Design image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={designUrl}
              alt="デザインプレビュー"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Stand neck */}
          <div style={{ width: 4, height: 14, background: "#C8C8C8", borderRadius: 2 }} />
          {/* Stand base */}
          <div
            style={{
              width: 60,
              height: 10,
              background: "linear-gradient(180deg, #D0D0D0, #B8B8B8)",
              borderRadius: 5,
              boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
            }}
          />
        </div>
      </div>

      <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-2">
        <span className="text-xs text-gray-500">✨ 高品質アクリル素材</span>
        <span className="ml-auto text-xs text-[#06C755] font-medium">印刷対応済み</span>
      </div>
    </div>
  );
}

function TshirtMockup({ designUrl }: { designUrl: string }) {
  return (
    <div className="my-2 rounded-2xl overflow-hidden bg-white shadow-md border border-gray-100">
      <div className="bg-gradient-to-br from-[#E8F9EE] to-[#d0f0e0] px-3 py-2 flex items-center gap-2">
        <span className="text-base">👕</span>
        <span className="text-xs font-semibold text-[#00803A]">Tシャツ プレビュー</span>
      </div>

      <div className="px-6 py-5 flex justify-center bg-[#f8fafb]">
        {/* T-shirt body */}
        <div className="relative" style={{ width: 160, height: 180 }}>
          {/* T-shirt SVG shape */}
          <svg
            viewBox="0 0 160 180"
            className="absolute inset-0 w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M50 0 L20 0 L0 40 L30 50 L30 180 L130 180 L130 50 L160 40 L140 0 L110 0 C110 16 97 28 80 28 C63 28 50 16 50 0 Z"
              fill="#F5F5F5"
              stroke="#E0E0E0"
              strokeWidth="1.5"
            />
          </svg>

          {/* Design printed on chest */}
          <div
            className="absolute overflow-hidden rounded-lg"
            style={{
              left: 40,
              top: 50,
              width: 80,
              height: 80,
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={designUrl}
              alt="プリントデザイン"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-2">
        <span className="text-xs text-gray-500">🖨️ DTGフルカラープリント</span>
        <span className="ml-auto text-xs text-[#06C755] font-medium">印刷対応済み</span>
      </div>
    </div>
  );
}
