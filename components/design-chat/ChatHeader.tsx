"use client";

import { useRouter } from "next/navigation";

export default function ChatHeader() {
  const router = useRouter();

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-[#06C755] text-white shadow-sm flex-shrink-0">
      <button
        onClick={() => router.back()}
        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
        aria-label="戻る"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
        <span className="text-[#06C755] font-bold text-sm">F</span>
      </div>

      <div className="flex flex-col min-w-0">
        <span className="font-bold text-sm leading-tight">FUNDAMENTAL デザインAI</span>
        <span className="text-white/80 text-xs leading-tight">グッズをAIでかんたん作成</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
        <span className="text-xs text-white/90">オンライン</span>
      </div>
    </div>
  );
}
