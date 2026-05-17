"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", key: "home", label: "トップ", title: "トップページ" },
  { href: "/shop", key: "store", label: "ストア", title: "商品・カスタマイズ" },
  { href: "/policies", key: "policies", label: "ポリシー", title: "利用規約・プライバシー" },
  { href: "/b/login", key: "back", label: "管理", title: "管理者ログイン" },
] as const;

function tabActive(pathname: string, key: (typeof TABS)[number]["key"]): boolean {
  if (key === "home") return pathname === "/" || pathname === "/ja";
  if (key === "store") return pathname.startsWith("/shop");
  if (key === "policies") return pathname.startsWith("/policies");
  if (key === "back") return pathname.startsWith("/b");
  return false;
}

function surfaceForPath(pathname: string): "light" | "amber" {
  if (pathname.startsWith("/b")) return "amber";
  return "light";
}

const surfaceStyles = {
  light: {
    bar: "border-zinc-200 bg-zinc-50/95",
    link: "text-zinc-600 hover:text-zinc-900",
    active: "text-[#e85c22] border-[#e85c22]",
    inactiveBorder: "border-transparent",
  },
  amber: {
    bar: "border-amber-200/80 bg-amber-50/95",
    link: "text-amber-900/75 hover:text-amber-950",
    active: "text-amber-950 border-amber-700",
    inactiveBorder: "border-transparent",
  },
} as const;

/** 全站一级分区 Tab（与 docs/SITE-URLS-AND-NAV-v1.md 一致） */
export function GlobalSiteTabs() {
  const pathname = usePathname() ?? "/";
  const surface = surfaceForPath(pathname);
  const s = surfaceStyles[surface];

  return (
    <nav
      className={`border-b ${s.bar} backdrop-blur-sm`}
      aria-label="サイトナビゲーション"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-3 py-1.5 sm:gap-2 sm:px-4 sm:py-2">
        {TABS.map((tab) => {
          const active = tabActive(pathname, tab.key);
          return (
            <Link
              key={tab.key}
              href={tab.href}
              title={tab.title}
              className={`shrink-0 whitespace-nowrap rounded-md border-b-2 px-2 py-1 text-[11px] font-medium transition sm:px-3 sm:text-xs ${
                s.link
              } ${active ? s.active : s.inactiveBorder}`}
              aria-current={active ? "page" : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
