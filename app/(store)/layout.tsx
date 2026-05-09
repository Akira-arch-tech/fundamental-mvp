import { StoreSiteHeader } from "@/components/StoreSiteHeader";
import { getStoreSettings } from "@/lib/store-settings";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const store = await getStoreSettings();
  return (
    <>
      <StoreSiteHeader storeName={store.store_name} locale={store.locale} />
      <main>{children}</main>
      <footer className="mt-12 border-t border-zinc-200 bg-white py-6 text-center text-xs text-zinc-500">
        FUNDAMENTAL カスタムストア · デモ環境 · 非商用
      </footer>
    </>
  );
}
