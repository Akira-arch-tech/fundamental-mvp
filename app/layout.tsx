import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FUNDAMENTAL — 推しを、カタチに。",
  description:
    "アクリルグッズ・1個から・工場直価格・最短7日。中国直送、日本向けオーダーメイド応援グッズ。ストアデモは /shop をご利用ください。",
  openGraph: {
    title: "FUNDAMENTAL",
    description: "アクリルグッズ・1個から・工場直価格・最短7日",
    locale: "ja_JP",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
