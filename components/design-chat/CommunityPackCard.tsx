"use client";

import { useState } from "react";
import type { CommunityPackData } from "@/lib/design-agent/types";
import { formatCommunityPackPlainText } from "@/lib/design-agent/community-kit";

interface Props {
  data: CommunityPackData;
}

export default function CommunityPackCard({ data }: Props) {
  const [copied, setCopied] = useState(false);

  const sections = [
    { title: "LINE OA · 開始", body: data.lineOa[0] },
    { title: "LINE OA · 途中", body: data.lineOa[1] },
    { title: "LINE OA · ラスト", body: data.lineOa[2] },
    { title: "Discord 投票", body: data.discordVotePost },
    { title: "ポコチャ口播", body: data.pocochaLiveScript },
    { title: "X 投稿", body: data.twitterHint },
  ];

  const handleCopyAll = async () => {
    const text = formatCommunityPackPlainText(data);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#06C755]/30 bg-white shadow-sm overflow-hidden">
      <div className="px-3 py-2 bg-[#F0FDF4] border-b border-[#06C755]/20 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm">📦</span>
          <span className="text-xs font-semibold text-[#06C755] truncate">
            コミュニティ運営キット
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopyAll}
          className={`flex-shrink-0 text-[10px] font-medium px-2.5 py-1 rounded-full transition-colors ${
            copied
              ? "bg-[#06C755] text-white"
              : "bg-white border border-[#06C755]/40 text-[#06C755] hover:bg-[#F0FDF4]"
          }`}
        >
          {copied ? "✅ コピー済" : "📋 すべてコピー"}
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto p-3 space-y-3">
        {sections.map((s) => (
          <div key={s.title}>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">
              {s.title}
            </p>
            <pre className="text-[11px] text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
              {s.body}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
