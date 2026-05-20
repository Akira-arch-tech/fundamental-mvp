"use client";

import { useState } from "react";
import {
  DEMO_COPYWRITING,
  DEMO_LINE_ANNOUNCEMENT,
  DEMO_DISCORD_ANNOUNCEMENT,
  DEMO_TWITTER_POSTS,
  DEMO_README,
} from "@/lib/design-agent/demo-content";

interface Props {
  content: string;
}

export default function CommunityKitButton({ content }: Props) {
  const [downloading, setDownloading] = useState(false);

  // Suppress unused import warning — DEMO_COPYWRITING is used as fallback reference
  void DEMO_COPYWRITING;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      zip.file("crowdfunding-copy.txt", content);
      zip.file("line-announcement.txt", DEMO_LINE_ANNOUNCEMENT);
      zip.file("discord-announcement.txt", DEMO_DISCORD_ANNOUNCEMENT);
      zip.file("twitter-post.txt", DEMO_TWITTER_POSTS);
      zip.file("README.txt", DEMO_README);

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "FUNDAMENTAL-Community-Kit.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Community Kit download error:", e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="w-full mt-2 py-2 rounded-xl text-xs font-semibold bg-orange-100 hover:bg-orange-200 text-orange-700 border border-orange-300 transition-all duration-200 active:scale-95 disabled:opacity-60"
    >
      {downloading ? "⏳ 準備中..." : "📦 Community Kit をダウンロード"}
    </button>
  );
}
