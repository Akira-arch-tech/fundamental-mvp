"use client";

import type { QuickReply } from "@/lib/design-agent/types";

interface Props {
  items: QuickReply[];
  onSelect: (value: string) => void;
  disabled?: boolean;
}

export default function QuickReplies({ items, onSelect, disabled }: Props) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {items.map((item) => (
        <button
          key={item.value}
          onClick={() => !disabled && onSelect(item.value)}
          disabled={disabled}
          className="px-3 py-1.5 rounded-full border-2 border-[#06C755] text-[#06C755] text-sm font-medium bg-white hover:bg-[#E8F9EE] active:bg-[#06C755] active:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
