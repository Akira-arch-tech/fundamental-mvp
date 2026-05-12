import Link from "next/link";
import { InternalAiEditor } from "@/components/InternalAiEditor";

const DEFAULT_EMBED = "https://ai.mini-academy.fun/dashboard";

export default function InternalAiEditorPage() {
  const embedUrl = process.env.NEXT_PUBLIC_CHAOHETI_DASHBOARD_URL?.trim() || DEFAULT_EMBED;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-900/75">PRD §8.4 · 内部封装</p>
          <h1 className="text-xl font-bold text-zinc-900">FUNDAMENTAL 内部 AI 编辑器</h1>
          <p className="mt-1 text-sm text-zinc-600">
            将外链创作中心嵌入本后台壳层，并支持任务 / 素材回写登记（演示存储，非生产数仓）。
          </p>
        </div>
        <Link href="/b/orders" className="text-sm font-medium text-[#c2410c] hover:underline">
          ← 订单工作台
        </Link>
      </div>
      <InternalAiEditor embedUrl={embedUrl} />
      <p className="text-[11px] text-zinc-500 break-all">嵌入地址（环境变量 NEXT_PUBLIC_CHAOHETI_DASHBOARD_URL）：{embedUrl}</p>
    </div>
  );
}
