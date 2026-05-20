"use client";

import { useState } from "react";
import CommunityKitButton from "./CommunityKitButton";

interface CopywritingCardProps {
  content: string;
  isDemo?: boolean;
}

export default function CopywritingCard({ content, isDemo }: CopywritingCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const textarea = document.createElement("textarea");
      textarea.value = content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="my-3 rounded-2xl border border-orange-200 bg-orange-50 overflow-hidden shadow-sm max-w-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-orange-100 border-b border-orange-200">
        <div className="flex items-center gap-2">
          <span className="text-base">📄</span>
          <span className="text-xs font-semibold text-orange-800">
            クラウドファンディング文案
          </span>
        </div>
        <span className="text-[10px] text-orange-500 bg-orange-200 px-2 py-0.5 rounded-full">
          Kibidango / Campfire
        </span>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed max-h-64 overflow-y-auto">
          {content}
        </pre>
      </div>

      {/* Copy button */}
      <div className="px-4 pb-3">
        <button
          onClick={handleCopy}
          className={`w-full py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
            copied
              ? "bg-green-500 text-white"
              : "bg-orange-500 hover:bg-orange-600 text-white active:scale-95"
          }`}
        >
          {copied ? "✅ コピーしました！" : "📋 テキストをコピー"}
        </button>
        {isDemo && <CommunityKitButton content={content} />}
      </div>
    </div>
  );
}
