import { SPEC_TEMPLATE_SEED } from "@/data/spec-templates";

export default function SpecTemplatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-amber-950">规格模板库（种子数据）</h1>
        <p className="mt-1 text-sm text-amber-900/75">
          PRD v1.0 第二章：亚克力立牌 / 徽章 / 围巾毛巾等行业 SKU 要点。当前为只读演示，后续可接 DB 与批量变体展开。
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {SPEC_TEMPLATE_SEED.map((t) => (
          <article
            key={t.id}
            className="rounded-xl border border-amber-200/80 bg-white/90 p-4 shadow-sm"
          >
            <p className="text-xs font-mono text-amber-800/70">{t.id}</p>
            <h2 className="mt-1 text-lg font-semibold text-amber-950">{t.name_ja}</h2>
            <p className="mt-2 text-xs uppercase tracking-wide text-amber-800/60">category: {t.category}</p>
            <ul className="mt-2 list-inside list-disc text-sm text-amber-900">
              {t.industry_notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-amber-900/70">
              尺寸枚举（mm）: {t.size_options_mm.join(", ")}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
