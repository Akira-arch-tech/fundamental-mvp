"use client";

/**
 * CheckoutDrawer — 保存デザイン後に右からスライドインする決済サイドバー。
 * 編集ページを離れずにそのまま注文まで完結できる。
 */

import { useState } from "react";
import Link from "next/link";
import { CustomizationPreviewImage } from "@/components/CustomizationPreviewImage";
import { storePath } from "@/lib/storefront-constants";
import type { ProductDetail } from "@/lib/types";

interface SavedResult {
  customization_id: string;
  dpi_check_result: {
    status: string;
    estimated_dpi: number;
    min_recommended_dpi: number;
    message: string;
  };
  warnings: string[];
}

interface OrderResult {
  order_id: string;
  order_no: string;
  total_amount: number;
}

interface Props {
  saved: SavedResult;
  product: ProductDetail;
  qty: number;
  stripeEnabled: boolean;
  onClose: () => void;
}

/** pricing_rules から qty に対応する単価を取得 */
function getUnitPrice(product: ProductDetail, qty: number): number {
  const sorted = [...product.pricing_rules].sort((a, b) => b.min_qty - a.min_qty);
  return sorted.find((r) => qty >= r.min_qty)?.unit_price ?? product.price_from;
}

export function CheckoutDrawer({ saved, product, qty, stripeEnabled, onClose }: Props) {
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [note, setNote] = useState("");
  const [copyrightAgreed, setCopyrightAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null);

  const unitPrice = getUnitPrice(product, qty);
  const totalAmount = unitPrice * qty;
  const canSubmit = !loading && copyrightAgreed && recipientName.trim() !== "" && shippingAddress.trim() !== "";

  async function submitDemoOrder() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customization_id: saved.customization_id,
          product_id: product.product_id,
          qty,
          recipient_name: recipientName,
          recipient_phone: recipientPhone.trim() || "未設定",
          shipping_address: shippingAddress,
          note: note.trim() || undefined,
          payment_method: "demo_instant",
          copyright_acknowledged: true,
        }),
      });
      let json: Partial<OrderResult> & { message?: string } = {};
      try {
        json = await res.json();
      } catch {
        /* non-JSON response */
      }
      if (!res.ok) throw new Error(json.message ?? `注文に失敗しました (HTTP ${res.status})`);
      setOrderResult(json as OrderResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "注文に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function startStripeCheckout() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customization_id: saved.customization_id,
          product_id: product.product_id,
          qty,
          recipient_name: recipientName,
          recipient_phone: recipientPhone.trim() || "未設定",
          shipping_address: shippingAddress,
          note: note.trim() || undefined,
          copyright_acknowledged: true,
        }),
      });
      let json: { url?: string; message?: string } = {};
      try {
        json = await res.json();
      } catch {
        /* non-JSON */
      }
      if (!res.ok) throw new Error(json.message ?? "Stripe Checkout を開始できませんでした");
      if (json.url) {
        window.location.href = json.url;
      } else {
        throw new Error("Checkout URL が取得できませんでした");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Stripe Checkout に失敗しました");
      setLoading(false);
    }
  }

  return (
    /* オーバーレイ — クリックで閉じる */
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-label="注文手続き"
    >
      {/* ドロワーパネル */}
      <div
        className="relative flex h-full w-full max-w-[480px] flex-col overflow-y-auto bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-zinc-900">ご注文手続き</h2>
            <p className="mt-0.5 text-xs text-zinc-500 truncate max-w-[300px]">{product.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-3 flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {orderResult ? (
            /* 注文完了画面 */
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <span className="text-5xl">🎉</span>
              <div>
                <p className="text-lg font-bold text-zinc-900">ご注文ありがとうございます！</p>
                <p className="mt-1 text-sm text-zinc-600">
                  注文番号：<span className="font-mono font-semibold">{orderResult.order_no}</span>
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  合計：<span className="font-semibold text-[#e85c22]">¥{orderResult.total_amount.toLocaleString("ja-JP")}</span>
                </p>
              </div>
              <Link
                href={storePath(`/orders/${orderResult.order_id}`)}
                className="mt-2 inline-flex h-10 items-center rounded-full bg-[#e85c22] px-6 text-sm font-bold text-white hover:bg-[#d14f1b]"
              >
                注文詳細を確認 →
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="text-sm text-zinc-500 underline hover:text-zinc-700"
              >
                デザインページに戻る
              </button>
            </div>
          ) : (
            /* 注文フォーム */
            <div className="space-y-4">
              <CustomizationPreviewImage
                customizationId={saved.customization_id}
                alt={`${product.title} のデザインプレビュー`}
                className="mx-auto h-40 w-full max-w-[200px] rounded-xl border border-zinc-200 object-contain bg-zinc-50"
              />
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">単価</span>
                  <span className="font-medium">¥{unitPrice.toLocaleString("ja-JP")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">数量</span>
                  <span className="font-medium">{qty}点</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-zinc-200 pt-2">
                  <span className="font-bold text-zinc-800">合計</span>
                  <span className="text-base font-bold text-[#e85c22]">
                    ¥{totalAmount.toLocaleString("ja-JP")}
                  </span>
                </div>
              </div>
              <Link
                href={storePath(
                  `/checkout?customization_id=${encodeURIComponent(saved.customization_id)}`,
                )}
                className="block text-center text-xs text-[#e85c22] underline hover:text-[#d14f1b]"
              >
                別ページで決済する
              </Link>

              {/* DPI警告 */}
              {saved.warnings.length > 0 && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                  ⚠️ {saved.warnings[0]}
                </div>
              )}

              {/* 著作権同意 */}
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-zinc-200 bg-white p-3 text-sm">
                <input
                  type="checkbox"
                  checked={copyrightAgreed}
                  onChange={(e) => setCopyrightAgreed(e.target.checked)}
                  className="mt-0.5 accent-[#e85c22]"
                />
                <span className="text-zinc-700">
                  <span className="font-medium">著作権・肖像権の申告に同意します</span>
                  <span className="mt-1 block text-xs leading-relaxed text-zinc-500">
                    アップロード画像は自己所有または使用許諾済みであり、第三者の権利を侵害しないことを確認します。
                  </span>
                </span>
              </label>

              {/* お届け先フォーム */}
              <fieldset className="space-y-3 rounded-xl border border-zinc-200 p-4">
                <legend className="px-1 text-sm font-semibold text-zinc-800">お届け先</legend>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-zinc-600">
                    氏名 <span className="text-red-500">*</span>
                  </span>
                  <input
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="例：山田 花子"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-[#e85c22]"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-zinc-600">電話番号</span>
                  <input
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    placeholder="例：090-1234-5678"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-[#e85c22]"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-zinc-600">
                    配送先住所 <span className="text-red-500">*</span>
                  </span>
                  <textarea
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="例：東京都千代田区〇〇1-1-1"
                    rows={2}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-[#e85c22]"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-zinc-600">備考（任意）</span>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="ご要望などあればご記入ください"
                    rows={2}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-[#e85c22]"
                  />
                </label>
              </fieldset>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
              )}
            </div>
          )}
        </div>

        {/* フッター — 支払いボタン */}
        {!orderResult && (
          <div className="border-t border-zinc-200 bg-white px-5 py-4 space-y-2">
            <button
              type="button"
              onClick={() => void submitDemoOrder()}
              disabled={!canSubmit}
              className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#e85c22] text-sm font-bold text-white hover:bg-[#d14f1b] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "処理中…" : "テスト決済で注文する"}
            </button>
            {stripeEnabled && (
              <button
                type="button"
                onClick={() => void startStripeCheckout()}
                disabled={!canSubmit}
                className="inline-flex h-11 w-full items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-sm font-bold text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "処理中…" : "💳 Stripe で支払う"}
              </button>
            )}
            <p className="text-center text-xs text-zinc-400">
              ※ テスト決済は実際の課金が発生しません
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
