"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type GenerationMode = "t2i" | "i2i" | "multi_ref";

type GenerationRecord = {
  generation_id: string;
  mode: GenerationMode;
  status: "queued" | "running" | "success" | "failed";
  provider: "dashscope" | "mock";
  model: string;
  request_id: string;
  provider_request_id: string | null;
  prompt: string;
  reference_asset_ids: string[];
  outputs: Array<{ image_url: string; width: number | null; height: number | null; created_at: string }>;
  error_code: string | null;
  message: string | null;
  created_at: string;
};

const card = "rounded-2xl border border-amber-100 bg-white p-4 shadow-sm shadow-amber-950/5";

export default function BackofficeGenerationsPage() {
  const router = useRouter();
  const [mode, setMode] = useState<GenerationMode>("t2i");
  const [prompt, setPrompt] = useState("应援风格钥匙扣主图，明亮、可爱、日系");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [refsRaw, setRefsRaw] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [requestId, setRequestId] = useState("");
  const [items, setItems] = useState<GenerationRecord[]>([]);

  const refs = useMemo(
    () =>
      refsRaw
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    [refsRaw],
  );

  const load = useCallback(async () => {
    const res = await fetch("/api/backoffice/generations?limit=20", { credentials: "include" });
    if (res.status === 401) {
      router.push("/b/login");
      return;
    }
    const json = (await res.json()) as {
      items?: GenerationRecord[];
      requestId?: string;
      message?: string;
    };
    if (!res.ok) {
      setError(json.message ?? "加载失败");
      return;
    }
    setItems(json.items ?? []);
    setRequestId(json.requestId ?? "");
  }, [router]);

  async function onRefresh() {
    setRefreshing(true);
    setError("");
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMsg("");
    try {
      const body: {
        mode: GenerationMode;
        prompt: string;
        negative_prompt?: string;
        reference_asset_ids?: string[];
      } = {
        mode,
        prompt: prompt.trim(),
      };
      if (negativePrompt.trim()) body.negative_prompt = negativePrompt.trim();
      if (refs.length > 0) body.reference_asset_ids = refs;

      const res = await fetch("/api/backoffice/generations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as {
        generation?: GenerationRecord;
        requestId?: string;
        code?: string;
        message?: string;
      };
      if (res.status === 401) {
        router.push("/b/login");
        return;
      }
      if (!res.ok) {
        setError(`${json.code ?? "ERROR"}: ${json.message ?? "生成失败"}`);
        return;
      }
      setRequestId(json.requestId ?? "");
      const current = json.generation;
      if (current) {
        setItems((prev) => [current, ...prev.filter((x) => x.generation_id !== current.generation_id)].slice(0, 20));
      }
      setMsg(`本次生成完成：${current?.generation_id ?? "—"}（${current?.provider ?? "—"}）`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800/70">AIGC</p>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">生图网关测试台</h1>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-zinc-600">
            用同一入口测试 T2I / I2I / Multi-ref。轻 MVP 模式优先展示本次结果，不依赖服务端持久化。
          </p>
        </div>
        <button
          type="button"
          onClick={() => void onRefresh()}
          disabled={refreshing}
          className="rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-50 disabled:opacity-50"
        >
          {refreshing ? "刷新中…" : "刷新列表"}
        </button>
      </div>

      <form onSubmit={onSubmit} className={card}>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm text-zinc-700">
            模式
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as GenerationMode)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="t2i">t2i（文生图）</option>
              <option value="i2i">i2i（图生图）</option>
              <option value="multi_ref">multi_ref（多图组合）</option>
            </select>
          </label>

          <label className="text-sm text-zinc-700">
            参考图 ID / URL（逗号分隔）
            <input
              value={refsRaw}
              onChange={(e) => setRefsRaw(e.target.value)}
              placeholder={mode === "t2i" ? "t2i 留空" : "https://... 或 picsum:10,picsum:20"}
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <label className="mt-3 block text-sm text-zinc-700">
          Prompt
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="mt-3 block text-sm text-zinc-700">
          Negative Prompt（可选）
          <input
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-[#e85c22] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d14f1b] disabled:opacity-50"
          >
            {loading ? "生成中…" : "发起生成"}
          </button>
          {requestId ? <span className="text-xs text-zinc-500">requestId: {requestId}</span> : null}
        </div>
        {msg ? <p className="mt-2 text-xs text-emerald-700">{msg}</p> : null}
        {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
      </form>

      <div className="mt-6 space-y-3">
        {items.map((it) => (
          <article key={it.generation_id} className={card}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-zinc-900">
                {it.generation_id} · {it.mode} · {it.status}
              </p>
              <p className="text-xs text-zinc-500">
                provider={it.provider} · model={it.model}
              </p>
            </div>
            <p className="mt-1 text-xs text-zinc-600">{it.prompt}</p>
            <p className="mt-1 text-[11px] text-zinc-500">
              refs: {it.reference_asset_ids.length > 0 ? it.reference_asset_ids.join(", ") : "—"} · request: {it.request_id}
              {it.provider_request_id ? ` · provider_request: ${it.provider_request_id}` : ""}
            </p>
            {it.error_code ? <p className="mt-2 text-xs text-red-600">{it.error_code}: {it.message ?? "生成失败"}</p> : null}

            {it.outputs.length > 0 ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {it.outputs.map((o, idx) => (
                  <a
                    key={`${it.generation_id}_${idx}`}
                    href={o.image_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50"
                  >
                    <img src={o.image_url} alt={`generation ${it.generation_id} ${idx + 1}`} className="h-40 w-full object-cover" />
                    <p className="px-2 py-1 text-[11px] text-zinc-600">
                      {o.width ?? "?"} × {o.height ?? "?"}
                    </p>
                  </a>
                ))}
              </div>
            ) : null}
          </article>
        ))}

        {items.length === 0 ? (
          <div className={`${card} text-xs text-zinc-500`}>还没有生成记录，先发起一条任务。</div>
        ) : null}
      </div>
    </div>
  );
}

