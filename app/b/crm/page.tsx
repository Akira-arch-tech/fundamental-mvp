"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { integrationEventZh } from "@/lib/backoffice-ui-labels";

type Row = {
  id: string;
  order_id: string | null;
  order_no: string;
  exception_request_id: string | null;
  event_type: string;
  summary: string;
  request_id: string | null;
  created_at: string;
};

const boCard = "rounded-2xl border border-amber-100 bg-white p-4 shadow-sm shadow-amber-950/5";
const boInput =
  "mt-1 block rounded-lg border border-amber-200/80 bg-white px-2 py-1.5 text-sm outline-none ring-amber-500/15 focus:border-amber-400 focus:ring-2";
const boPrimaryBtn =
  "rounded-full bg-[#e85c22] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#d14f1b]";

/** CRM 同步时间线：只读；数据来自 GET /api/backoffice/crm-timeline（与对接任务区分：此处偏「业务侧可见记录」） */
export default function BackofficeCrmTimelinePage() {
  const router = useRouter();
  const [items, setItems] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [appliedOrderNo, setAppliedOrderNo] = useState("");

  const load = useCallback(async () => {
    setError("");
    const params = new URLSearchParams({ limit: "80" });
    if (appliedOrderNo.trim()) params.set("order_no", appliedOrderNo.trim());
    const res = await fetch(`/api/backoffice/crm-timeline?${params}`, { credentials: "include" });
    if (res.status === 401) {
      router.push("/b/login");
      return;
    }
    const json = (await res.json()) as { items?: Row[]; message?: string };
    if (!res.ok) {
      setError(json.message ?? "加载失败");
      setItems([]);
      return;
    }
    setItems(json.items ?? []);
  }, [appliedOrderNo, router]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800/70">CRM</p>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">客服与异常同步记录</h1>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-600">
            展示写入本地 CRM 时间线的条目（异常审批同步等）。技术出站任务见「对接任务」页。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/b/orders"
            className="rounded-full border border-amber-200/90 bg-white px-3 py-1.5 text-sm font-medium text-[#c2410c] shadow-sm transition hover:border-amber-300"
          >
            订单工作台
          </Link>
          <Link
            href="/b/integrations"
            className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-800 transition hover:bg-zinc-100"
          >
            对接任务
          </Link>
        </div>
      </div>

      <div className={`mt-5 flex flex-wrap items-end gap-2 ${boCard}`}>
        <label className="text-xs font-medium text-zinc-700">
          订单号（可选，模糊包含）
          <input
            value={orderNo}
            onChange={(e) => setOrderNo(e.target.value)}
            className={`${boInput} min-w-[180px]`}
            placeholder="留空则看最近记录"
          />
        </label>
        <button
          type="button"
          onClick={() => setAppliedOrderNo(orderNo)}
          className={boPrimaryBtn}
        >
          筛选
        </button>
        <button
          type="button"
          onClick={() => {
            setOrderNo("");
            setAppliedOrderNo("");
          }}
          className="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100"
        >
          重置
        </button>
      </div>

      {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}

      <div className={`mt-5 overflow-x-auto ${boCard} p-0`}>
        <table className="min-w-full text-left text-xs text-zinc-700">
          <thead className="border-b border-amber-100 bg-amber-50/60 text-[11px] font-semibold uppercase tracking-wide text-amber-900/60">
            <tr>
              <th className="px-3 py-2">时间</th>
              <th className="px-3 py-2">订单号</th>
              <th className="px-3 py-2">事件</th>
              <th className="px-3 py-2">摘要</th>
              <th className="px-3 py-2">requestId</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-zinc-400">
                  暂无记录（异常审批通过后会写入）
                </td>
              </tr>
            ) : (
              items.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-amber-50/80 transition hover:bg-amber-50/40"
                >
                  <td className="whitespace-nowrap px-3 py-2.5 text-zinc-500">
                    {new Date(r.created_at).toLocaleString("zh-CN")}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-zinc-800">{r.order_no}</td>
                  <td className="px-3 py-2.5">
                    <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-900 ring-1 ring-violet-200">
                      {integrationEventZh(r.event_type)}
                    </span>
                  </td>
                  <td className="max-w-[280px] px-3 py-2.5 text-zinc-700">{r.summary}</td>
                  <td className="max-w-[120px] truncate px-3 py-2.5 font-mono text-[10px] text-zinc-400">
                    {r.request_id ?? "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    {r.order_id ? (
                      <Link
                        href={`/b/orders/o/${r.order_id}`}
                        className="font-medium text-[#c2410c] underline-offset-2 hover:underline"
                      >
                        内部订单
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
