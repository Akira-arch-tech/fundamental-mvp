import Link from "next/link";

const GIFT_SIZES = [
  { label: "アイコン", px: "128×128", use: "ギフト一覧" },
  { label: "配信オーバーレイ", px: "256×256", use: "送信中アニメーション" },
  { label: "高解像度", px: "512×512", use: "キャンペーン素材" },
];

export default function PocochaVirtualGiftPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-pink-50 via-white to-purple-50">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-medium text-pink-600 uppercase tracking-wider">
            Phase 2 · 概念验证 Concept Mock
          </p>
          <h1 className="text-2xl font-bold text-gray-900">
            Pococha バーチャルギフト
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            粉丝在直播间送出主播专属虚拟礼物的概念预览。本页面为 FUNDAMENTAL × DeNA
            联合试点提案用，<strong>非 Pococha 官方功能</strong>。
          </p>
        </header>

        <section className="rounded-2xl bg-white border border-pink-100 shadow-lg p-4 space-y-4">
          <p className="text-xs text-gray-500 text-center">模拟直播间</p>
          <div className="aspect-video rounded-xl bg-gradient-to-br from-purple-900 to-pink-800 relative overflow-hidden flex items-end justify-center pb-4">
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-pink-300" />
              <span className="text-white text-xs font-medium">ライバー名</span>
            </div>
            <div className="flex flex-col items-center gap-1 animate-pulse">
              <div className="w-16 h-16 rounded-2xl bg-yellow-300/90 flex items-center justify-center text-2xl shadow-lg">
                🌸
              </div>
              <span className="text-[10px] text-white/90 bg-black/40 px-2 py-0.5 rounded-full">
                推し限定ギフト ×3
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {["🌸", "💫", "🎀"].map((emoji, i) => (
              <button
                key={emoji}
                type="button"
                className={`py-3 rounded-xl border text-xl ${
                  i === 0
                    ? "border-pink-400 bg-pink-50 ring-2 ring-pink-300"
                    : "border-gray-200 bg-gray-50"
                }`}
                disabled
              >
                {emoji}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-800">素材尺寸（假设）</h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">用途</th>
                <th className="pb-2">尺寸</th>
              </tr>
            </thead>
            <tbody>
              {GIFT_SIZES.map((row) => (
                <tr key={row.label} className="border-b border-gray-50">
                  <td className="py-2 text-gray-700">{row.use}</td>
                  <td className="py-2 text-gray-600">{row.px}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10px] text-gray-400">
            正式规格待 DeNA / Pococha 确认。详见 docs/POCOCHA-VIRTUAL-GIFT-对接假设-v0.1.md
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <Link
            href="/design-chat"
            className="block text-center py-3 rounded-xl bg-[#06C755] text-white text-sm font-medium"
          >
            B2B Design Agent を開く
          </Link>
          <Link
            href="/"
            className="block text-center py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            トップへ戻る
          </Link>
        </section>

        <footer className="text-[10px] text-gray-400 text-center pb-8">
          FUNDAMENTAL · 概念验证 mock · 无 Pococha API
        </footer>
      </div>
    </main>
  );
}
