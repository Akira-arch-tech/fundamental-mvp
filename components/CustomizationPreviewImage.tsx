"use client";

import { useState } from "react";

interface Props {
  customizationId: string;
  alt: string;
  className?: string;
}

/** 定制设计缩略图（`/api/customizations/[id]/thumbnail`） */
export function CustomizationPreviewImage({ customizationId, alt, className }: Props) {
  const [failed, setFailed] = useState(false);
  const src = `/api/customizations/${encodeURIComponent(customizationId)}/thumbnail`;

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 text-xs text-zinc-500 ${className ?? ""}`}
      >
        プレビューなし
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- thumbnail API returns dynamic image/svg or png
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
