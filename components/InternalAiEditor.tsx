"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AiArtifactRecord } from "@/lib/ai-artifacts-store";

const IFRAME_LOAD_MS = 8000;

interface InternalAiEditorProps {
  /** 嵌入的超合体 / 外部创作中心地址 */
  embedUrl: string;
}

type SceneStatus = "draft" | "review_pending" | "published";
type SceneItem = {
  scene_id: string;
  version: number;
  store_id: string;
  product_id: string;
  status: SceneStatus;
  audit: { updated_at: string };
};

export function InternalAiEditor({ embedUrl }: InternalAiEditorProps) {
  const [iframeTick, setIframeTick] = useState(0);
  const [iframeStatus, setIframeStatus] = useState<"loading" | "loaded" | "maybe_blocked">("loading");
  /** 用户关闭「可能被拒绝」蒙层后，不再自动盖住 iframe */
  const [dismissBlockedOverlay, setDismissBlockedOverlay] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [taskId, setTaskId] = useState("");
  const [assetUrl, setAssetUrl] = useState("");
  /** 可选：ord_… 或 FDM-… 订单号，保存时追加一行到该订单的买家/运营备注字段 note */
  const [orderRef, setOrderRef] = useState("");
  /** 可选：p1 或 slug；须配合 https 素材 URL，写入该商品 cover（列表/商详） */
  const [productRef, setProductRef] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveErr, setSaveErr] = useState(false);
  const [history, setHistory] = useState<AiArtifactRecord[]>([]);
  const [sceneId, setSceneId] = useState("");
  const [sceneStoreId, setSceneStoreId] = useState("store_demo");
  const [sceneProductId, setSceneProductId] = useState("p1");
  const [sceneStatus, setSceneStatus] = useState<SceneStatus>("draft");
  const [sceneSaving, setSceneSaving] = useState(false);
  const [sceneMsg, setSceneMsg] = useState("");
  const [sceneErr, setSceneErr] = useState(false);
  const [sceneHistory, setSceneHistory] = useState<SceneItem[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/backoffice/ai-artifacts?limit=12", { credentials: "include" });
      const json = (await res.json()) as { items?: AiArtifactRecord[] };
      if (res.ok && json.items) setHistory(json.items);
    } catch {
      /* ignore */
    }
  }, []);

  const loadSceneHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/backoffice/ai-scenes?limit=8", { credentials: "include" });
      const json = (await res.json()) as { items?: SceneItem[] };
      if (res.ok && json.items) setSceneHistory(json.items);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadHistory();
    void loadSceneHistory();
  }, [loadHistory, loadSceneHistory]);

  useEffect(() => {
    setDismissBlockedOverlay(false);
    setIframeStatus("loading");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIframeStatus((s) => (s === "loading" ? "maybe_blocked" : s));
    }, IFRAME_LOAD_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [embedUrl, iframeTick]);

  function onIframeLoad() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIframeStatus("loaded");
  }

  async function onSaveHandoff() {
    setSaving(true);
    setSaveMsg("");
    setSaveErr(false);
    try {
      const hadOrder = Boolean(orderRef.trim());
      const hadProduct = Boolean(productRef.trim());
      const res = await fetch("/api/backoffice/ai-artifacts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: taskId || undefined,
          asset_url: assetUrl || undefined,
          note: note || undefined,
          order_ref: orderRef.trim() || undefined,
          product_ref: productRef.trim() || undefined,
        }),
      });
      const json = (await res.json()) as { message?: string; code?: string };
      if (!res.ok) throw new Error(json.message ?? json.code ?? "保存失败");
      if (!hadOrder && !hadProduct) {
        setSaveMsg("已登记到 FUNDAMENTAL 内部记录，可在下方查看。");
      } else {
        const bits = ["已登记内部记录"];
        if (hadOrder) bits.push("已写入对应订单备注（订单工作台可查看）");
        if (hadProduct) bits.push("已更新商品封面（买家前台列表/商详可见）");
        setSaveMsg(`${bits.join("，")}。`);
      }
      setTaskId("");
      setAssetUrl("");
      setOrderRef("");
      setProductRef("");
      setNote("");
      await loadHistory();
    } catch (e) {
      setSaveErr(true);
      setSaveMsg(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function onSaveScene() {
    setSceneSaving(true);
    setSceneMsg("");
    setSceneErr(false);
    try {
      const id = sceneId.trim() || `scene_${Date.now().toString(36)}`;
      const scene = {
        scene_id: id,
        store_id: sceneStoreId.trim() || "store_demo",
        product_id: sceneProductId.trim() || "p1",
        status: sceneStatus,
        canvas: {
          width: 1200,
          height: 1200,
          safe_area: { top: 80, right: 80, bottom: 80, left: 80 },
          bleed: { top: 24, right: 24, bottom: 24, left: 24 },
        },
        layers: [
          {
            id: "layer_title",
            type: "text",
            z_index: 2,
            transform: { x: 120, y: 120, scale: 1, rotate: 0 },
            style: { fontSize: 36, color: "#111827", fontWeight: 700 },
            text: note.trim() || "FUNDAMENTAL AI Scene",
          },
          ...(assetUrl.trim()
            ? [
                {
                  id: "layer_cover",
                  type: "image",
                  z_index: 1,
                  transform: { x: 200, y: 220, scale: 1, rotate: 0 },
                  style: { fit: "cover" },
                  asset_id: "asset_cover",
                },
              ]
            : []),
        ],
        assets: assetUrl.trim()
          ? [{ asset_id: "asset_cover", source: "ai", url: assetUrl.trim(), license: null }]
          : [],
        ai_actions: taskId.trim()
          ? [
              {
                action_type: "generate_cover",
                prompt_ref: "internal-ai-editor/manual",
                provider: "chaoheti",
                request_id: `req_scene_${Date.now().toString(36)}`,
                result_ref: taskId.trim(),
              },
            ]
          : [],
        publish_targets: [
          ...(productRef.trim() ? [{ target_type: "product_cover", target_id: productRef.trim() }] : []),
          ...(orderRef.trim() ? [{ target_type: "order_note", target_id: orderRef.trim() }] : []),
        ],
      };
      const res = await fetch("/api/backoffice/ai-scenes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene }),
      });
      const json = (await res.json()) as { message?: string; code?: string };
      if (!res.ok) throw new Error(json.message ?? json.code ?? "Scene 保存失败");
      setSceneId(id);
      setSceneMsg("Scene 已保存并生成版本快照。");
      await loadSceneHistory();
    } catch (e) {
      setSceneErr(true);
      setSceneMsg(e instanceof Error ? e.message : "Scene 保存失败");
    } finally {
      setSceneSaving(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-10rem)] flex-col gap-4 lg:flex-row lg:gap-5">
      <aside className="w-full shrink-0 space-y-4 lg:max-w-[300px]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-900/75">FUNDAMENTAL</p>
          <h1 className="text-lg font-bold text-zinc-900">内部 AI 编辑器</h1>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600">
            右侧嵌入超合体创作中心（同源策略下可能被拒绝，属正常现象）。请善用「新窗口打开」与下方回写登记。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={embedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-full bg-[#e85c22] px-4 py-2 text-xs font-bold text-white hover:bg-[#d14f1b]"
          >
            新窗口打开创作中心
          </a>
          <button
            type="button"
            onClick={() => {
              setIframeTick((n) => n + 1);
            }}
            className="rounded-full border border-amber-200 bg-white px-3 py-2 text-xs font-medium text-amber-950 hover:bg-amber-50"
          >
            刷新嵌入
          </button>
        </div>
        <div className="rounded-xl border border-amber-100 bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold text-zinc-800">回写登记（PRD §8.4 手动关联）</p>
          <label className="mt-2 block">
            <span className="text-[11px] text-zinc-500">任务 ID（可选）</span>
            <input
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              placeholder="例 batch_xxx / task_xxx"
              className="mt-0.5 w-full rounded border border-zinc-200 px-2 py-1.5 text-xs"
            />
          </label>
          <label className="mt-2 block">
            <span className="text-[11px] text-zinc-500">素材 URL（可选）</span>
            <input
              value={assetUrl}
              onChange={(e) => setAssetUrl(e.target.value)}
              placeholder="https://..."
              className="mt-0.5 w-full rounded border border-zinc-200 px-2 py-1.5 text-xs"
            />
          </label>
          <label className="mt-2 block">
            <span className="text-[11px] text-zinc-500">关联订单（可选）</span>
            <input
              value={orderRef}
              onChange={(e) => setOrderRef(e.target.value)}
              placeholder="ord_… 或订单号 FDM-…"
              className="mt-0.5 w-full rounded border border-zinc-200 px-2 py-1.5 text-xs font-mono"
            />
            <span className="mt-0.5 block text-[10px] text-zinc-500">
              填写后会把本行 AI 交接摘要追加到该订单的「备注」字段，便于履约对照。
            </span>
          </label>
          <label className="mt-2 block">
            <span className="text-[11px] text-zinc-500">关联商品（可选）</span>
            <input
              value={productRef}
              onChange={(e) => setProductRef(e.target.value)}
              placeholder="p1 或 slug，如 free-acrylic-stand-clear"
              className="mt-0.5 w-full rounded border border-zinc-200 px-2 py-1.5 text-xs font-mono"
            />
            <span className="mt-0.5 block text-[10px] text-zinc-500">
              须与上方「素材 URL」同时填写（https）。会覆盖该 SKU 在店铺里的封面图与商详首图（演示存在本地 .fdm-product-ai-cover.json）。
            </span>
          </label>
          <label className="mt-2 block">
            <span className="text-[11px] text-zinc-500">备注</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-0.5 w-full rounded border border-zinc-200 px-2 py-1.5 text-xs"
            />
          </label>
          <p className="mt-1 text-[10px] text-zinc-500">至少填写任务 ID 或素材 URL 其一。</p>
          <button
            type="button"
            disabled={saving || (!taskId.trim() && !assetUrl.trim())}
            onClick={() => void onSaveHandoff()}
            className="mt-2 w-full rounded-full bg-amber-900 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {saving ? "保存中…" : "登记到内部"}
          </button>
          {saveMsg ? (
            <p className={`mt-2 text-[11px] ${saveErr ? "text-red-700" : "text-emerald-800"}`}>{saveMsg}</p>
          ) : null}
        </div>
        <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-3">
          <p className="text-xs font-semibold text-zinc-800">最近登记</p>
          <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto text-[11px] text-zinc-600">
            {history.length === 0 ? <li className="text-zinc-400">暂无</li> : null}
            {history.map((h) => (
              <li key={h.id} className="border-b border-zinc-100 pb-1 last:border-0">
                {h.linked_order_id ? (
                  <Link
                    href={`/b/orders/o/${h.linked_order_id}`}
                    className="mb-0.5 block text-[10px] font-medium text-[#c2410c] underline"
                  >
                    查看关联订单 →
                  </Link>
                ) : null}
                {h.linked_product_slug ? (
                  <Link
                    href={`/products/${h.linked_product_slug}`}
                    className="mb-0.5 block text-[10px] font-medium text-emerald-800 underline"
                  >
                    查看买家商详（封面已更新）→
                  </Link>
                ) : null}
                {h.task_id ? <span className="font-mono text-zinc-800">{h.task_id}</span> : null}
                {h.asset_url ? (
                  <a href={h.asset_url} target="_blank" rel="noreferrer" className="ml-1 break-all text-[#c2410c] underline">
                    链接
                  </a>
                ) : null}
                {h.note ? <span className="block text-zinc-500">{h.note}</span> : null}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
          <p className="text-xs font-semibold text-zinc-800">Scene JSON 快照（MVP）</p>
          <label className="mt-2 block">
            <span className="text-[11px] text-zinc-500">scene_id</span>
            <input
              value={sceneId}
              onChange={(e) => setSceneId(e.target.value)}
              placeholder="留空自动生成 scene_xxx"
              className="mt-0.5 w-full rounded border border-zinc-200 px-2 py-1.5 text-xs font-mono"
            />
          </label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[11px] text-zinc-500">store_id</span>
              <input
                value={sceneStoreId}
                onChange={(e) => setSceneStoreId(e.target.value)}
                className="mt-0.5 w-full rounded border border-zinc-200 px-2 py-1.5 text-xs font-mono"
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-zinc-500">product_id</span>
              <input
                value={sceneProductId}
                onChange={(e) => setSceneProductId(e.target.value)}
                className="mt-0.5 w-full rounded border border-zinc-200 px-2 py-1.5 text-xs font-mono"
              />
            </label>
          </div>
          <label className="mt-2 block">
            <span className="text-[11px] text-zinc-500">status</span>
            <select
              value={sceneStatus}
              onChange={(e) => setSceneStatus(e.target.value as SceneStatus)}
              className="mt-0.5 w-full rounded border border-zinc-200 px-2 py-1.5 text-xs"
            >
              <option value="draft">draft</option>
              <option value="review_pending">review_pending</option>
              <option value="published">published</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => void onSaveScene()}
            disabled={sceneSaving}
            className="mt-2 w-full rounded-full bg-emerald-700 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {sceneSaving ? "保存 Scene 中…" : "保存 Scene JSON 快照"}
          </button>
          {sceneMsg ? (
            <p className={`mt-2 text-[11px] ${sceneErr ? "text-red-700" : "text-emerald-800"}`}>{sceneMsg}</p>
          ) : null}
          <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-[11px] text-zinc-600">
            {sceneHistory.map((s) => (
              <li key={`${s.scene_id}_${s.version}`} className="rounded bg-white px-2 py-1">
                <span className="font-mono">{s.scene_id}</span> v{s.version} · {s.status}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <section className="relative min-h-[420px] flex-1 overflow-hidden rounded-2xl border border-amber-200/80 bg-zinc-900/5 shadow-inner lg:min-h-[72vh]">
        {iframeStatus === "maybe_blocked" && !dismissBlockedOverlay ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/95 p-6 text-center">
            <p className="text-sm font-medium text-zinc-800">嵌入可能被目标站拒绝（X-Frame-Options）</p>
            <p className="max-w-md text-xs text-zinc-600">
              请点击「新窗口打开创作中心」在独立标签完成生图；完成后用左侧「回写登记」把任务 ID / 素材 URL 记入 FUNDAMENTAL。
            </p>
            <a
              href={embedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-[#e85c22] px-5 py-2 text-sm font-bold text-white"
            >
              打开创作中心
            </a>
            <button
              type="button"
              className="text-xs text-zinc-500 underline"
              onClick={() => {
                setDismissBlockedOverlay(true);
                setIframeStatus("loaded");
              }}
            >
              仍尝试显示嵌入（关闭此提示）
            </button>
          </div>
        ) : null}
        {iframeStatus === "loading" ? (
          <div className="pointer-events-none absolute left-3 top-3 z-[1] rounded bg-black/60 px-2 py-1 text-[10px] text-white">
            嵌入加载中…
          </div>
        ) : null}
        <iframe
          key={iframeTick}
          title="FUNDAMENTAL 内部 AI 编辑器 — 嵌入创作中心"
          src={embedUrl}
          className="h-full min-h-[420px] w-full border-0 lg:min-h-[72vh]"
          referrerPolicy="no-referrer-when-downgrade"
          allow="clipboard-read; clipboard-write; fullscreen"
          onLoad={onIframeLoad}
        />
      </section>
    </div>
  );
}
