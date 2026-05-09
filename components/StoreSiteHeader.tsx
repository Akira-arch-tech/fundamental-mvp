import Link from "next/link";
import { storefrontTagline, type StoreLocale } from "@/lib/storefront-constants";

export interface StoreSiteHeaderProps {
  storeName: string;
  locale: StoreLocale;
}

/** 买家端（店铺）：名称/副标来自 PRD §8.1 店铺设置 */
export function StoreSiteHeader({ storeName, locale }: StoreSiteHeaderProps) {
  const tagline = storefrontTagline(locale);
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/favorite" className="flex items-baseline gap-2">
          <span className="text-lg font-bold tracking-tight text-[#e85c22]">{storeName}</span>
          <span className="hidden text-xs text-zinc-500 sm:inline">{tagline}</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-zinc-700">
          <Link href="/favorite" className="hover:text-[#e85c22]">
            推し活
          </Link>
          <Link href="/products" className="hover:text-[#e85c22]">
            商品一覧
          </Link>
          <Link href="/cart" className="hover:text-[#e85c22]">
            カート
          </Link>
          <Link href="/checkout" className="hover:text-[#e85c22]">
            ご注文
          </Link>
          <span className="hidden h-4 w-px bg-zinc-200 sm:inline" aria-hidden />
          <Link
            href="/b/login"
            className="text-xs font-normal text-zinc-400 hover:text-[#e85c22] sm:text-sm"
          >
            スタッフ入口
          </Link>
        </nav>
      </div>
    </header>
  );
}
