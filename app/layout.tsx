import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FUNDAMENTAL — カスタムグッズストア",
  description:
    "推し活向けカスタムグッズストアのデモサイトです。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-zinc-50 antialiased text-zinc-900">{children}</body>
    </html>
  );
}
