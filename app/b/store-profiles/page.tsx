"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

export default function StoreProfilesPage() {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [fromSlug, setFromSlug] = useState("default");
  const [newSlug, setNewSlug] = useState("demo-alpha");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const refresh = useCallback(async () => {
    const res = await fetch("/api/backoffice/store-profiles", { credentials: "include" });
    const j = (await res.json()) as { slugs?: string[]; message?: string };
    if (!res.ok) throw new Error(j.message ?? "load failed");
    setSlugs(j.slugs ?? []);
  }, []);

  useEffect(() => {
    refresh().catch((e) => setErr(e instanceof Error ? e.message : "error"));
  }, [refresh]);

  async function onClone() {
    setErr("");
    setMsg("");
    try {
      const res = await fetch("/api/backoffice/store-profiles", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clone", from_slug: fromSlug, new_slug: newSlug }),
      });
      const j = (await res.json()) as { message?: string; active_slug?: string };
      if (!res.ok) throw new Error(j.message ?? "clone failed");
      setMsg(`已创建并切换到「${j.active_slug}」。买家店将读取同名 cookie 下的店名/币种配置。`);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "error");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-amber-950">多店演示（G1 最小闭环）</h1>
        <p className="mt-1 text-sm text-amber-900/75">
          从现有 profile 克隆新的 <code className="rounded bg-amber-100 px-1">.fdm-store-settings.&lt;slug&gt;.json</code>{" "}
          ，并写入 HttpOnly Cookie <code className="rounded bg-amber-100 px-1">fdm_store_profile</code>。
          买家店与后台「店铺设置」将读写同一 profile 文件。
        </p>
      </div>
      {err ? (
        <p className="text-sm text-red-700">
          {err}{" "}
          <Link href="/b/login" className="underline">
            登录
          </Link>
        </p>
      ) : null}
      {msg ? <p className="text-sm text-emerald-800">{msg}</p> : null}
      <section className="rounded-xl border border-amber-200/80 bg-white/90 p-4 shadow-sm">
        <h2 className="font-semibold text-amber-950">已有 profile</h2>
        <ul className="mt-2 list-inside list-disc text-sm text-amber-900">
          {slugs.map((s) => (
            <li key={s}>
              <code>{s}</code>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-xl border border-amber-200/80 bg-white/90 p-4 shadow-sm">
        <h2 className="font-semibold text-amber-950">克隆为新 profile</h2>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="text-sm">
            <span className="text-amber-900/80">来源 slug</span>
            <select
              className="mt-1 block w-full rounded-md border border-amber-200 px-2 py-1.5 text-sm"
              value={fromSlug}
              onChange={(e) => setFromSlug(e.target.value)}
            >
              {slugs.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-amber-900/80">新 slug（小写字母开头）</span>
            <input
              className="mt-1 block w-full rounded-md border border-amber-200 px-2 py-1.5 text-sm"
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={() => void onClone()}
            className="rounded-lg bg-amber-900 px-4 py-2 text-sm font-medium text-white hover:bg-amber-950"
          >
            克隆并切换
          </button>
        </div>
      </section>
      <p className="text-xs text-amber-900/60">
        买家域切换：对已存在的 slug 调用{" "}
        <code className="rounded bg-amber-100 px-1">POST /api/shop/store-profile</code>（JSON:{" "}
        <code>{`{ "slug": "demo-alpha" }`}</code>）。
      </p>
    </div>
  );
}
