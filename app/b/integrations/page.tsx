"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  alertLevelBadgeClass,
  alertLevelZh,
  integrationEventZh,
  jobStatusBadgeClass,
  jobStatusZh,
  targetSystemZh,
} from "@/lib/backoffice-ui-labels";

type JobRow = {
  id: string;
  target_system: string;
  event_type: string;
  status: string;
  retry_count: number;
  last_error: string | null;
  created_at: string;
};

type AlertRow = {
  id: string;
  level: string;
  code: string;
  message: string;
  created_at: string;
};

const boCard = "rounded-2xl border border-amber-100 bg-white shadow-sm shadow-amber-950/5";

export default function IntegrationsBackofficePage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [workerMsg, setWorkerMsg] = useState("");
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError("");
    const [jr, ar] = await Promise.all([
      fetch("/api/backoffice/integration-jobs?page=1&page_size=30", { credentials: "include" }),
      fetch("/api/backoffice/alerts?limit=40", { credentials: "include" }),
    ]);
    if (jr.status === 401 || ar.status === 401) {
      router.push("/b/login");
      return;
    }
    const jj = (await jr.json()) as { items?: JobRow[]; message?: string };
    const aj = (await ar.json()) as { items?: AlertRow[]; message?: string };
    if (!jr.ok) setError(jj.message ?? "对接任务加载失败");
    if (!ar.ok) setError(aj.message ?? "告警加载失败");
    setJobs(jj.items ?? []);
    setAlerts(aj.items ?? []);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function refresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  async function runWorker() {
    setWorkerMsg("");
    const res = await fetch("/api/backoffice/integration-worker/run?limit=20", {
      method: "POST",
      credentials: "include",
    });
    const json = (await res.json()) as { processed?: number; errors?: string[]; message?: string };
    if (!res.ok) {
      setWorkerMsg(json.message ?? "worker 调用失败");
      return;
    }
    setWorkerMsg(`已处理 ${json.processed ?? 0} 条；失败 ${(json.errors ?? []).length} 条`);
    await load();
  }

  async function retryJob(id: string) {
    const res = await fetch(`/api/backoffice/integration-jobs/${id}/retry`, {
      method: "POST",
      credentials: "include",
    });
    if (res.status === 403) {
      setError("仅 admin 可手动重试");
      return;
    }
    await load();
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800/70">对接</p>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">对接与稳定性</h1>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-600">
            出站任务队列、告警、ERP 回调验签、异常审计 CSV 导出（W12–W13 演示区）。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={refreshing}
            className="rounded-full border border-amber-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950 shadow-sm transition hover:bg-amber-50 disabled:opacity-50"
          >
            {refreshing ? "刷新中…" : "刷新列表"}
          </button>
          <Link
            href="/b/orders"
            className="rounded-full border border-amber-200/90 bg-white px-3 py-1.5 text-xs font-medium text-[#c2410c] shadow-sm transition hover:border-amber-300"
          >
            订单台
          </Link>
          <a
            href="/api/backoffice/audit-export"
            className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-800 transition hover:bg-zinc-100"
            target="_blank"
            rel="noreferrer"
          >
            审计 CSV
          </a>
        </div>
      </div>

      {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}

      <section className={`mt-5 p-4 ${boCard}`}>
        <h2 className="text-sm font-bold text-zinc-900">Worker</h2>
        <p className="mt-1 text-xs leading-relaxed text-zinc-600">
          下单 / 异常审批后的任务由服务端 <code className="rounded-md bg-amber-100/80 px-1.5 py-0.5 font-mono text-[11px]">after()</code>{" "}
          异步处理；也可在此手动再跑一轮队列（需已登录）。
        </p>
        <button
          type="button"
          onClick={() => void runWorker()}
          className="mt-3 rounded-full bg-[#e85c22] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#d14f1b]"
        >
          手动处理队列
        </button>
        {workerMsg ? <p className="mt-2 text-xs text-zinc-700">{workerMsg}</p> : null}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className={`overflow-x-auto ${boCard} p-0`}>
          <h2 className="border-b border-amber-100 bg-amber-50/50 px-4 py-2.5 text-sm font-bold text-zinc-900">
            对接任务
          </h2>
          <table className="min-w-full text-left text-xs text-zinc-700">
            <thead className="bg-amber-50/40 text-[11px] font-semibold uppercase tracking-wide text-amber-900/60">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">目标</th>
                <th className="px-3 py-2">事件</th>
                <th className="px-3 py-2">状态</th>
                <th className="px-3 py-2">重试</th>
                <th className="px-3 py-2">错误</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-zinc-400">
                    暂无任务
                  </td>
                </tr>
              ) : (
                jobs.map((j) => (
                  <tr key={j.id} className="border-b border-amber-50/80 transition hover:bg-amber-50/30">
                    <td className="px-3 py-2 font-mono text-[10px] text-zinc-500">{j.id}</td>
                    <td className="px-3 py-2 font-medium">{targetSystemZh(j.target_system)}</td>
                    <td className="px-3 py-2 text-zinc-800">{integrationEventZh(j.event_type)}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${jobStatusBadgeClass(j.status)}`}
                      >
                        {jobStatusZh(j.status)}
                      </span>
                    </td>
                    <td className="px-3 py-2 tabular-nums">{j.retry_count}</td>
                    <td className="max-w-[180px] truncate px-3 py-2 text-red-700">{j.last_error ?? "—"}</td>
                    <td className="px-3 py-2">
                      {j.status === "dead_letter" || j.status === "failed" ? (
                        <button
                          type="button"
                          className="text-[11px] font-medium text-[#c2410c] underline-offset-2 hover:underline"
                          onClick={() => void retryJob(j.id)}
                        >
                          重试
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <section className={`overflow-x-auto ${boCard} p-0`}>
          <h2 className="border-b border-amber-100 bg-amber-50/50 px-4 py-2.5 text-sm font-bold text-zinc-900">告警</h2>
          <table className="min-w-full text-left text-xs text-zinc-700">
            <thead className="bg-amber-50/40 text-[11px] font-semibold uppercase tracking-wide text-amber-900/60">
              <tr>
                <th className="px-3 py-2">时间</th>
                <th className="px-3 py-2">级别</th>
                <th className="px-3 py-2">代码</th>
                <th className="px-3 py-2">说明</th>
              </tr>
            </thead>
            <tbody>
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-zinc-400">
                    暂无告警
                  </td>
                </tr>
              ) : (
                alerts.map((a) => (
                  <tr key={a.id} className="border-b border-amber-50/80 transition hover:bg-amber-50/30">
                    <td className="px-3 py-2 text-zinc-500">{new Date(a.created_at).toLocaleString("zh-CN")}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${alertLevelBadgeClass(a.level)}`}
                      >
                        {alertLevelZh(a.level)}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px]">{a.code}</td>
                    <td className="px-3 py-2">{a.message}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
