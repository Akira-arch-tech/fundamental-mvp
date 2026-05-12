import { GlobalSiteTabs } from "@/components/GlobalSiteTabs";

export default function PoliciesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-100">
      <div className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 shadow-sm backdrop-blur">
        <GlobalSiteTabs />
      </div>
      {children}
    </div>
  );
}
