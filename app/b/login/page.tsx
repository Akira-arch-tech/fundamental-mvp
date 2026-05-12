"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { storePath } from "@/lib/storefront-constants";
import type { OperatorRole } from "@/lib/types";

type AuthMode = "mock" | "database";

const boInput =
  "mt-1.5 block w-full rounded-xl border border-amber-200/90 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none ring-amber-500/15 transition placeholder:text-zinc-400 focus:border-amber-400 focus:ring-2";
const boCard = "rounded-2xl border border-amber-100 bg-white p-5 shadow-lg shadow-amber-950/10 sm:p-6";

export default function BackofficeLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode | null>(null);

  const [displayName, setDisplayName] = useState("演示运营");
  const [role, setRole] = useState<OperatorRole>("ops");

  const [email, setEmail] = useState("ops@demo.local");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/config");
        const json = (await res.json()) as { auth_mode?: AuthMode };
        if (!cancelled) setMode(json.auth_mode === "database" ? "database" : "mock");
      } catch {
        if (!cancelled) setMode("mock");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmitMock(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          display_name: displayName.trim() || "演示用户",
          role,
        }),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(json.message ?? "登录失败");
      router.push("/b/orders");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitDb(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(json.message ?? "登录失败");
      router.push("/b/orders");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  if (mode === null) {
    return (
      <div className="mx-auto max-w-md py-16">
        <div className="animate-pulse space-y-4 rounded-2xl border border-amber-100 bg-white/80 p-8 shadow-inner">
          <div className="h-6 w-40 rounded-lg bg-amber-100" />
          <div className="h-4 w-full rounded bg-amber-50" />
          <div className="h-4 w-[80%] rounded bg-amber-50" />
          <div className="mt-6 h-10 w-full rounded-xl bg-amber-100/70" />
          <div className="h-10 w-full rounded-xl bg-amber-100/70" />
        </div>
        <p className="mt-4 text-center text-xs text-zinc-500">加载登录模式…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-6 sm:py-12">
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-800/70">FUNDAMENTAL</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">管理后台登录</h1>
        <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-zinc-600">
          {mode === "database"
            ? "已连接数据库：使用邮箱与密码登录（请先执行 npm run db:push 与 npm run db:seed）。"
            : "本地演示：使用显示名与角色 Mock 登录（未配置 DATABASE_URL）。"}
        </p>
      </div>

      {mode === "database" ? (
        <form onSubmit={onSubmitDb} className={`mt-8 ${boCard}`}>
          <label className="block text-xs font-semibold text-zinc-800">
            邮箱
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={boInput}
              autoComplete="username"
            />
          </label>
          <label className="mt-4 block text-xs font-semibold text-zinc-800">
            密码
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={boInput}
              autoComplete="current-password"
              placeholder="默认见 .env.example 中 SEED_PASSWORD"
            />
          </label>
          {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full rounded-full bg-[#e85c22] py-3 text-sm font-semibold text-white shadow-md shadow-orange-900/15 transition hover:bg-[#d14f1b] disabled:opacity-60"
          >
            {loading ? "登录中…" : "登录"}
          </button>
        </form>
      ) : (
        <form onSubmit={onSubmitMock} className={`mt-8 ${boCard}`}>
          <label className="block text-xs font-semibold text-zinc-800">
            显示名（写入审计日志）
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={boInput}
              autoComplete="username"
            />
          </label>
          <label className="mt-4 block text-xs font-semibold text-zinc-800">
            角色
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as OperatorRole)}
              className={boInput}
            >
              <option value="customer_service">客服（不可审异常终态）</option>
              <option value="ops">运营（可标记处理中）</option>
              <option value="admin">管理员（可通过 / 拒绝）</option>
            </select>
          </label>
          {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full rounded-full bg-[#e85c22] py-3 text-sm font-semibold text-white shadow-md shadow-orange-900/15 transition hover:bg-[#d14f1b] disabled:opacity-60"
          >
            {loading ? "登录中…" : "登录"}
          </button>
        </form>
      )}

      <p className="mt-8 flex flex-wrap justify-center gap-x-4 gap-y-2 text-center text-xs text-zinc-500">
        <Link href="/b/orders" className="font-medium text-[#c2410c] underline-offset-2 hover:underline">
          订单工作台
        </Link>
        <span className="text-zinc-300" aria-hidden>
          |
        </span>
        <Link href="/b/exceptions" className="font-medium text-[#c2410c] underline-offset-2 hover:underline">
          异常中心
        </Link>
        <span className="text-zinc-300" aria-hidden>
          |
        </span>
        <Link href={storePath("/favorite")} className="text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline">
          客户店铺（日语）
        </Link>
      </p>
    </div>
  );
}
