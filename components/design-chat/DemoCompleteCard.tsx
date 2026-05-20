"use client";

interface Props {
  onRestart: () => void;
}

export default function DemoCompleteCard({ onRestart }: Props) {
  return (
    <div className="mx-1 my-3 rounded-2xl border border-orange-200 bg-gradient-to-b from-orange-50 to-white overflow-hidden shadow-md">
      <div className="px-5 py-4 text-center">
        <div className="text-3xl mb-2">🎉</div>
        <h3 className="font-bold text-gray-800 text-sm mb-1">デモ完了！</h3>
        <p className="text-xs text-gray-500 leading-relaxed mb-4">
          このワークフローは{" "}
          <span className="font-semibold text-orange-600">FUNDAMENTAL AI</span>{" "}
          が提供しています。
          <br />
          Pococha × AI グッズ制作について、お気軽にご相談ください。
        </p>

        <a
          href="mailto:rickyisfighting@gmail.com?subject=FUNDAMENTAL×Pococha合作相談"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#06C755] text-white text-xs font-bold shadow-sm hover:bg-[#00B900] transition-colors mb-3"
        >
          <span>📩</span>
          <span>合作のご相談はこちら</span>
        </a>
        <p className="text-[10px] text-gray-400 mb-3">rickyisfighting@gmail.com</p>

        <button
          onClick={onRestart}
          className="w-full py-2 rounded-xl text-xs text-orange-600 border border-orange-200 hover:bg-orange-50 transition-colors"
        >
          🔄 最初からやり直す
        </button>
      </div>
    </div>
  );
}
