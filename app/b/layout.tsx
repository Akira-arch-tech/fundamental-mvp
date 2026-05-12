import { BackofficeHeader } from "@/components/BackofficeHeader";
import { GlobalSiteTabs } from "@/components/GlobalSiteTabs";

export default function BackofficeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div lang="zh-CN" className="min-h-screen bg-gradient-to-b from-zinc-50 via-amber-50/30 to-zinc-50 text-zinc-900">
      <div className="sticky top-0 z-50 border-b border-amber-200/90 bg-gradient-to-b from-amber-50 to-amber-50/95 shadow-sm shadow-amber-900/10 backdrop-blur-md">
        <GlobalSiteTabs />
        <BackofficeHeader />
      </div>
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:pt-8">{children}</main>
      <footer className="mt-12 border-t border-amber-100 bg-amber-50/80 py-5 text-center text-xs text-amber-900/60">
        内部系统演示 · CRM / ERP 对接与审计在此区域 · 与买家店铺语言分区
      </footer>
    </div>
  );
}
