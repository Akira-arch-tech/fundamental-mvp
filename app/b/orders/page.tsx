"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  localDayEndIso,
  localDayStartIso,
  swapYmdIfReversed,
  todayYmdLocal,
  ymdDaysAgo,
} from "@/lib/backoffice-date-range";
import { orderStatusBadgeClass, orderStatusZh } from "@/lib/backoffice-ui-labels";

const boCard = "rounded-2xl border border-amber-100 bg-white p-4 shadow-sm shadow-amber-950/5";
const boInput = "mt-1 block rounded-lg border border-amber-200/80 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none ring-amber-500/15 transition focus:border-amber-400 focus:ring-2";
const boGhostBtn =
  "rounded-full border border-amber-200/80 bg-amber-50/50 px-3 py-1 text-xs font-medium text-amber-950 transition hover:bg-amber-100/80";
const boPrimaryBtn =
  "rounded-full bg-[#e85c22] px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-orange-900/10 transition hover:bg-[#d14f1b] disabled:opacity-50";

type OrderRow = {
  order_id: string;
  order_no: string;
  status: string;
  recipient_name: string;
  total_amount: number;
  created_at: string;
};

const PAGE_SIZE = 20;

function parsePage(sp: URLSearchParams): number {
  const n = Number.parseInt(sp.get("page") ?? "1", 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 10_000);
}

function BackofficeOrdersContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = parsePage(searchParams);
  const status = searchParams.get("status") ?? "";
  const appliedQ = searchParams.get("q") ?? "";
  const appliedDf = searchParams.get("df") ?? "";
  const appliedDt = searchParams.get("dt") ?? "";

  const [draftQ, setDraftQ] = useState(appliedQ);
  const [draftDf, setDraftDf] = useState(appliedDf);
  const [draftDt, setDraftDt] = useState(appliedDt);

  useEffect(() => {
    setDraftQ(appliedQ);
    setDraftDf(appliedDf);
    setDraftDt(appliedDt);
  }, [appliedQ, appliedDf, appliedDt]);

  const replaceQuery = useCallback(
    (patch: Record<string, string | null>) => {
      const p = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") p.delete(k);
        else p.set(k, v);
      }
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const buildFetchParams = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
    if (status) params.set("status", status);
    if (appliedQ.trim()) params.set("keyword", appliedQ.trim());
    const { from, to } = swapYmdIfReversed(appliedDf.trim(), appliedDt.trim());
    if (from) params.set("created_from", localDayStartIso(from));
    if (to) params.set("created_to", localDayEndIso(to));
    return params;
  }, [page, status, appliedQ, appliedDf, appliedDt]);

  const [items, setItems] = useState<OrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  /** 跨页累积，最多导出时由服务端截断为 100 */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [batchErr, setBatchErr] = useState("");

  const load = useCallback(async () => {
    setError("");
    const res = await fetch(`/api/backoffice/orders?${buildFetchParams()}`, {
      credentials: "include",
    });
    if (res.status === 401) {
      router.push("/b/login");
      return;
    }
    const json = (await res.json()) as { items?: OrderRow[]; total?: number; message?: string };
    if (!res.ok) {
      setError(json.message ?? "加载失败");
      return;
    }
    setItems(json.items ?? []);
    setTotal(json.total ?? 0);
  }, [buildFetchParams, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const applySearch = () => {
    const { from, to } = swapYmdIfReversed(draftDf.trim(), draftDt.trim());
    replaceQuery({
      q: draftQ.trim() || null,
      df: from || null,
      dt: to || null,
      page: "1",
    });
  };

  const presetRange = (rangeFrom: string, rangeTo: string) => {
    setDraftDf(rangeFrom);
    setDraftDt(rangeTo);
    replaceQuery({
      df: rangeFrom,
      dt: rangeTo,
      page: "1",
    });
  };

  const clearDates = () => {
    setDraftDf("");
    setDraftDt("");
    replaceQuery({ df: null, dt: null, page: "1" });
  };

  const resetFilters = () => {
    setDraftQ("");
    setDraftDf("");
    setDraftDt("");
    replaceQuery({ status: null, q: null, df: null, dt: null, page: null });
  };

  const today = todayYmdLocal();
  const swappedDraft = useMemo(
    () => swapYmdIfReversed(draftDf.trim(), draftDt.trim()),
    [draftDf, draftDt],
  );
  const datesWereSwapped =
    draftDf.trim() &&
    draftDt.trim() &&
    draftDf.trim() > draftDt.trim();

  const selectedCount = selectedIds.size;
  const allPageSelected =
    items.length > 0 && items.every((o) => selectedIds.has(o.order_id));

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleSelectAllPage() {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (allPageSelected) {
        for (const o of items) n.delete(o.order_id);
      } else {
        for (const o of items) n.add(o.order_id);
      }
      return n;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setBatchErr("");
  }

  async function exportSelectedCsv() {
    setBatchErr("");
    const ids = Array.from(selectedIds).slice(0, 100);
    if (ids.length === 0) {
      setBatchErr("请先勾选至少一条订单");
      return;
    }
    const res = await fetch("/api/backoffice/orders/batch-export", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_ids: ids }),
    });
    if (res.status === 401) {
      router.push("/b/login");
      return;
    }
    if (!res.ok) {
      try {
        const j = (await res.json()) as { message?: string };
        setBatchErr(j.message ?? "导出失败");
      } catch {
        setBatchErr("导出失败");
      }
      return;
    }
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `orders-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
  }

  const activeSummaryParts: string[] = [];
  if (status) activeSummaryParts.push(`状态 ${orderStatusZh(status)}`);
  if (appliedQ.trim()) activeSummaryParts.push(`关键词 「${appliedQ.trim()}」`);
  const urlRange = swapYmdIfReversed(appliedDf.trim(), appliedDt.trim());
  if (urlRange.from && urlRange.to) {
    activeSummaryParts.push(`创建 ${urlRange.from} ~ ${urlRange.to}`);
  } else if (urlRange.from) {
    activeSummaryParts.push(`创建 ≥ ${urlRange.from}`);
  } else if (urlRange.to) {
    activeSummaryParts.push(`创建 ≤ ${urlRange.to}`);
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800/70">工作台</p>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">订单列表</h1>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-zinc-600">
            分页、状态、创建时间与关键词；条件同步到地址栏，可分享链接、刷新不丢。
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
            href="/b/exceptions"
            className="rounded-full border border-amber-200/90 bg-white px-3 py-1.5 text-sm font-medium text-[#c2410c] shadow-sm transition hover:border-amber-300"
          >
            异常中心 →
          </Link>
        </div>
      </div>

      <form
        className={`mt-5 space-y-3 ${boCard}`}
        onSubmit={(e) => {
          e.preventDefault();
          applySearch();
        }}
      >
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-medium text-zinc-700">
            状态
            <select
              value={status}
              onChange={(e) => {
                const v = e.target.value;
                replaceQuery({
                  status: v || null,
                  page: "1",
                });
              }}
              className={boInput}
            >
              <option value="">全部状态</option>
              <option value="created">{orderStatusZh("created")}</option>
              <option value="reviewing">{orderStatusZh("reviewing")}</option>
              <option value="in_production">{orderStatusZh("in_production")}</option>
              <option value="shipped">{orderStatusZh("shipped")}</option>
              <option value="delivered">{orderStatusZh("delivered")}</option>
              <option value="closed">{orderStatusZh("closed")}</option>
            </select>
          </label>
          <label className="text-xs font-medium text-zinc-700">
            创建从
            <input
              type="date"
              value={draftDf}
              max={draftDt || undefined}
              onChange={(e) => setDraftDf(e.target.value)}
              className={boInput}
            />
          </label>
          <label className="text-xs font-medium text-zinc-700">
            创建至
            <input
              type="date"
              value={draftDt}
              min={draftDf || undefined}
              onChange={(e) => setDraftDt(e.target.value)}
              className={boInput}
            />
          </label>
          <label className="text-xs font-medium text-zinc-700">
            关键词（订单号 / 收件人 / ID）
            <input
              value={draftQ}
              onChange={(e) => setDraftQ(e.target.value)}
              className={`${boInput} min-w-[200px]`}
              placeholder="搜索…"
              autoComplete="off"
            />
          </label>
          <button type="submit" className={boPrimaryBtn}>
            搜索
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100"
          >
            重置全部
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-amber-100/80 pt-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-800/60">快捷</span>
          <button type="button" onClick={() => presetRange(today, today)} className={boGhostBtn}>
            今天
          </button>
          <button type="button" onClick={() => presetRange(ymdDaysAgo(6), today)} className={boGhostBtn}>
            近 7 天
          </button>
          <button type="button" onClick={() => presetRange(ymdDaysAgo(29), today)} className={boGhostBtn}>
            近 30 天
          </button>
          <button
            type="button"
            onClick={clearDates}
            className="rounded-full border border-transparent px-3 py-1 text-xs text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline"
          >
            清除日期
          </button>
          {datesWereSwapped ? (
            <span className="text-xs text-amber-700">起止已自动对调为 {swappedDraft.from} ~ {swappedDraft.to}</span>
          ) : null}
        </div>
      </form>

      {activeSummaryParts.length > 0 ? (
        <p className="mt-2 text-xs text-zinc-600">
          <span className="text-zinc-400">当前筛选 · </span>
          {activeSummaryParts.join(" · ")}
        </p>
      ) : null}

      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
      {batchErr ? <p className="mt-2 text-xs text-red-600">{batchErr}</p> : null}

      <div className={`mt-4 flex flex-wrap items-center gap-2 ${boCard}`}>
        <span className="text-xs text-zinc-700">
          已选 <span className="font-semibold tabular-nums text-amber-950">{selectedCount}</span> 条（可跨页累积，导出最多 100 条）
        </span>
        <button
          type="button"
          onClick={toggleSelectAllPage}
          disabled={items.length === 0}
          className="rounded-full border border-amber-200/90 bg-white px-3 py-1.5 text-xs font-medium text-amber-950 transition hover:bg-amber-50 disabled:opacity-40"
        >
          {allPageSelected ? "取消本页" : "全选本页"}
        </button>
        <button
          type="button"
          onClick={clearSelection}
          disabled={selectedCount === 0}
          className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-40"
        >
          清空选择
        </button>
        <button
          type="button"
          onClick={() => void exportSelectedCsv()}
          disabled={selectedCount === 0}
          className={boPrimaryBtn}
        >
          导出选中 CSV
        </button>
      </div>

      <div className={`mt-4 overflow-x-auto ${boCard} p-0`}>
        <table className="min-w-full text-left text-xs text-zinc-700">
          <thead className="border-b border-amber-100 bg-amber-50/60 text-[11px] font-semibold uppercase tracking-wide text-amber-900/60">
            <tr>
              <th className="w-10 px-2 py-2">
                <input
                  type="checkbox"
                  className="rounded border-amber-300 text-[#e85c22] focus:ring-amber-500"
                  checked={allPageSelected}
                  disabled={items.length === 0}
                  onChange={toggleSelectAllPage}
                  title="全选本页"
                />
              </th>
              <th className="px-3 py-2">订单号</th>
              <th className="px-3 py-2">状态</th>
              <th className="px-3 py-2">收件人</th>
              <th className="px-3 py-2">金额</th>
              <th className="px-3 py-2">创建时间</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-zinc-400">
                  暂无数据
                </td>
              </tr>
            ) : (
              items.map((o) => (
                <tr
                  key={o.order_id}
                  className="border-b border-amber-50/80 transition hover:bg-amber-50/40"
                >
                  <td className="px-2 py-2.5">
                    <input
                      type="checkbox"
                      className="rounded border-amber-300 text-[#e85c22] focus:ring-amber-500"
                      checked={selectedIds.has(o.order_id)}
                      onChange={() => toggleSelect(o.order_id)}
                    />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-zinc-800">{o.order_no}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${orderStatusBadgeClass(o.status)}`}
                    >
                      {orderStatusZh(o.status)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">{o.recipient_name}</td>
                  <td className="px-3 py-2.5 tabular-nums">¥{o.total_amount.toLocaleString("zh-CN")}</td>
                  <td className="px-3 py-2.5 text-zinc-500">{new Date(o.created_at).toLocaleString("zh-CN")}</td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/b/orders/o/${o.order_id}`}
                      className="font-medium text-[#c2410c] underline-offset-2 hover:underline"
                    >
                      内部详情
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
            onClick={() => replaceQuery({ page: page <= 2 ? null : String(page - 1) })}
            className="rounded-lg border border-amber-200/90 bg-white px-3 py-1.5 font-medium text-amber-950 shadow-sm transition hover:bg-amber-50 disabled:opacity-40"
          >
            上一页
          </button>
          <button
            type="button"
            disabled={page * PAGE_SIZE >= total}
            onClick={() => replaceQuery({ page: String(page + 1) })}
            className="rounded-lg border border-amber-200/90 bg-white px-3 py-1.5 font-medium text-amber-950 shadow-sm transition hover:bg-amber-50 disabled:opacity-40"
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  );
}

const ordersPageSkeleton = (
  <div className="animate-pulse space-y-4 py-4">
    <div className="h-8 w-48 rounded-lg bg-amber-100/80" />
    <div className="h-28 rounded-2xl border border-amber-100 bg-amber-50/50" />
    <div className="h-64 rounded-2xl border border-amber-100 bg-amber-50/30" />
  </div>
);

/**
 * 含 useSearchParams 的子树在静态预渲染时与带查询串的首次客户端渲染容易不一致，触发 hydration error。
 * 首屏先渲染与 SSR 相同的骨架，仅在浏览器挂载后再挂接读 URL 的列表内容。
 */
function BackofficeOrdersClientMount() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);
  if (!ready) return ordersPageSkeleton;
  return <BackofficeOrdersContent />;
}

export default function BackofficeOrdersPage() {
  return (
    <Suspense fallback={ordersPageSkeleton}>
      <BackofficeOrdersClientMount />
    </Suspense>
  );
}
