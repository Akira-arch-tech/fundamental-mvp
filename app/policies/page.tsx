import Link from "next/link";
import type { Metadata } from "next";
import { PoliciesMarkdown } from "@/components/PoliciesMarkdown";
import { loadPolicyMarkdown } from "@/lib/load-policy-markdown";
import {
  DEFAULT_POLICY_DOC_ID,
  POLICIES_HUB_SUBTITLE,
  POLICIES_HUB_TITLE,
  POLICY_DOCUMENTS,
  POLICY_LOCALES,
  type PolicyLocale,
  getPolicyDocMeta,
  isPolicyLocale,
} from "@/lib/policies-registry";

const UI: Record<
  PolicyLocale,
  { docIndex: string; version: string; updated: string; devNote: string }
> = {
  zh: {
    docIndex: "政策目录",
    version: "版本",
    updated: "更新",
    devNote:
      "维护：新增或修订政策时，请编辑 content/policies/ 下 Markdown，并在 lib/policies-registry.ts 注册条目。",
  },
  en: {
    docIndex: "Index",
    version: "Version",
    updated: "Updated",
    devNote:
      "Maintainers: add Markdown under content/policies/ and register entries in lib/policies-registry.ts.",
  },
  ja: {
    docIndex: "文書一覧",
    version: "版",
    updated: "更新",
    devNote:
      "運用：追加・改訂は content/policies/ の Markdown と lib/policies-registry.ts の登録を更新してください。",
  },
  ko: {
    docIndex: "문서 목록",
    version: "버전",
    updated: "최종 수정",
    devNote:
      "유지보수: content/policies/의 Markdown과 lib/policies-registry.ts 등록을 갱신하세요.",
  },
};

export const metadata: Metadata = {
  title: "FUNDAMENTAL — 平台政策与规则",
  description: "Platform policies and rules (ZH / EN / JA / KO)",
};

export default async function PoliciesPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; doc?: string }>;
}) {
  const sp = await searchParams;
  const lang: PolicyLocale = isPolicyLocale(sp.lang) ? sp.lang : "zh";
  const docId =
    typeof sp.doc === "string" && getPolicyDocMeta(sp.doc)
      ? sp.doc
      : DEFAULT_POLICY_DOC_ID;
  const meta = getPolicyDocMeta(docId)!;
  const markdown = loadPolicyMarkdown(docId, lang);
  const ui = UI[lang];

  function hrefFor(next: { lang?: PolicyLocale; doc?: string }) {
    const params = new URLSearchParams();
    params.set("lang", next.lang ?? lang);
    params.set("doc", next.doc ?? docId);
    return `/policies?${params.toString()}`;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-zinc-900">{POLICIES_HUB_TITLE[lang]}</h1>
      <p className="mt-2 text-sm text-zinc-600">{POLICIES_HUB_SUBTITLE[lang]}</p>

      <div
        className="mt-6 flex flex-wrap gap-2 border-b border-zinc-200 pb-4"
        role="tablist"
        aria-label="Language"
      >
        {POLICY_LOCALES.map((l) => (
          <Link
            key={l.id}
            href={hrefFor({ lang: l.id })}
            scroll={false}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              lang === l.id
                ? "bg-[#e85c22] text-white"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            }`}
            role="tab"
            aria-selected={lang === l.id}
          >
            {l.label}
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-16 lg:self-start">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {ui.docIndex}
          </h2>
          <ul className="mt-3 space-y-2">
            {POLICY_DOCUMENTS.map((d) => (
              <li key={d.id}>
                <Link
                  href={hrefFor({ doc: d.id })}
                  scroll={false}
                  className={`block rounded-lg border px-3 py-2 text-sm transition ${
                    docId === d.id
                      ? "border-[#e85c22] bg-orange-50 text-zinc-900"
                      : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                  }`}
                >
                  <span className="font-medium">{d.titles[lang]}</span>
                  <span className="mt-1 block text-xs text-zinc-500">{d.summaries[lang]}</span>
                  <span className="mt-1 block text-[10px] text-zinc-400">
                    {ui.version} {d.version} · {ui.updated} {d.updated}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[10px] leading-relaxed text-zinc-400">{ui.devNote}</p>
        </aside>

        <section className="min-w-0 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <header className="mb-6 border-b border-zinc-100 pb-4">
            <h2 className="text-xl font-semibold text-zinc-900">{meta.titles[lang]}</h2>
            <p className="mt-1 text-xs text-zinc-500">
              {meta.id} · {ui.version} {meta.version} · {ui.updated} {meta.updated}
            </p>
          </header>
          <PoliciesMarkdown source={markdown} />
        </section>
      </div>
    </div>
  );
}
