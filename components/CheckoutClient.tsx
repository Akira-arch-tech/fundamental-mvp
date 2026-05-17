"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ProductDetail } from "@/lib/types";
import {
  JPY_TO_KRW_DISPLAY,
  storePath,
  type StoreCurrency,
} from "@/lib/storefront-constants";

interface CheckoutClientProps {
  customizationId: string;
  product: ProductDetail;
  displayCurrency: StoreCurrency;
  /** STRIPE_SECRET_KEY があるとき true（Stripe Checkout を出す） */
  stripeEnabled: boolean;
}

interface OrderResult {
  order_id: string;
  order_no: string;
  status: string;
  total_amount: number;
  requestId: string;
}

function formatJpy(n: number) {
  return `¥${n.toLocaleString("ja-JP")}`;
}

function formatKrwRef(n: number) {
  return `₩${Math.round(n * JPY_TO_KRW_DISPLAY).toLocaleString("ko-KR")}`;
}

export function CheckoutClient({
  customizationId,
  product,
  displayCurrency,
  stripeEnabled,
}: CheckoutClientProps) {
  const [qty, setQty] = useState(1);
  const [recipientName, setRecipientName] = useState("Airick Demo");
  const [recipientPhone, setRecipientPhone] = useState("090-0000-0000");
  const [shippingAddress, setShippingAddress] = useState("Tokyo, Chiyoda-ku 1-1-1");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"demo_instant" | "stripe">("demo_instant");
  const [copyrightAgreed, setCopyrightAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<OrderResult | null>(null);

  const shippingFee = useMemo(() => (qty >= 5 ? 0 : 500), [qty]);
  const totalJpy = useMemo(() => qty * product.price_from + shippingFee, [qty, product.price_from, shippingFee]);

  async function onSubmit() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      if (paymentMethod === "stripe") {
        const res = await fetch("/api/stripe/checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customization_id: customizationId,
            product_id: product.product_id,
            qty,
            recipient_name: recipientName,
            recipient_phone: recipientPhone,
            shipping_address: shippingAddress,
            note,
            copyright_acknowledged: copyrightAgreed,
          }),
        });
        const json = (await res.json()) as { url?: string | null; message?: string; code?: string };
        if (!res.ok) {
          throw new Error(json.message ?? json.code ?? "Stripe Checkout を開始できませんでした");
        }
        if (json.url) {
          window.location.href = json.url;
          return;
        }
        throw new Error("Checkout URL が取得できませんでした");
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customization_id: customizationId,
          product_id: product.product_id,
          qty,
          recipient_name: recipientName,
          recipient_phone: recipientPhone,
          shipping_address: shippingAddress,
          note,
          payment_method: "demo_instant",
          copyright_acknowledged: copyrightAgreed,
        }),
      });
      const json = (await res.json()) as OrderResult & { message?: string; code?: string };
      if (!res.ok) {
        throw new Error(json.message ?? json.code ?? "注文に失敗しました");
      }
      setResult(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "注文に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  const payDisabled =
    loading || !copyrightAgreed || (paymentMethod === "stripe" && !stripeEnabled);

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-6 lg:grid-cols-[1fr_340px]">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-bold text-zinc-900">ご注文手続き</h1>
        {displayCurrency === "KRW" ? (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-950">
            ※ 表示価格はKRW換算の参考値です（1JPY ≈ {JPY_TO_KRW_DISPLAY}KRW）。決済はJPYで確定します。
          </p>
        ) : null}

        <div className="mt-4 grid gap-4">
          <fieldset className="rounded-lg border border-zinc-200 p-3">
            <legend className="px-1 text-sm font-medium text-zinc-800">お支払い方法</legend>
            <label className="mt-2 flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="radio"
                name="pay"
                checked={paymentMethod === "demo_instant"}
                onChange={() => setPaymentMethod("demo_instant")}
                className="mt-1"
              />
              <span>
                <span className="font-medium text-zinc-900">テスト決済（即時確定）</span>
                <span className="mt-0.5 block text-xs text-zinc-500">実際の課金は発生しません。動作確認用です。</span>
              </span>
            </label>
            {stripeEnabled ? (
              <label className="mt-2 flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="pay"
                  checked={paymentMethod === "stripe"}
                  onChange={() => setPaymentMethod("stripe")}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium text-zinc-900">Stripe（テスト / 本番キー接続時）</span>
                  <span className="mt-0.5 block text-xs text-zinc-500">
                    JPY・国際カード。Kakao Pay 等の現地ウォレットは別途 Dashboard 有効化 + 通貨設計が必要（調査稿参照）。
                  </span>
                </span>
              </label>
            ) : (
              <p className="mt-2 rounded-md bg-zinc-100 px-2 py-2 text-xs text-zinc-600">
                Stripe テスト：リポジトリの <code className="font-mono">.env</code> に{" "}
                <code className="font-mono">STRIPE_SECRET_KEY</code> を設定すると上記の「Stripe」支払いが表示されます。
              </p>
            )}
          </fieldset>

          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 text-sm">
            <input
              type="checkbox"
              checked={copyrightAgreed}
              onChange={(e) => setCopyrightAgreed(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-zinc-800">
              <span className="font-medium">内容・著作権・肖像権の申告</span>（PRD §8.1）
              <span className="mt-1 block text-xs leading-relaxed text-zinc-600">
                アップロード画像は自己所有または使用許諾済みであること、第三者の権利を侵害しないことを確認します。
              </span>
            </span>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-700">数量</span>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-[#e85c22]"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-700">受取人名</span>
            <input
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-[#e85c22]"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-700">電話番号</span>
            <input
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-[#e85c22]"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-700">配送先住所</span>
            <textarea
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-[#e85c22]"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-700">備考（任意）</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-[#e85c22]"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={payDisabled}
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-full bg-[#e85c22] text-sm font-bold text-white hover:bg-[#d14f1b] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? paymentMethod === "stripe"
              ? "Stripe へ遷移中..."
              : "注文送信中..."
            : paymentMethod === "stripe"
              ? "Stripe で支払う"
              : "注文を確定する"}
        </button>

        {error ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}

        {result ? (
          <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
            <p>
              注文番号：<span className="font-mono">{result.order_no}</span>
            </p>
            <p className="mt-1">ステータス：{result.status}</p>
            <p className="mt-1">お支払い合計（JPY）：{formatJpy(result.total_amount)}</p>
            {displayCurrency === "KRW" ? (
              <p className="mt-0.5 text-zinc-600">参考 KRW：{formatKrwRef(result.total_amount)}</p>
            ) : null}
            <p className="mt-1 font-mono text-[10px] text-zinc-500">requestId: {result.requestId}</p>
            <Link
              href={storePath(`/orders/${result.order_id}`)}
              className="mt-2 inline-block text-sm font-medium text-[#e85c22] underline"
            >
              ご注文の進捗を見る →
            </Link>
          </div>
        ) : null}

        <Link
          href={storePath(`/customize/${product.product_id}`)}
          className="mt-4 inline-block text-sm text-[#e85c22] hover:underline"
        >
          ← デザイン編集に戻る
        </Link>
      </section>

      <aside className="h-fit rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-zinc-800">注文内容</h2>
        <p className="mt-2 text-sm text-zinc-700">{product.title}</p>
        <div className="mt-3 space-y-1 text-sm text-zinc-600">
          <p>
            単価：{formatJpy(product.price_from)}
            {displayCurrency === "KRW" ? (
              <span className="ml-2 text-xs text-zinc-500">（{formatKrwRef(product.price_from)}）</span>
            ) : null}
          </p>
          <p>数量：{qty}</p>
          <p>
            送料：{formatJpy(shippingFee)}
            {displayCurrency === "KRW" ? (
              <span className="ml-2 text-xs text-zinc-500">（{formatKrwRef(shippingFee)}）</span>
            ) : null}
          </p>
        </div>
        <p className="mt-4 border-t border-zinc-100 pt-3 text-lg font-bold text-[#e85c22]">
          合計：{formatJpy(totalJpy)}
          {displayCurrency === "KRW" ? (
            <span className="mt-1 block text-sm font-normal text-zinc-600">
              参考 {formatKrwRef(totalJpy)}
            </span>
          ) : null}
        </p>
      </aside>
    </div>
  );
}
