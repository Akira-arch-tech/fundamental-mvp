"use client";

import Link from "next/link";
import type { CheckoutLinkData } from "@/lib/design-agent/types";

interface Props {
  data: CheckoutLinkData;
}

export default function CheckoutLinkCard({ data }: Props) {
  const href = data.url.startsWith("http") ? data.url : data.url;

  return (
    <div className="rounded-2xl border border-indigo-200 bg-white shadow-sm overflow-hidden p-3 space-y-2">
      <p className="text-xs font-semibold text-indigo-700">🛒 チェックアウトプレビュー</p>
      <p className="text-[10px] text-gray-500 break-all">ID: {data.customization_id}</p>
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full text-center py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
      >
        {data.label}
      </Link>
    </div>
  );
}
