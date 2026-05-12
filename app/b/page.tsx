import Link from "next/link";
import { getBackofficeSummary } from "@/lib/backoffice-summary";

const card =
  "rounded-2xl border border-amber-100 bg-white p-4 shadow-sm shadow-amber-950/5 transition hover:border-amber-200";

/** 管理后台首页：KPI 看板 + 快捷入口（原 `/b` 仅重定向，现保留订单台直达） */
export default async function BackofficeHomePage() {
  const s = await getBackofficeSummary();

  const tiles: Array<{
    href: string;
    label: string;
    value: number;
    sub?: string;
  }> = [
    { href: "/b/orders", label: "订单总数", value: s.orders_total, sub: "含全部状态" },
    { href: "/b/orders", label: "今日新建订单", value: s.orders_today, sub: "按服务器本地日切" },
    {
      href: "/b/exceptions",
      label: "待处理异常",
      value: s.exceptions_pending,
      sub: "已提交 + 处理中",
    },
    { href: "/b/integrations", label: "对接任务（待处理）", value: s.integration_pending },
    {
      href: "/b/integrations",
      label: "失败 / 死信",
      value: s.integration_failed + s.integration_dead_letter,
      sub: `失败 ${s.integration_failed} · 死信 ${s.integration_dead_letter}`,
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800/70">概览</p>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">管理后台</h1>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-600">
          关键指标一览；明细请进各工作台。数据来自当前环境（文件库或 PostgreSQL）。
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className={card}>
            <p className="text-[11px] font-medium text-amber-900/70">{t.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-900">{t.value}</p>
            {t.sub ? <p className="mt-1 text-[11px] text-zinc-500">{t.sub}</p> : null}
            <p className="mt-3 text-xs font-medium text-[#c2410c]">进入 →</p>
          </Link>
        ))}
        <Link href="/b/integrations" className={card}>
          <p className="text-[11px] font-medium text-amber-900/70">最近告警（预览）</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-900">{s.alerts_recent_count}</p>
          <p className="mt-1 text-[11px] text-zinc-500">最近拉取 50 条用于计数</p>
          <p className="mt-3 text-xs font-medium text-[#c2410c]">对接与告警 →</p>
        </Link>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        <Link
          href="/b/orders"
          className="rounded-full bg-[#e85c22] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#d14f1b]"
        >
          订单工作台
        </Link>
        <Link
          href="/b/exceptions"
          className="rounded-full border border-amber-200 bg-white px-4 py-2 text-sm font-medium text-amber-950 hover:bg-amber-50"
        >
          异常中心
        </Link>
        <Link
          href="/b/crm"
          className="rounded-full border border-amber-200 bg-white px-4 py-2 text-sm font-medium text-amber-950 hover:bg-amber-50"
        >
          CRM 记录
        </Link>
        <Link
          href="/b/integrations"
          className="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
        >
          对接任务
        </Link>
      </div>
    </div>
  );
}
