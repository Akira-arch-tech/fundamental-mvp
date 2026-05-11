"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { RemoteSafeFillImage } from "@/components/RemoteSafeImage";
import {
  canSelectSpecValue,
  isSpecCombinationAllowedByMap,
} from "@/lib/spec-combination-whitelist";
import type { ProductDetail } from "@/lib/types";

export function ProductDetailClient({ product }: { product: ProductDetail }) {
  const [imgIdx, setImgIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [addMsg, setAddMsg] = useState("");
  const initialSelections = useMemo(() => {
    const s: Record<string, string> = {};
    for (const spec of product.spec_schema) {
      if (spec.values[0]) s[spec.id] = spec.values[0].id;
    }
    return s;
  }, [product]);
  const [sel, setSel] = useState(initialSelections);
  const currentSelectionAllowed = useMemo(
    () => isSpecCombinationAllowedByMap(product.product_id, sel),
    [product.product_id, sel],
  );

  const optionPrice = useMemo(() => {
    let extra = 0;
    for (const spec of product.spec_schema) {
      const vid = sel[spec.id];
      const v = spec.values.find((x) => x.id === vid);
      extra += v?.price_delta ?? 0;
    }
    return extra;
  }, [product.spec_schema, sel]);

  const unitPrice = product.price_from + optionPrice;

  const selectedSpecs = useMemo(
    () =>
      product.spec_schema
        .map((spec) => {
          const selected = spec.values.find((x) => x.id === sel[spec.id]);
          if (!selected) return null;
          return {
            spec_id: spec.id,
            spec_label: spec.label,
            value_id: selected.id,
            value_label: selected.label,
          };
        })
        .filter(Boolean),
    [product.spec_schema, sel],
  );

  const selectedSkuCode = useMemo(() => {
    for (const spec of product.spec_schema) {
      const selected = spec.values.find((x) => x.id === sel[spec.id]);
      if (selected?.sku_code) return selected.sku_code;
    }
    return product.product_id;
  }, [product.product_id, product.spec_schema, sel]);

  async function onAddToCart() {
    setAdding(true);
    setAddMsg("");
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: product.product_id,
          qty,
          selected_specs: selectedSpecs,
          source_sku_code: selectedSkuCode,
          added_from: "product",
        }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { message?: string };
        throw new Error(err.message ?? "カート追加に失敗しました");
      }
      setAddMsg("カートに追加しました");
    } catch (e) {
      setAddMsg(e instanceof Error ? e.message : "カート追加に失敗しました");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div>
        <div className="relative aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
          <RemoteSafeFillImage
            src={product.gallery[imgIdx] ?? product.cover_url}
            alt={product.title}
            className="object-cover"
            priority
            sizes="(max-width:1024px) 100vw, 50vw"
          />
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {product.gallery.map((url, i) => (
            <button
              key={`${url}-${i}`}
              type="button"
              onClick={() => setImgIdx(i)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 ${
                i === imgIdx ? "border-[#e85c22]" : "border-transparent"
              }`}
            >
              <RemoteSafeFillImage src={url} alt="" className="object-cover" sizes="64px" />
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-zinc-900">{product.title}</h1>
        <p className="text-sm leading-relaxed text-zinc-600">{product.description}</p>
        <div className="rounded-lg bg-orange-50 p-4">
          <p className="text-xs text-zinc-600">表示価格（デモ）</p>
          <p className="text-2xl font-bold text-[#e85c22]">
            ¥{unitPrice.toLocaleString("ja-JP")}
            <span className="text-base font-normal">〜</span>
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            納期目安：{product.lead_time_rules[0]?.days ?? product.lead_time_days}
            日
          </p>
          {product.lead_time_rules.length > 1 ? (
            <ul className="mt-2 space-y-0.5 border-t border-orange-100 pt-2 text-xs text-zinc-600">
              {product.lead_time_rules.map((r) => (
                <li key={r.label}>
                  ・{r.label}：{r.days}日
                  {r.condition ? `（${r.condition}）` : ""}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {product.spec_schema.map((spec) => (
          <div key={spec.id}>
            <p className="mb-2 text-sm font-semibold text-zinc-800">{spec.label}</p>
            <div className="flex flex-wrap gap-2">
              {spec.values.map((v) => {
                const active = sel[spec.id] === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      setSel((s) => ({ ...s, [spec.id]: v.id }));
                      setAddMsg("");
                    }}
                    disabled={
                      sel[spec.id] !== v.id &&
                      !canSelectSpecValue(product.product_id, sel, spec.id, v.id)
                    }
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      active
                        ? "border-[#e85c22] bg-[#e85c22] text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400 disabled:hover:border-zinc-200"
                    }`}
                  >
                    {v.label}
                    {v.price_delta ? (
                      <span className="ml-1 text-xs opacity-90">
                        +¥{v.price_delta}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {!currentSelectionAllowed ? (
          <p className="text-xs text-amber-600">
            この仕様の組み合わせではご注文いただけません。サイズや加工を変更してください。
          </p>
        ) : null}

        <div className="sticky bottom-0 flex flex-col gap-2 border-t border-zinc-100 bg-white/95 py-4 lg:static lg:border-0 lg:bg-transparent lg:p-0">
          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-600">数量</label>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
              className="w-20 rounded border border-zinc-300 px-2 py-1 text-sm"
            />
            <button
              type="button"
              onClick={onAddToCart}
              disabled={adding}
              className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-300 px-4 text-xs font-semibold text-zinc-700 hover:border-zinc-400 disabled:opacity-50"
            >
              {adding ? "追加中..." : "SKUでカート追加"}
            </button>
            <Link href="/cart" className="text-xs text-[#e85c22] hover:underline">
              カートを見る
            </Link>
          </div>
          {addMsg ? <p className="text-xs text-zinc-500">{addMsg}</p> : null}
          <Link
            href={`/customize/${product.product_id}`}
            className="inline-flex h-12 items-center justify-center rounded-full bg-[#e85c22] text-center text-sm font-bold text-white shadow hover:bg-[#d14f1b]"
          >
            デザインを始める
          </Link>
          <p className="text-center text-xs text-zinc-500">次のステップでデザインを編集し、カートへ進みます。</p>
        </div>

        <section>
          <h2 className="mb-2 text-sm font-bold text-zinc-800">数量別目安</h2>
          <ul className="space-y-1 text-sm text-zinc-600">
            {product.pricing_rules.map((r) => (
              <li key={r.min_qty}>
                {r.label ?? `${r.min_qty}点〜`}：¥{r.unit_price.toLocaleString("ja-JP")}
                /点
              </li>
            ))}
          </ul>
        </section>

        {product.faq.length > 0 ? (
          <section>
            <h2 className="mb-2 text-sm font-bold text-zinc-800">FAQ</h2>
            <div className="space-y-2">
              {product.faq.map((f, i) => (
                <details
                  key={i}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
                >
                  <summary className="cursor-pointer text-sm font-medium text-zinc-800">
                    {f.q}
                  </summary>
                  <p className="mt-2 text-sm text-zinc-600">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
