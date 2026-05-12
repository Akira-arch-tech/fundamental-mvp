import Link from "next/link";
import { AuthSessionEntry } from "@/components/AuthSessionEntry";
import { BackofficeNav } from "@/components/BackofficeNav";

/** 内部运营 / 对接：中文顶栏 + 当前页高亮 */
export function BackofficeHeader() {
  return (
    <header className="border-b border-amber-200/80 bg-gradient-to-b from-amber-50 to-amber-50/90 shadow-sm shadow-amber-900/5 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:h-auto sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/b/orders" className="flex shrink-0 flex-col leading-tight">
            <span className="text-base font-bold tracking-tight text-amber-950 sm:text-lg">FUNDAMENTAL</span>
            <span className="text-[11px] font-medium text-amber-800/75">管理后台</span>
          </Link>
          <span className="hidden h-8 w-px bg-amber-200/90 sm:block" aria-hidden />
          <p className="hidden max-w-[220px] text-[11px] leading-snug text-amber-900/70 sm:block">
            订单 · 异常 · CRM/ERP 对接与队列，与客户日语店铺分区展示。
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
          <BackofficeNav />
          <div className="flex shrink-0 items-center border-l border-amber-200/80 pl-3">
            <AuthSessionEntry variant="backoffice" />
          </div>
        </div>
      </div>
    </header>
  );
}
