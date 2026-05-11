"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { JPY_TO_KRW_DISPLAY, type StoreCurrency } from "@/lib/storefront-constants";

type OrderResult = {
  order_id: string;
  order_no: string;
  status: string;
  total_amount: number;
  requestId: string;
};

function formatJpy(n: number) {
  return `¥${n.toLocaleString("ja-JP")}`;
}

function formatKrwRef(n: number) {
  return `₩${Math.round(n * JPY_TO_KRW_DISPLAY).toLocaleString("ko-KR")}`;
}

export function CheckoutSuccessClient({
  sessionId,
  displayCurrency,
}: {
  sessionId: string;
  displayCurrency: StoreCurrency;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState<OrderResult | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      setError("session_id がありません");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/stripe/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
        });
        const json = (await res.json()) as OrderResult & { message?: string; code?: string };
        if (!res.ok) {
          throw new Error(json.message ?? json.code ?? "注文の確定に失敗しました");
        }
        if (!cancelled) {
          setResult(json);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "エラーが発生しました");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-red-600">URL が無効です。</p>
        <Link href="/products" className="mt-4 inline-block text-[#e85c22] hover:underline">
          商品一覧へ
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-zinc-600">
        決済結果を確認しています…
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-red-600">{error}</p>
        <p className="mt-2 text-xs text-zinc-500">すでに注文が作成済みの場合は、注文一覧からご確認ください。</p>
        <Link href="/orders" className="mt-4 inline-block text-sm text-[#e85c22] hover:underline">
          注文を検索 →
        </Link>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-xl font-bold text-zinc-900">お支払い完了</h1>
      <p className="mt-2 text-sm text-zinc-600">注文を受け付けました。</p>
      <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-800">
        <p>
          注文番号：<span className="font-mono">{result.order_no}</span>
        </p>
        <p className="mt-1">ステータス：{result.status}</p>
        <p className="mt-1">合計（円）：{formatJpy(result.total_amount)}</p>
        {displayCurrency === "KRW" ? (
          <p className="mt-0.5 text-zinc-600">参考（ウォン）：{formatKrwRef(result.total_amount)}</p>
        ) : null}
        <p className="mt-1 font-mono text-[10px] text-zinc-500">問い合わせID: {result.requestId}</p>
      </div>
      <Link
        href={`/orders/${result.order_id}`}
        className="mt-6 inline-block rounded-full bg-[#e85c22] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#d14f1b]"
      >
        注文の進捗を見る
      </Link>
    </div>
  );
}
