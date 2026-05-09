"use client";

import { useCallback, useEffect, useState } from "react";
import {
  JPY_TO_KRW_DISPLAY,
  type StoreCurrency,
  type StorefrontSettings,
  type StoreLocale,
} from "@/lib/storefront-constants";
import type { PricingTemplate } from "@/lib/pricing-template";

type PricingForm = {
  markup_percent: number;
  shipping_fee_base: number;
  free_shipping_qty: number;
  discount_qty_10: number;
  discount_qty_50: number;
  discount_qty_200: number;
};

function toPricingForm(t: PricingTemplate): PricingForm {
  const find = (qty: number) => t.tiers.find((x) => x.min_qty === qty)?.discount_percent ?? 0;
  return {
    markup_percent: t.markup_percent,
    shipping_fee_base: t.shipping_fee_base,
    free_shipping_qty: t.free_shipping_qty,
    discount_qty_10: find(10),
    discount_qty_50: find(50),
    discount_qty_200: find(200),
  };
}

export function StoreSettingsClient() {
  const [data, setData] = useState<StorefrontSettings | null>(null);
  const [pricing, setPricing] = useState<PricingForm | null>(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const [storeRes, pricingRes] = await Promise.all([
        fetch("/api/backoffice/store-settings", { credentials: "include" }),
        fetch("/api/backoffice/pricing-template", { credentials: "include" }),
      ]);
      const storeJson = (await storeRes.json()) as StorefrontSettings & { code?: string };
      const pricingJson = (await pricingRes.json()) as PricingTemplate & { code?: string };
      if (!storeRes.ok) throw new Error(storeJson.code ?? "load store failed");
      if (!pricingRes.ok) throw new Error(pricingJson.code ?? "load pricing failed");
      setData({
        store_name: storeJson.store_name,
        locale: storeJson.locale,
        currency: storeJson.currency,
      });
      setPricing(toPricingForm(pricingJson));
    } catch {
      setMsg("加载失败，请先登录后台。");
      setData(null);
      setPricing(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!data || !pricing) return;
    setMsg("");
    try {
      const storeRes = await fetch("/api/backoffice/store-settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const storeJson = await storeRes.json();
      if (!storeRes.ok) throw new Error(storeJson.message ?? "save store failed");
      const pricingRes = await fetch("/api/backoffice/pricing-template", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markup_percent: pricing.markup_percent,
          shipping_fee_base: pricing.shipping_fee_base,
          free_shipping_qty: pricing.free_shipping_qty,
          tiers: [
            { min_qty: 1, discount_percent: 0 },
            { min_qty: 10, discount_percent: pricing.discount_qty_10 },
            { min_qty: 50, discount_percent: pricing.discount_qty_50 },
            { min_qty: 200, discount_percent: pricing.discount_qty_200 },
          ],
        }),
      });
      const pricingJson = await pricingRes.json();
      if (!pricingRes.ok) throw new Error(pricingJson.message ?? "save pricing failed");
      setData({
        store_name: storeJson.store_name,
        locale: storeJson.locale,
        currency: storeJson.currency,
      });
      setPricing(toPricingForm(pricingJson));
      setMsg("已保存。店铺展示与统一定价模板都会生效（演示环境）。");
    } catch {
      setMsg("保存失败。");
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-600">加载中…</p>;
  }
  if (!data || !pricing) {
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
      <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
        <p className="text-sm font-semibold text-zinc-800">统一定价模板（MVP）</p>
        <p className="mt-1 text-xs text-zinc-500">用于商品展示价与下单金额统一计算，后续可对接 ERP 报价策略。</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs text-zinc-600">全局加价比例（%）</span>
            <input
              type="number"
              value={pricing.markup_percent}
              onChange={(e) =>
                setPricing({ ...pricing, markup_percent: Number(e.target.value) || 0 })
              }
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-zinc-600">基础运费（JPY）</span>
            <input
              type="number"
              value={pricing.shipping_fee_base}
              onChange={(e) =>
                setPricing({ ...pricing, shipping_fee_base: Math.max(0, Number(e.target.value) || 0) })
              }
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-zinc-600">包邮件数阈值</span>
            <input
              type="number"
              value={pricing.free_shipping_qty}
              onChange={(e) =>
                setPricing({ ...pricing, free_shipping_qty: Math.max(1, Number(e.target.value) || 1) })
              }
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs text-zinc-600">≥10 件折扣（%）</span>
            <input
              type="number"
              value={pricing.discount_qty_10}
              onChange={(e) =>
                setPricing({ ...pricing, discount_qty_10: Math.max(0, Number(e.target.value) || 0) })
              }
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-zinc-600">≥50 件折扣（%）</span>
            <input
              type="number"
              value={pricing.discount_qty_50}
              onChange={(e) =>
                setPricing({ ...pricing, discount_qty_50: Math.max(0, Number(e.target.value) || 0) })
              }
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-zinc-600">≥200 件折扣（%）</span>
            <input
              type="number"
              value={pricing.discount_qty_200}
              onChange={(e) =>
                setPricing({ ...pricing, discount_qty_200: Math.max(0, Number(e.target.value) || 0) })
              }
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
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
