import Link from "next/link";
import { ContactForm } from "@/components/ContactForm";
import { storePath } from "@/lib/storefront-constants";

const products = [
  { name: "アクリルキーホルダー", price: "¥200〜" },
  { name: "アクリルスタンド", price: "¥350〜" },
  { name: "アクリルパネル", price: "¥500〜" },
  { name: "缶バッジ", price: "¥150〜" },
  { name: "ホログラムステッカー", price: "¥100〜" },
  { name: "その他・カスタム", price: "要相談" },
] as const;

const steps = [
  { n: "①", title: "フォームで依頼", desc: "要件を送信" },
  { n: "②", title: "お見積もり送付", desc: "24時間以内" },
  { n: "③", title: "データ入稿・確認", desc: "印前チェック" },
  { n: "④", title: "製造・発送", desc: "追跡番号を通知" },
] as const;

export default function HomePage() {
  return (
    <>
      {/* Nav */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-ink/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <a
            href="#"
            className="text-sm font-extralight tracking-[0.35em] text-white sm:text-base"
          >
            FUNDAMENTAL
          </a>
          <div className="flex items-center gap-5 sm:gap-8">
            <Link
              href={storePath("/favorite")}
              className="text-xs font-medium tracking-widest text-white/70 transition hover:text-gold sm:text-sm"
              title="インタラクティブなストアデモ（推し活トップ）"
            >
              ストアデモ
            </Link>
            <Link
              href="/policies"
              className="text-xs font-medium tracking-widest text-white/70 transition hover:text-gold sm:text-sm"
              title="平台政策与规则 / Platform policies"
            >
              ポリシー
            </Link>
            <a
              href="#contact"
              className="text-xs font-medium tracking-widest text-gold/90 transition hover:text-gold sm:text-sm"
            >
              お問い合わせ
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex min-h-[100svh] flex-col justify-center bg-ink px-4 pb-16 pt-24 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-[clamp(1.75rem,6vw,3.25rem)] font-light leading-tight tracking-[0.08em] text-white">
            推しを、カタチにする。
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed tracking-wide text-white/65 sm:text-base">
            アクリルグッズ・1個から・工場直価格・最短7日
          </p>
          <div className="mt-10 flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center">
            <a
              href="#contact"
              className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-gold bg-gold px-8 py-3 text-sm font-semibold tracking-widest text-ink transition hover:bg-gold/90"
            >
              今すぐ注文する
            </a>
            <a
              href="#products"
              className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-white/25 bg-transparent px-8 py-3 text-sm font-medium tracking-widest text-white transition hover:border-gold hover:text-gold"
            >
              製品を見る
            </a>
          </div>
        </div>
      </section>

      {/* Trust stats */}
      <section className="border-y border-white/10 bg-ink px-4 py-16 sm:px-6">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3 md:gap-4">
          {[
            { stat: "1個〜", label: "最小ロット" },
            { stat: "7日〜", label: "最短納期" },
            { stat: "工場直", label: "中間業者なし" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center justify-center border border-white/10 px-6 py-10 text-center"
            >
              <span className="text-3xl font-light tracking-[0.2em] text-gold sm:text-4xl">{item.stat}</span>
              <span className="mt-3 text-xs tracking-[0.25em] text-white/45">{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Products */}
      <section id="products" className="scroll-mt-20 bg-ink px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-xl font-light tracking-[0.35em] text-white sm:text-2xl">
            対応グッズ一覧
          </h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <article
                key={p.name}
                className="flex flex-col border border-white/10 bg-white/[0.02] p-6 transition hover:border-gold/35"
              >
                <h3 className="text-sm font-medium tracking-wide text-white">{p.name}</h3>
                <p className="mt-4 text-lg font-light tracking-wider text-gold">{p.price}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Flow */}
      <section className="border-t border-white/10 bg-ink px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-xl font-light tracking-[0.35em] text-white sm:text-2xl">
            ご注文の流れ
          </h2>
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
            {steps.map((s) => (
              <div key={s.n} className="relative flex flex-col items-center text-center lg:px-2">
                <span className="text-2xl font-light text-gold">{s.n}</span>
                <h3 className="mt-4 text-sm font-medium tracking-wide text-white">{s.title}</h3>
                <p className="mt-2 text-xs tracking-wider text-white/45">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rules */}
      <section className="border-t border-white/10 bg-ink px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-xl font-light tracking-[0.35em] text-white sm:text-2xl">
            ご利用ルール・免責事項
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-xs leading-relaxed text-white/45">
            お見積もり依頼の前に、以下の内容をご確認ください。
          </p>
          <div className="mt-10 space-y-4">
            <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
              <h3 className="text-sm font-semibold tracking-wide text-gold">送料ルール（中国制作・日本直送）</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/75">
                送料は数量に応じて変動します。MVP段階では、初期基準として
                <span className="font-semibold text-white">「初重 1kg = 70元」</span>
                で計算し、お見積もり時に最終確定します。
              </p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
              <h3 className="text-sm font-semibold tracking-wide text-gold">制作・発送スケジュール</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/75">
                仕様確定後、
                <span className="font-semibold text-white">制作 3〜5 営業日</span>、
                <span className="font-semibold text-white">発送準備 5〜7 営業日</span>が目安です。
                国際配送は物流業者の集荷後
                <span className="font-semibold text-white">5〜7 日</span>程度でお届けします（日本の離島・遠隔地を除く）。
              </p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
              <h3 className="text-sm font-semibold tracking-wide text-gold">著作権・IP に関する責任範囲</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/75">
                入稿画像・素材の著作権および使用許諾の確認は、お客様ご自身の責任でお願いいたします。
                著作権・商標権・肖像権などの権利侵害に関する問題について、FUNDAMENTAL は責任を負いません。
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="scroll-mt-20 border-t border-white/10 bg-ink px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-xl font-light tracking-[0.35em] text-white sm:text-2xl">
            無料でお見積もりする
          </h2>
          <p className="mx-auto mt-4 max-w-md text-center text-xs leading-relaxed text-white/45">
            中国直送・1個から対応。内容確認後、24時間以内にご返信します。
          </p>
          <div className="mt-12">
            <ContactForm />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-ink px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-extralight tracking-[0.35em] text-white">FUNDAMENTAL</p>
          <p className="mt-6 text-[11px] tracking-wider text-white/35">
            © 2025 FUNDAMENTAL. All rights reserved.
          </p>
          <p className="mt-3 text-[10px] tracking-wide text-white/25">
            中国製造・日本向け直送サービス
          </p>
          <p className="mt-5">
            <Link
              href="/policies"
              className="text-[10px] tracking-wider text-white/40 underline-offset-4 transition hover:text-gold hover:underline"
            >
              平台政策与规则 · Platform policies
            </Link>
          </p>
        </div>
      </footer>
    </>
  );
}
