"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Summary = {
  total_orders: number;
  by_status: Record<string, number>;
  sku_sales: { product_id: string; title: string; qty_sold: number; order_count: number }[];
  artwork_review_queue_estimate: number;
};

export default function BackofficeAnalyticsPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/backoffice/analytics/summary", { credentials: "include" });
      const j = await res.json();
      if (!res.ok) {
        if (!cancelled) setErr(j.message ?? "読み込みに失敗しました");
        return;
      }
      if (!cancelled) setData(j as Summary);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (err) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {err}{" "}
        <Link href="/b/login" className="font-semibold underline">
          ログイン
        </Link>
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-amber-900/70">読み込み中…</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-amber-950">报表 · SKU 与订单（PRD §8.6 演示）</h1>
        <p className="mt-1 text-sm text-amber-900/75">
          订单状态分布、按商品聚合销量（演示仓最多拉取 500 条）；审图队列以「reviewing」状态订单数近似。
        </p>
      </div>
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-amber-200/80 bg-white/90 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-800/70">总订单</p>
          <p className="mt-1 text-2xl font-semibold text-amber-950">{data.total_orders}</p>
        </div>
        <div className="rounded-xl border border-amber-200/80 bg-white/90 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-800/70">审图队列（估算）</p>
          <p className="mt-1 text-2xl font-semibold text-amber-950">{data.artwork_review_queue_estimate}</p>
        </div>
        <div className="rounded-xl border border-amber-200/80 bg-white/90 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-800/70">状态种类</p>
          <p className="mt-1 text-2xl font-semibold text-amber-950">{Object.keys(data.by_status).length}</p>
        </div>
      </section>
      <section>
        <h2 className="text-lg font-semibold text-amber-950">订单状态</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {Object.entries(data.by_status).map(([k, v]) => (
            <li key={k} className="flex justify-between rounded-md border border-amber-100 bg-amber-50/50 px-3 py-2">
              <span className="font-mono text-amber-900">{k}</span>
              <span className="font-semibold text-amber-950">{v}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-lg font-semibold text-amber-950">SKU 销量（按件数）</h2>
        <div className="mt-2 overflow-x-auto rounded-xl border border-amber-200/80 bg-white/90">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-amber-200 bg-amber-50/80 text-xs uppercase text-amber-900/70">
              <tr>
                <th className="px-3 py-2">商品</th>
                <th className="px-3 py-2">product_id</th>
                <th className="px-3 py-2">件数</th>
                <th className="px-3 py-2">订单数</th>
              </tr>
            </thead>
            <tbody>
              {data.sku_sales.map((r) => (
                <tr key={r.product_id} className="border-b border-amber-100 last:border-0">
                  <td className="px-3 py-2 text-amber-950">{r.title}</td>
                  <td className="px-3 py-2 font-mono text-xs text-amber-900/80">{r.product_id}</td>
                  <td className="px-3 py-2 font-semibold">{r.qty_sold}</td>
                  <td className="px-3 py-2">{r.order_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
