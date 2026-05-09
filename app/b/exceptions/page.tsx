"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  exceptionStatusBadgeClass,
  exceptionStatusZh,
  exceptionTypeZh,
} from "@/lib/backoffice-ui-labels";

type ExceptionRow = {
  exception_request_id: string;
  order_id: string;
  order_no: string;
  type: string;
  status: string;
  reason: string;
  created_at: string;
};

const boCard = "rounded-2xl border border-amber-100 bg-white p-4 shadow-sm shadow-amber-950/5";
const boInput = "mt-1 block rounded-lg border border-amber-200/80 bg-white px-2 py-1.5 text-sm outline-none ring-amber-500/15 focus:border-amber-400 focus:ring-2";
const boPrimaryBtn =
  "rounded-full bg-[#e85c22] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#d14f1b] disabled:opacity-50";

export default function BackofficeExceptionsPage() {
  const router = useRouter();
  const [items, setItems] = useState<ExceptionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [appliedOrderNo, setAppliedOrderNo] = useState("");
  const [error, setError] = useState("");
  /** 默认「待处理」= submitted + processing；与单状态筛选互斥 */
  const [queueMode, setQueueMode] = useState<"pending" | "all">("pending");

  const load = useCallback(async () => {
    setError("");
    const params = new URLSearchParams({ page: String(page), page_size: "20" });
    if (queueMode === "pending") {
      params.set("pending_queue", "1");
    } else if (status) {
      params.set("status", status);
    }
    if (type) params.set("type", type);
    if (appliedOrderNo.trim()) params.set("order_no", appliedOrderNo.trim());
    const res = await fetch(`/api/backoffice/exceptions?${params}`, { credentials: "include" });
    if (res.status === 401) {
      router.push("/b/login");
      return;
    }
    const json = (await res.json()) as { items?: ExceptionRow[]; total?: number; message?: string };
    if (!res.ok) {
      setError(json.message ?? "加载失败");
      return;
    }
    setItems(json.items ?? []);
    setTotal(json.total ?? 0);
  }, [page, status, type, appliedOrderNo, router, queueMode]);

  useEffect(() => {
    void load();
  }, [load]);

  function resetFilters() {
    setQueueMode("pending");
    setStatus("");
    setType("");
    setOrderNo("");
    setAppliedOrderNo("");
    setPage(1);
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800/70">异常</p>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">异常中心</h1>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-zinc-600">
            默认只看待处理队列（已提交 + 处理中）；可切到「全部」再按状态筛选；进入订单内部页处理审批与 ERP 指令。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/b"
            className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
          >
            ← 概览
          </Link>
          <Link
            href="/b/orders"
            className="rounded-full border border-amber-200/90 bg-white px-3 py-1.5 text-sm font-medium text-[#c2410c] shadow-sm transition hover:border-amber-300"
          >
            ← 订单工作台
          </Link>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full border border-amber-100 bg-amber-50/50 p-1 shadow-sm shadow-amber-950/5">
          <button
            type="button"
            onClick={() => {
              setQueueMode("pending");
              setStatus("");
              setPage(1);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              queueMode === "pending"
                ? "bg-white text-amber-950 shadow-sm ring-1 ring-amber-200/80"
                : "text-amber-900/70 hover:text-amber-950"
            }`}
          >
            待处理队列
          </button>
          <button
            type="button"
            onClick={() => {
              setQueueMode("all");
              setPage(1);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              queueMode === "all"
                ? "bg-white text-amber-950 shadow-sm ring-1 ring-amber-200/80"
                : "text-amber-900/70 hover:text-amber-950"
            }`}
          >
            全部
          </button>
        </div>
        <p className="text-xs text-zinc-500">
          {queueMode === "pending"
            ? "含「已提交」「处理中」；下方状态筛选在「全部」模式下可用。"
            : "可按下方状态精确筛选。"}
        </p>
      </div>

      <div className={`mt-4 flex flex-wrap items-end gap-2 ${boCard}`}>
        <label className="text-xs font-medium text-zinc-700">
          状态
          <select
            value={queueMode === "pending" ? "" : status}
            disabled={queueMode === "pending"}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className={boInput}
          >
            <option value="">全部</option>
            <option value="submitted">{exceptionStatusZh("submitted")}</option>
            <option value="processing">{exceptionStatusZh("processing")}</option>
            <option value="approved">{exceptionStatusZh("approved")}</option>
            <option value="rejected">{exceptionStatusZh("rejected")}</option>
          </select>
        </label>
        <label className="text-xs font-medium text-zinc-700">
          类型
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            className={boInput}
          >
            <option value="">全部</option>
            <option value="redesign">{exceptionTypeZh("redesign")}</option>
            <option value="reship">{exceptionTypeZh("reship")}</option>
            <option value="refund">{exceptionTypeZh("refund")}</option>
          </select>
        </label>
        <label className="text-xs font-medium text-zinc-700">
          订单号
          <input
            value={orderNo}
            onChange={(e) => setOrderNo(e.target.value)}
            className={`${boInput} min-w-[160px]`}
            placeholder="模糊匹配"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setAppliedOrderNo(orderNo);
            setPage(1);
          }}
          className={boPrimaryBtn}
        >
          搜索
        </button>
        <button
          type="button"
          onClick={resetFilters}
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
              <th className="px-3 py-2">异常 ID</th>
              <th className="px-3 py-2">订单号</th>
              <th className="px-3 py-2">类型</th>
              <th className="px-3 py-2">状态</th>
              <th className="px-3 py-2">原因摘要</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-zinc-400">
                  暂无数据
                </td>
              </tr>
            ) : (
              items.map((r) => (
                <tr
                  key={r.exception_request_id}
                  className="border-b border-amber-50/80 transition hover:bg-amber-50/40"
                >
                  <td className="px-3 py-2.5 font-mono text-[10px] text-zinc-500">{r.exception_request_id}</td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-zinc-800">{r.order_no}</td>
                  <td className="px-3 py-2.5">
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-800 ring-1 ring-zinc-200">
                      {exceptionTypeZh(r.type)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${exceptionStatusBadgeClass(r.status)}`}
                    >
                      {exceptionStatusZh(r.status)}
                    </span>
                  </td>
                  <td className="max-w-[240px] truncate px-3 py-2.5 text-zinc-600">{r.reason}</td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/b/orders/o/${r.order_id}`}
                      className="font-medium text-[#c2410c] underline-offset-2 hover:underline"
                    >
                      去处理
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-600">
        <span className="tabular-nums">
          共 {total} 条 · 第 {page} 页
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-amber-200/90 bg-white px-3 py-1.5 font-medium text-amber-950 shadow-sm transition hover:bg-amber-50 disabled:opacity-40"
          >
            上一页
          </button>
          <button
            type="button"
            disabled={page * 20 >= total}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-amber-200/90 bg-white px-3 py-1.5 font-medium text-amber-950 shadow-sm transition hover:bg-amber-50 disabled:opacity-40"
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  );
}
