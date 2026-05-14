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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&family=M+PLUS+Rounded+1c:wght@400;700&family=DotGothic16&family=Kosugi+Maru&family=Yusei+Magic&family=Zen+Antique+Soft&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
