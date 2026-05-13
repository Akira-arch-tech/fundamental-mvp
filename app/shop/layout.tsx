import { GlobalSiteTabs } from "@/components/GlobalSiteTabs";
import { StoreSiteHeader } from "@/components/StoreSiteHeader";
import { getStoreSettings } from "@/lib/store-settings";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const store = await getStoreSettings();
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white shadow-sm">
        <GlobalSiteTabs />
        <StoreSiteHeader storeName={store.store_name} locale={store.locale} />
      </header>
      <main className="bg-white">{children}</main>
      <footer className="mt-12 border-t border-zinc-200 bg-white py-6 text-center text-xs text-zinc-500">
        FUNDAMENTAL カスタムストア · デモ環境 · 非商用
      </footer>
    </div>
  );
}
