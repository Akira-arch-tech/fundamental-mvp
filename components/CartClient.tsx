"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { storePath } from "@/lib/storefront-constants";
import type { CartItemRecord } from "@/lib/types";

export function CartClient({ initialItems }: { initialItems: CartItemRecord[] }) {
  const [items, setItems] = useState(initialItems);
  const [loadingId, setLoadingId] = useState<string>("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [copyrightAgreed, setCopyrightAgreed] = useState(false);
  const [submittingBatch, setSubmittingBatch] = useState(false);
  const [batchResult, setBatchResult] = useState<{
    order_count: number;
    total_amount: number;
    orders: { order_id: string; order_no: string; total_amount: number; status: string }[];
  } | null>(null);
  const [batchError, setBatchError] = useState("");

  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + item.line_total, 0),
    [items],
  );

  async function changeQty(itemId: string, qty: number) {
    setLoadingId(itemId);
    try {
      const res = await fetch(`/api/cart/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qty }),
      });
      if (!res.ok) return;
      const json = (await res.json()) as { item: CartItemRecord };
      setItems((prev) => prev.map((it) => (it.cart_item_id === itemId ? json.item : it)));
    } finally {
      setLoadingId("");
    }
  }

  async function removeItem(itemId: string) {
    setLoadingId(itemId);
    try {
      const res = await fetch(`/api/cart/${itemId}`, { method: "DELETE" });
      if (!res.ok) return;
      setItems((prev) => prev.filter((it) => it.cart_item_id !== itemId));
    } finally {
      setLoadingId("");
    }
  }

  async function submitBatchOrder() {
    setSubmittingBatch(true);
    setBatchError("");
    setBatchResult(null);
    try {
      const res = await fetch("/api/orders/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_name: recipientName,
          recipient_phone: recipientPhone,
          shipping_address: shippingAddress,
          note: "batch checkout from cart",
          payment_method: "demo_instant",
          copyright_acknowledged: copyrightAgreed,
        }),
      });
      const json = (await res.json()) as
        | {
            order_count: number;
            total_amount: number;
            orders: { order_id: string; order_no: string; total_amount: number; status: string }[];
          }
        | { message?: string };
      if (!res.ok) {
        throw new Error("message" in json ? (json.message ?? "batch order failed") : "batch order failed");
      }
      if ("order_count" in json) {
        setBatchResult(json);
        setItems([]);
      }
    } catch (e) {
      setBatchError(e instanceof Error ? e.message : "batch order failed");
    } finally {
      setSubmittingBatch(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold text-zinc-900">カート</h1>
        {batchResult ? (
          <div className="mt-3 rounded border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
            <p>{batchResult.order_count} 件のご注文を作成しました</p>
            <p>合計金額：¥{batchResult.total_amount.toLocaleString("ja-JP")}</p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-zinc-600">カートは空です。商品を追加してください。</p>
        )}
        <Link href={storePath("/products")} className="mt-4 inline-block text-sm text-[#e85c22] hover:underline">
          商品一覧へ
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1fr_300px]">
      <section className="space-y-3">
        <h1 className="text-2xl font-bold text-zinc-900">カート</h1>
        {items.map((item) => (
          <article
            key={item.cart_item_id}
            className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <p className="text-sm font-semibold text-zinc-900">{item.product_title}</p>
            <p className="mt-1 text-xs text-zinc-500">
              SKU: {item.source_sku_code ?? "未設定"} · 追加元：
              {item.added_from === "customize" ? "デザインエディタ" : "商品ページ"}
            </p>
            {item.selected_specs.length > 0 ? (
              <p className="mt-1 text-xs text-zinc-500">
                {item.selected_specs.map((s) => `${s.spec_label}:${s.value_label}`).join(" / ")}
              </p>
            ) : null}
            {item.customization_id ? (
              <p className="mt-1 text-xs font-medium text-emerald-600">✓ カスタムデザイン済み</p>
            ) : null}
            <div className="mt-3 flex items-center gap-3">
              <input
                type="number"
                min={1}
                value={item.qty}
                disabled={loadingId === item.cart_item_id}
                onChange={(e) => changeQty(item.cart_item_id, Number(e.target.value))}
                className="w-24 rounded border border-zinc-300 px-2 py-1 text-sm"
              />
              <p className="text-sm text-zinc-700">
                ¥{item.unit_price.toLocaleString("ja-JP")} × {item.qty} ={" "}
                <span className="font-semibold text-[#e85c22]">
                  ¥{item.line_total.toLocaleString("ja-JP")}
                </span>
              </p>
              <button
                type="button"
                disabled={loadingId === item.cart_item_id}
                onClick={() => removeItem(item.cart_item_id)}
                className="ml-auto text-xs text-red-600 hover:underline disabled:opacity-50"
              >
                削除
              </button>
            </div>
          </article>
        ))}
      </section>
      <aside className="h-fit rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-zinc-800">合計</h2>
        <p className="mt-3 text-xl font-bold text-[#e85c22]">
          ¥{totalAmount.toLocaleString("ja-JP")}
        </p>
        <div className="mt-4 space-y-2">
          <label className="block">
            <span className="mb-1 block text-xs text-zinc-600">お届け先 氏名 <span className="text-red-500">*</span></span>
            <input
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="例：山田 花子"
              className="w-full rounded border border-zinc-300 px-2 py-1 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-zinc-600">電話番号</span>
            <input
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              placeholder="例：090-1234-5678"
              className="w-full rounded border border-zinc-300 px-2 py-1 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-zinc-600">住所 <span className="text-red-500">*</span></span>
            <textarea
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              rows={2}
              placeholder="例：東京都千代田区〇〇1-1-1"
              className="w-full rounded border border-zinc-300 px-2 py-1 text-sm"
            />
          </label>
          <label className="flex cursor-pointer items-start gap-2 text-xs text-zinc-700">
            <input
              type="checkbox"
              checked={copyrightAgreed}
              onChange={(e) => setCopyrightAgreed(e.target.checked)}
              className="mt-0.5"
            />
            <span>著作権・肖像権の申告に同意します</span>
          </label>
          <button
            type="button"
            onClick={submitBatchOrder}
            disabled={submittingBatch || !copyrightAgreed || !recipientName.trim() || !shippingAddress.trim()}
            className="inline-flex h-10 w-full items-center justify-center rounded-full bg-[#e85c22] text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submittingBatch ? "送信中…" : "カート内の全行をまとめて注文"}
          </button>
        </div>
        {batchError ? <p className="mt-2 text-xs text-red-600">{batchError}</p> : null}
        {batchResult ? (
          <div className="mt-2 rounded border border-zinc-200 bg-zinc-50 p-2 text-xs text-zinc-700">
            <p>{batchResult.order_count} 件のご注文を作成しました</p>
            <p>合計金額：¥{batchResult.total_amount.toLocaleString("ja-JP")}</p>
            <ul className="mt-1 space-y-1">
              {batchResult.orders.map((o) => (
                <li key={o.order_id}>
                  <Link href={storePath(`/orders/${o.order_id}`)} className="text-[#e85c22] underline">
                    {o.order_no}
                  </Link>{" "}
                  （{o.status}）
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="mt-2 text-xs text-zinc-500">
          大口・小口ともにカートに集約し、行ごとにデザイン確定後にご注文いただけます。
        </p>
      </aside>
    </div>
  );
}
