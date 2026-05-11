"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { OperatorRole } from "@/lib/types";
import { operatorRoleZh } from "@/lib/backoffice-ui-labels";

type MeResponse =
  | { authenticated: false }
  | { authenticated: true; user_id: string; display_name: string; role: OperatorRole };

type Variant = "default" | "backoffice";

export function AuthSessionEntry({ variant = "default" }: { variant?: Variant }) {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        const json = (await res.json()) as MeResponse;
        if (!cancelled) setMe(json);
      } catch {
        if (!cancelled) setMe({ authenticated: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function logout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      setMe({ authenticated: false });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const isBo = variant === "backoffice";

  if (me === null) {
    return (
      <span
        className={`text-xs ${isBo ? "text-amber-800/60" : "hidden text-zinc-400 md:inline"}`}
      >
        读取登录态…
      </span>
    );
  }

  if (!me.authenticated) {
    return (
      <Link
        href="/b/login"
        className={
          isBo
            ? "rounded-full border border-amber-300/90 bg-white/70 px-3 py-1.5 text-xs font-semibold text-amber-950 shadow-sm transition hover:border-amber-400 hover:bg-white"
            : "hover:text-[#e85c22]"
        }
      >
        后台登录
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className={`max-w-[140px] truncate text-xs sm:max-w-[200px] ${
          isBo ? "font-medium text-amber-950/90" : "hidden text-zinc-500 md:inline"
        }`}
        title={`${me.display_name} · ${operatorRoleZh(me.role)}`}
      >
        {me.display_name}
        <span className={isBo ? "text-amber-800/70" : "text-zinc-500"}>
          （{isBo ? operatorRoleZh(me.role) : me.role}）
        </span>
      </span>
      <button
        type="button"
        onClick={logout}
        disabled={loading}
        className={
          isBo
            ? "rounded-full border border-amber-300/80 bg-white/60 px-2.5 py-1 text-xs font-medium text-amber-950 transition hover:bg-white disabled:opacity-60"
            : "rounded-full border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:border-zinc-400 disabled:opacity-60"
        }
      >
        {loading ? "退出中…" : "退出"}
      </button>
    </div>
  );
}
