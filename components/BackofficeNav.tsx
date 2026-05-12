"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { storePath } from "@/lib/storefront-constants";

const items = [
  { href: "/b", label: "概览" },
  { href: "/b/orders", label: "订单工作台" },
  { href: "/b/settings", label: "店铺设置" },
  { href: "/b/ai-editor", label: "AI 编辑器" },
  { href: "/b/exceptions", label: "异常中心" },
  { href: "/b/crm", label: "CRM 记录" },
  { href: "/b/integrations", label: "对接任务" },
] as const;

export function BackofficeNav() {
  const pathname = usePathname();
  /** 首屏 SSR 与客户端 hydration 必须一致；pathname 高亮延后到挂载后再算，避免 mismatch */
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const pathForActive = mounted ? pathname : "";

  return (
    <nav className="flex flex-wrap items-center gap-1 sm:gap-2">
      {items.map(({ href, label }) => {
        const active =
          pathForActive &&
          (href === "/b"
            ? pathForActive === "/b"
            : href === "/b/orders"
              ? pathForActive.startsWith("/b/orders")
              : pathForActive === href || pathForActive.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-amber-900 text-white shadow-sm shadow-amber-900/20"
                : "text-amber-950/90 hover:bg-amber-100/80 hover:text-amber-950"
            }`}
          >
            {label}
          </Link>
        );
      })}
      <Link
        href={storePath("/favorite")}
        className="rounded-full px-2.5 py-1.5 text-xs font-normal text-amber-900/65 transition hover:bg-white/60 hover:text-amber-950 sm:ml-1"
      >
        客户店铺（日语）
      </Link>
    </nav>
  );
}
