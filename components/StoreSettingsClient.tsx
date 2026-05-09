"use client";

import { useCallback, useEffect, useState } from "react";
import {
  JPY_TO_KRW_DISPLAY,
  type StoreCurrency,
  type StorefrontSettings,
  type StoreLocale,
} from "@/lib/storefront-constants";

export function StoreSettingsClient() {
  const [data, setData] = useState<StorefrontSettings | null>(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/backoffice/store-settings", { credentials: "include" });
      const json = (await res.json()) as StorefrontSettings & { code?: string };
      if (!res.ok) throw new Error(json.code ?? "load failed");
      setData({ store_name: json.store_name, locale: json.locale, currency: json.currency });
    } catch {
      setMsg("加载失败，请先登录后台。");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!data) return;
    setMsg("");
    try {
      const res = await fetch("/api/backoffice/store-settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "save failed");
      setData({ store_name: json.store_name, locale: json.locale, currency: json.currency });
      setMsg("已保存。买家端顶栏与结账币种展示将随设置变化（演示）。");
    } catch {
      setMsg("保存失败。");
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-600">加载中…</p>;
  }
  if (!data) {
    return <p className="text-sm text-red-600">{msg || "无数据"}</p>;
  }

  return (
    <form onSubmit={onSave} className="max-w-lg space-y-4 rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
      <div>
        <label className="block text-sm font-medium text-zinc-800">店铺名称（PRD §8.1）</label>
        <input
          value={data.store_name}
          onChange={(e) => setData({ ...data, store_name: e.target.value })}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-800">前台主推语言</label>
        <select
          value={data.locale}
          onChange={(e) => setData({ ...data, locale: e.target.value as StoreLocale })}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="ja">日本語（ja）</option>
          <option value="ko">한국어（ko）</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-800">标价币种（展示）</label>
        <select
          value={data.currency}
          onChange={(e) => setData({ ...data, currency: e.target.value as StoreCurrency })}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="JPY">JPY（日元）</option>
          <option value="KRW">KRW（韩元，参考汇率展示）</option>
        </select>
        <p className="mt-1 text-xs text-zinc-500">
          演示：订单落库金额仍为 JPY；KRW 为结账页参考换算（{`×${JPY_TO_KRW_DISPLAY}`}）。
        </p>
      </div>
      <button
        type="submit"
        className="rounded-full bg-amber-900 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-950"
      >
        保存设置
      </button>
      {msg ? <p className="text-xs text-emerald-800">{msg}</p> : null}
    </form>
  );
}
