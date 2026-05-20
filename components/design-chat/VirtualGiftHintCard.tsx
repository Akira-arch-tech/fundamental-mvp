"use client";

import Link from "next/link";
import type { VirtualGiftHintData } from "@/lib/design-agent/types";

interface Props {
  data: VirtualGiftHintData;
}

export default function VirtualGiftHintCard({ data }: Props) {
  return (
    <div className="rounded-2xl border border-pink-200 bg-gradient-to-br from-pink-50 to-purple-50 shadow-sm overflow-hidden p-3 space-y-2">
      <p className="text-xs font-semibold text-pink-700">🎁 Phase 2 · バーチャルギフト（概念）</p>
      <p className="text-[11px] text-gray-600">{data.giftName}</p>
      <p className="text-[10px] text-gray-500">
        ポコチャアプリ内ギフトの共同パイロット想定。正式API連携前のモックです。
      </p>
      <Link
        href={data.mockUrl}
        className="block w-full text-center py-2.5 rounded-xl bg-pink-500 text-white text-sm font-medium hover:bg-pink-600 transition-colors"
      >
        概念プレビューを見る
      </Link>
    </div>
  );
}
