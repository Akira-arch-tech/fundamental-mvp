import type { Metadata } from "next";
import Link from "next/link";
import { InquiryForm } from "@/components/landing/InquiryForm";

export const metadata: Metadata = {
  title: "FUNDAMENTAL — アクリルオーダーメイド（お見積り）",
  description:
    "推し活・ファングッズ向けアクリルキーホルダー・スタンドのオーダーメイド。FUNDAMENTAL は Design Agent で制作から納品まで伴走します。",
  openGraph: {
    title: "FUNDAMENTAL — アクリル特集",
    description: "オーダーメイドお見積り · 日本語対応",
    locale: "ja_JP",
  },
};

export default function JaLandingPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-10">
      <section className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#e85c22]">
          Custom goods for fans
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          FUNDAMENTAL
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-zinc-600 sm:text-lg">
          ファンの<span className="font-semibold text-zinc-800">FUN</span>を、デザインと製造の知恵で届ける{" "}
          <span className="font-semibold text-zinc-800">Design Agent</span>。
          <br className="hidden sm:inline" />
          アクリル特化のオーダーメイドから、まずはお見積りください。
        </p>
        <p className="mx-auto mt-2 max-w-xl text-sm italic text-zinc-500">
          Where fan joy meets design intelligence.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#inquiry"
            className="inline-flex rounded-full bg-[#e85c22] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#d14f1c]"
          >
            お見積りフォームへ
          </a>
          <a
            href="#acrylic"
            className="inline-flex rounded-full border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-[#e85c22] hover:text-[#e85c22]"
          >
            アクリル特集を見る
          </a>
        </div>
      </section>

      <section id="acrylic" className="mt-20 scroll-mt-24">
        <h2 className="text-xl font-bold text-zinc-900 sm:text-2xl">アクリルオーダーメイド特集</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-600 sm:text-base">
          小ロットから対応可能なアクリル製品。透明板印刷・白インク・台座キットなど、用途に合わせてご提案します。
          生データは{" "}
          <span className="font-medium text-zinc-800">PNG / PDF / AI（アウトライン）</span>{" "}
          を想定。初稿デザインは超合体側の制作支援とも連携可能です。
        </p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "アクリルキーホルダー",
              desc: "推し色フチ・ナスカン・保護フィルムの有無など、イベント配布向けに最適化。",
            },
            {
              title: "アクリルスタンド",
              desc: "厚み・台座形状・二枚組み（背景+前景）など、陳列しやすい仕様をご相談ください。",
            },
            {
              title: "チャーム / バッジ風",
              desc: "小ロットで試作→増産の段階導入。パッケージ同梱やまとめ配送も対応可能です。",
            },
          ].map((card) => (
            <li
              key={card.title}
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-[#e85c22]/40 hover:shadow-md"
            >
              <h3 className="font-semibold text-zinc-900">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">{card.desc}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 p-6 sm:p-8">
        <h3 className="text-lg font-semibold text-zinc-900">ご利用の流れ（最短ルート）</h3>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-zinc-700">
          <li>本ページのフォームから要件を送信（日本語でOK）</li>
          <li>担当が仕様・数量を確認し、メールでお見積り</li>
          <li>合意後にお支払い（Stripe / PayPal 等、個別にご案内）</li>
          <li>国内パートナー工場で製作・検品→発送（追跡番号をご連絡）</li>
        </ol>
        <p className="mt-4 text-xs text-zinc-500">
          ※ 著作権・肖像権はご本人または権利者の許諾がある素材のみ。お問い合わせ時点で利用範囲をご確認ください。
        </p>
      </section>

      <section id="inquiry" className="mt-20 scroll-mt-24">
        <h2 className="text-xl font-bold text-zinc-900 sm:text-2xl">お見積り・お問い合わせ</h2>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600">
          必須項目をご入力のうえ送信してください。自動返信メールは現在用意していない場合がありますが、担当より順次ご連絡します。
        </p>
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <InquiryForm />
        </div>
        <p className="mt-6 text-center text-sm text-zinc-500">
          すでに商品カタログのデモを見たい方は{" "}
          <Link href="/favorite" className="font-medium text-[#e85c22] underline-offset-4 hover:underline">
            デモストア（推し活トップ）
          </Link>
          へ。
        </p>
      </section>
    </main>
  );
}
