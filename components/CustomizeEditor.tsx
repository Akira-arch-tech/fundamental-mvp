"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FabricCanvas } from "@/components/FabricCanvas";
import type { FabricCanvasHandle } from "@/components/FabricCanvas";
import type { AigcCandidate } from "@/lib/aigc-types";
import { AIGC_GENERATIONS_API_PATH, AIGC_MAX_CANDIDATE_COUNT, AIGC_MAX_REFERENCE_ASSET_COUNT, AIGC_MIN_CANDIDATE_COUNT, AIGC_REFERENCE_ASSETS_API_PATH } from "@/lib/aigc-shared-constants";
import { writeFdmAigcLastToWindow } from "@/lib/shop-aigc-persist";
import { storePath } from "@/lib/storefront-constants";
import type { ProductDetail } from "@/lib/types";

// ---------------------------------------------------------------------------
// Product base layer — rendered at z=0, pointer-events-none, never exported
// ---------------------------------------------------------------------------
function ProductBaseLayer({
  templateId,
  color,
  printArea,
}: {
  templateId: string;
  color: string;
  printArea: "front" | "back";
}) {
  const isAcrylic =
    templateId.includes("acrylic") ||
    templateId.includes("tote_square") ||
    templateId.includes("cheki");
  const isTshirt = templateId.includes("tshirt");
  const isTowel = templateId.includes("towel");

  // Acrylic plate + stand
  if (isAcrylic) {
    const fill =
      color === "transparent"
        ? "url(#acrylic-clear)"
        : color === "#18181b"
          ? "#1a1a1a"
          : color;
    return (
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <linearGradient id="acrylic-clear" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e8f4ff" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#f0faff" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="acrylic-gloss" x1="0" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.45" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <filter id="acrylic-shadow">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.18" />
          </filter>
        </defs>
        {/* Plate */}
        <rect
          x="55" y="18" width="90" height="130"
          rx="10" ry="10"
          fill={fill}
          stroke="rgba(180,210,240,0.7)"
          strokeWidth="1.5"
          filter="url(#acrylic-shadow)"
        />
        {/* Gloss overlay */}
        <rect
          x="55" y="18" width="90" height="130"
          rx="10" ry="10"
          fill="url(#acrylic-gloss)"
        />
        {/* Print area indicator */}
        <rect
          x="65" y="28" width="70" height="110"
          rx="6" ry="6"
          fill="none"
          stroke="rgba(100,160,220,0.35)"
          strokeWidth="1"
          strokeDasharray="4 3"
        />
        {/* Stand neck */}
        <rect x="98" y="148" width="4" height="16" rx="2" fill="#c0c8d0" />
        {/* Stand base */}
        <rect x="75" y="164" width="50" height="10" rx="5" fill="#c8cdd5" />
      </svg>
    );
  }

  // T-shirt
  if (isTshirt) {
    // Print area rect: front chest vs back
    const printX = 65;
    const printY = printArea === "front" ? 72 : 65;
    const printW = 70;
    const printH = printArea === "front" ? 65 : 80;

    return (
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <filter id="shirt-shadow">
            <feDropShadow dx="0" dy="3" stdDeviation="5" floodOpacity="0.14" />
          </filter>
        </defs>
        {/* T-shirt body — viewBox scaled to 200×200, shirt centered */}
        <g transform="translate(20, 10) scale(1.0)" filter="url(#shirt-shadow)">
          <path
            d="M80 4 C72 4 65 10 65 18 L38 12 L8 46 L36 56 L36 175 L164 175 L164 56 L192 46 L162 12 L135 18 C135 10 128 4 120 4 C112 4 105 11 105 19 L95 19 C95 11 88 4 80 4 Z"
            fill={color === "transparent" ? "#e8ecf0" : color}
            stroke="rgba(0,0,0,0.1)"
            strokeWidth="1"
          />
          {/* Collar highlight */}
          <path
            d="M95 19 C95 11 88 4 80 4 C72 4 65 10 65 18 C70 22 80 24 100 24 C120 24 130 22 135 18 C135 10 128 4 120 4 C112 4 105 11 105 19 Z"
            fill="rgba(0,0,0,0.06)"
          />
        </g>
        {/* Print area indicator */}
        <rect
          x={printX} y={printY} width={printW} height={printH}
          rx="4"
          fill="rgba(255,255,255,0.18)"
          stroke="rgba(255,255,255,0.6)"
          strokeWidth="1.5"
          strokeDasharray="5 3"
        />
        {/* "前面" / "背面" label */}
        <text
          x="100" y={printY + printH + 14}
          textAnchor="middle"
          fontSize="9"
          fill="rgba(255,255,255,0.7)"
          fontFamily="sans-serif"
        >
          {printArea === "front" ? "フロント" : "バック"}
        </text>
      </svg>
    );
  }

  // Towel — full-bleed rectangle
  if (isTowel) {
    return (
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <rect
          x="30" y="20" width="140" height="160"
          rx="6"
          fill={color === "transparent" ? "#f5f5f5" : color}
          stroke="rgba(0,0,0,0.08)"
          strokeWidth="1.5"
        />
        <rect
          x="40" y="30" width="120" height="140"
          rx="4"
          fill="none"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="1"
          strokeDasharray="5 3"
        />
      </svg>
    );
  }

  // Default — subtle background fill only
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect
        x="20" y="20" width="160" height="160"
        rx="8"
        fill={color === "transparent" ? "rgba(200,220,240,0.3)" : color}
        fillOpacity="0.15"
        stroke="rgba(150,180,210,0.4)"
        strokeWidth="1"
        strokeDasharray="6 3"
      />
    </svg>
  );
}

interface SaveResult {
  customization_id: string;
  preview_url: string;
  dpi_check_result: {
    status: "ok" | "warning";
    estimated_dpi: number;
    min_recommended_dpi: number;
    message: string;
  };
  warnings: string[];
  requestId: string;
}

type LayerType = "image" | "text";

interface BaseLayer {
  id: string;
  type: LayerType;
  name: string;
  locked: boolean;
  hidden?: boolean;
  groupId?: string;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotate: number;
}

interface ImageLayer extends BaseLayer {
  type: "image";
  dataUrl: string;
}

interface TextLayer extends BaseLayer {
  type: "text";
  text: string;
  color: string;
}

type CanvasLayer = ImageLayer | TextLayer;

interface EditorSnapshot {
  layers: CanvasLayer[];
  selectedLayerId: string | null;
}

interface DragStart {
  pointerX: number;
  pointerY: number;
  startX: number;
  startY: number;
}

interface LayerStartState {
  id: string;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotate: number;
}

type TransformMode =
  | {
      kind: "move";
      layerIds: string[];
      start: DragStart;
      startStates: LayerStartState[];
    }
  | {
      kind: "scale";
      layerIds: string[];
      startStates: LayerStartState[];
      centerX: number;
      centerY: number;
      startPointerX: number;
      startPointerY: number;
      axisX: -1 | 0 | 1;
      axisY: -1 | 0 | 1;
    }
  | {
      kind: "rotate";
      layerIds: string[];
      startStates: LayerStartState[];
      startRotate: number;
      centerX: number;
      centerY: number;
      startAngleDeg: number;
    };

export function CustomizeEditor({ product }: { product: ProductDetail }) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const fabricRef = useRef<FabricCanvasHandle | null>(null);
  const dragStartRef = useRef<DragStart | null>(null);
  const dragLayerIdRef = useRef<string | null>(null);
  const transformModeRef = useRef<TransformMode | null>(null);
  const [layers, setLayers] = useState<CanvasLayer[]>([
    {
      id: "layer_text_main",
      type: "text",
      name: "見出しテキスト",
      text: "FUNDAMENTAL",
      color: "#e85c22",
      locked: false,
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      rotate: 0,
    },
  ]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>("layer_text_main");
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>(["layer_text_main"]);
  const [historyPast, setHistoryPast] = useState<EditorSnapshot[]>([]);
  const [historyFuture, setHistoryFuture] = useState<EditorSnapshot[]>([]);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [snapGuides, setSnapGuides] = useState<{ x?: number; y?: number }>({});
  const [estimatedDpi, setEstimatedDpi] = useState(220);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [error, setError] = useState("");
  const [cartMsg, setCartMsg] = useState("");
  const [saved, setSaved] = useState<SaveResult | null>(null);

  // Unified upload — pending state before user chooses canvas or AI
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingDataUrl, setPendingDataUrl] = useState("");

  // AI design tools state
  const [fontFamily, setFontFamily] = useState("inherit");
  const [rmbgBusy, setRmbgBusy] = useState(false);
  const [rmbgMsg, setRmbgMsg] = useState("");
  const [upscaleBusy, setUpscaleBusy] = useState(false);
  const [upscaleMsg, setUpscaleMsg] = useState("");
  const [productColor, setProductColor] = useState(
    (product as { color_variants?: { value: string; label: string }[] }).color_variants?.[0]?.value ?? "#ffffff",
  );
  const [printArea, setPrintArea] = useState<"front" | "back">("front");

  // AI sticker generation state
  const [stickerKeyword, setStickerKeyword] = useState("");
  const [stickerBusy, setStickerBusy] = useState(false);
  const [stickerMsg, setStickerMsg] = useState("");
  const [stickerHistory, setStickerHistory] = useState<string[]>([]);

  /** 买家店 AIGC：`multipart` 参考图 → `POST /api/aigc/generations`（txt2img / img2img / multi_ref） */
  const [aigcPrompt, setAigcPrompt] = useState("");
  const [aigcRefFiles, setAigcRefFiles] = useState<File[]>([]);
  const [aigcJobId, setAigcJobId] = useState<string | null>(null);
  const [aigcStatus, setAigcStatus] = useState<string | null>(null);
  const [aigcDeadlineIso, setAigcDeadlineIso] = useState<string | null>(null);
  const [aigcCandidates, setAigcCandidates] = useState<AigcCandidate[]>([]);
  const [aigcPickIndex, setAigcPickIndex] = useState(0);
  const [aigcBusy, setAigcBusy] = useState(false);
  const [aigcMsg, setAigcMsg] = useState("");
  const [aigcErr, setAigcErr] = useState("");
  const [aigcMultiRef, setAigcMultiRef] = useState(false);
  const [aigcCandidateCount, setAigcCandidateCount] = useState(2);
  const [aigcNegative, setAigcNegative] = useState("");
  const [aigcSuppressText, setAigcSuppressText] = useState(true);
  const [lightboxUrl, setLightboxUrl] = useState("");
  const [aigcTick, setAigcTick] = useState(0);
  const aigcPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const aigcSecondsLeft = useMemo(() => {
    if (!aigcDeadlineIso || aigcStatus !== "ready") return null;
    const end = new Date(aigcDeadlineIso).getTime();
    return Math.max(0, Math.ceil((end - Date.now()) / 1000));
  }, [aigcDeadlineIso, aigcStatus, aigcTick]);

  useEffect(() => {
    if (aigcStatus !== "ready" || !aigcDeadlineIso) return;
    const t = setInterval(() => setAigcTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [aigcStatus, aigcDeadlineIso]);

  const clearAigcPoll = useCallback(() => {
    if (aigcPollRef.current) {
      clearInterval(aigcPollRef.current);
      aigcPollRef.current = null;
    }
  }, []);

  useEffect(() => () => clearAigcPoll(), [clearAigcPoll]);

  const selectedLayer = useMemo(
    () => layers.find((layer) => layer.id === selectedLayerId) ?? null,
    [layers, selectedLayerId],
  );
  const textLayer = useMemo(
    () => layers.find((layer): layer is TextLayer => layer.type === "text"),
    [layers],
  );

  function pushHistorySnapshot(prevLayers: CanvasLayer[], prevSelected: string | null) {
    setHistoryPast((prev) => [...prev.slice(-49), { layers: prevLayers, selectedLayerId: prevSelected }]);
    setHistoryFuture([]);
  }

  function updateEditor(
    updater: (prevLayers: CanvasLayer[]) => CanvasLayer[],
    options?: { keepSelection?: boolean },
  ) {
    setLayers((prevLayers) => {
      const nextLayers = updater(prevLayers);
      if (nextLayers === prevLayers) return prevLayers;
      pushHistorySnapshot(prevLayers, selectedLayerId);
      if (!options?.keepSelection && selectedLayerId) {
        const exists = nextLayers.some((layer) => layer.id === selectedLayerId);
        if (!exists) setSelectedLayerId(nextLayers[0]?.id ?? null);
      }
      return nextLayers;
    });
  }

  const onRmbg = useCallback(async () => {
    if (!selectedLayer || selectedLayer.type !== "image" || rmbgBusy) return;
    setRmbgBusy(true);
    setRmbgMsg("背景を削除中...");
    try {
      const res = await fetch("/api/design-tools/rmbg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: selectedLayer.dataUrl }),
      });
      const json = await res.json() as { image_url?: string; error?: string };
      if (!res.ok || !json.image_url) throw new Error(json.error ?? "rmbg failed");
      const layerId = selectedLayer.id;
      updateEditor((prev) =>
        prev.map((layer) =>
          layer.id === layerId && layer.type === "image"
            ? { ...layer, dataUrl: json.image_url! }
            : layer,
        ),
      );
      setRmbgMsg("✅ 背景を削除しました");
    } catch (e) {
      setRmbgMsg(`❌ ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRmbgBusy(false);
    }
  }, [selectedLayer, rmbgBusy, updateEditor]);

  const onUpscale = useCallback(async () => {
    if (!selectedLayer || selectedLayer.type !== "image" || upscaleBusy) return;
    setUpscaleBusy(true);
    setUpscaleMsg("AI で画質を改善中 (4×)...");
    try {
      const res = await fetch("/api/design-tools/upscale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: selectedLayer.dataUrl }),
      });
      const json = await res.json() as { image_url?: string; error?: string };
      if (!res.ok || !json.image_url) throw new Error(json.error ?? "upscale failed");
      const layerId = selectedLayer.id;
      updateEditor((prev) =>
        prev.map((layer) =>
          layer.id === layerId && layer.type === "image"
            ? { ...layer, dataUrl: json.image_url! }
            : layer,
        ),
      );
      setUpscaleMsg("✅ 高解像度化完了");
      setEstimatedDpi((prev) => Math.min(400, prev * 4));
    } catch (e) {
      setUpscaleMsg(`❌ ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setUpscaleBusy(false);
    }
  }, [selectedLayer, upscaleBusy, updateEditor]);

  const onStickerGenerate = useCallback(async () => {
    const keyword = stickerKeyword.trim();
    if (!keyword || stickerBusy) return;
    setStickerBusy(true);
    setStickerMsg("🎨 生成中...");
    try {
      const res = await fetch("/api/design-tools/sticker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword }),
      });
      const data = await res.json() as { image_url?: string; error?: string };
      if (!res.ok || !data.image_url) throw new Error(data.error ?? "unknown error");

      const id = `layer-sticker-${Date.now()}`;
      updateEditor((prev) => [
        ...prev,
        {
          id,
          type: "image" as const,
          name: `スタンプ: ${keyword}`,
          dataUrl: data.image_url!,
          locked: false,
          x: 0,
          y: 0,
          scaleX: 0.5,
          scaleY: 0.5,
          rotate: 0,
        },
      ]);
      setStickerHistory((prev) => [keyword, ...prev].slice(0, 8));
      setStickerMsg("✅ キャンバスに追加しました");
      setStickerKeyword("");
    } catch (e) {
      setStickerMsg(`❌ ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setStickerBusy(false);
    }
  }, [stickerKeyword, stickerBusy, updateEditor]);

  // Called by FabricCanvas when user drags/scales/rotates an object
  const onFabricLayerChange = useCallback(
    (id: string, patch: Partial<CanvasLayer>) => {
      updateEditor((prev) =>
        prev.map((l) => (l.id === id ? ({ ...l, ...patch } as CanvasLayer) : l))
      );
    },
    [updateEditor]
  );

  function getActiveTransformLayerIds(): string[] {
    if (selectedLayerIds.length > 1) {
      return selectedLayerIds.filter((id) => layers.some((layer) => layer.id === id));
    }
    if (selectedLayer?.groupId) {
      return layers.filter((layer) => layer.groupId === selectedLayer.groupId).map((layer) => layer.id);
    }
    return selectedLayerId ? [selectedLayerId] : [];
  }

  function pickStartStates(layerIds: string[]): LayerStartState[] {
    return layers
      .filter((layer) => layerIds.includes(layer.id))
      .map((layer) => ({
        id: layer.id,
        x: layer.x,
        y: layer.y,
        scaleX: layer.scaleX,
        scaleY: layer.scaleY,
        rotate: layer.rotate,
      }));
  }

  function calcSelectionCenter(states: LayerStartState[]) {
    if (states.length === 0) return { x: 0, y: 0 };
    const x = states.reduce((sum, s) => sum + s.x, 0) / states.length;
    const y = states.reduce((sum, s) => sum + s.y, 0) / states.length;
    return { x, y };
  }

  function undo() {
    setHistoryPast((past) => {
      if (past.length === 0) return past;
      const last = past[past.length - 1];
      const current: EditorSnapshot = { layers, selectedLayerId };
      setHistoryFuture((future) => [current, ...future].slice(0, 50));
      setLayers(last.layers);
      setSelectedLayerId(last.selectedLayerId);
      return past.slice(0, -1);
    });
  }

  function redo() {
    setHistoryFuture((future) => {
      if (future.length === 0) return future;
      const [next, ...rest] = future;
      const current: EditorSnapshot = { layers, selectedLayerId };
      setHistoryPast((past) => [...past.slice(-49), current]);
      setLayers(next.layers);
      setSelectedLayerId(next.selectedLayerId);
      return rest;
    });
  }

  function updateSelectedLayer(transformer: (layer: CanvasLayer) => CanvasLayer) {
    if (!selectedLayerId) return;
    updateEditor(
      (prevLayers) =>
        prevLayers.map((layer) =>
          layer.id === selectedLayerId && !layer.locked ? transformer(layer) : layer,
        ),
      { keepSelection: true },
    );
  }

  const printDraft = useMemo(
    () => ({
      version: "v2.5",
      product_id: product.product_id,
      template_id: product.design_template_id,
      canvas: {
        width: 1000,
        height: 1000,
        bleed_margin_px: 32,
        safety_margin_px: 96,
      },
      layers,
      background: bgColor,
      print_check: {
        estimated_dpi: estimatedDpi,
      },
      exported_at: new Date().toISOString(),
    }),
    [
      bgColor,
      estimatedDpi,
      layers,
      product.design_template_id,
      product.product_id,
    ],
  );

  const dpiTone = useMemo(() => {
    if (!saved) return "text-zinc-600";
    return saved.dpi_check_result.status === "ok"
      ? "text-emerald-600"
      : "text-amber-600";
  }, [saved]);

  /** PRD §8.2：解像度不足時は印前キューへ進めない（カート・注文へ進むを停止） */
  const dpiBlocksProduction = useMemo(() => estimatedDpi < 200, [estimatedDpi]);

  async function onUpload(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      const id = `layer_img_${Date.now()}`;
      const newLayer: ImageLayer = {
        id,
        type: "image",
        name: file.name,
        dataUrl,
        locked: false,
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotate: 0,
      };
      updateEditor((prev) => [newLayer, ...prev]);
      setSelectedLayerId(id);
      setSelectedLayerIds([id]);
    };
    reader.readAsDataURL(file);
  }

  function onFileSelected(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPendingFile(file);
      setPendingDataUrl(String(reader.result ?? ""));
    };
    reader.readAsDataURL(file);
  }

  function onPlaceOnCanvas() {
    if (!pendingFile || !pendingDataUrl) return;
    const id = `layer_img_${Date.now()}`;
    const newLayer: ImageLayer = {
      id, type: "image", name: pendingFile.name, dataUrl: pendingDataUrl,
      locked: false, x: 0, y: 0, scaleX: 1, scaleY: 1, rotate: 0,
    };
    updateEditor((prev) => [newLayer, ...prev]);
    setSelectedLayerId(id);
    setSelectedLayerIds([id]);
    setPendingFile(null);
    setPendingDataUrl("");
  }

  function onUseAsAiRef() {
    if (!pendingFile) return;
    setAigcRefFiles((prev) =>
      [...prev, pendingFile].slice(0, AIGC_MAX_REFERENCE_ASSET_COUNT),
    );
    setPendingFile(null);
    setPendingDataUrl("");
  }

  function onLayerPointerDown(e: React.PointerEvent<HTMLDivElement>, layer: CanvasLayer) {
    if (layer.locked) return;
    pushHistorySnapshot(layers, selectedLayerId);
    setSelectedLayerId(layer.id);
    if (!selectedLayerIds.includes(layer.id)) {
      setSelectedLayerIds([layer.id]);
    }
    const layerIds = getActiveTransformLayerIds();
    const startStates = pickStartStates(layerIds);
    e.currentTarget.setPointerCapture(e.pointerId);
    const start = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      startX: layer.x,
      startY: layer.y,
    };
    dragStartRef.current = start;
    transformModeRef.current = { kind: "move", layerIds, start, startStates };
  }

  function onScaleHandlePointerDown(
    e: React.PointerEvent<HTMLButtonElement>,
    layer: CanvasLayer,
    axisX: -1 | 0 | 1,
    axisY: -1 | 0 | 1,
  ) {
    if (layer.locked) return;
    e.stopPropagation();
    pushHistorySnapshot(layers, selectedLayerId);
    setSelectedLayerId(layer.id);
    const layerIds = getActiveTransformLayerIds();
    const startStates = pickStartStates(layerIds);
    const center = calcSelectionCenter(startStates);
    e.currentTarget.setPointerCapture(e.pointerId);
    transformModeRef.current = {
      kind: "scale",
      layerIds,
      startStates,
      centerX: center.x,
      centerY: center.y,
      startPointerX: e.clientX,
      startPointerY: e.clientY,
      axisX,
      axisY,
    };
  }

  function onRotateHandlePointerDown(
    e: React.PointerEvent<HTMLButtonElement>,
    layer: CanvasLayer,
  ) {
    if (layer.locked) return;
    e.stopPropagation();
    const stageRect = stageRef.current?.getBoundingClientRect();
    if (!stageRect) return;
    pushHistorySnapshot(layers, selectedLayerId);
    setSelectedLayerId(layer.id);
    const layerIds = getActiveTransformLayerIds();
    const startStates = pickStartStates(layerIds);
    const center = calcSelectionCenter(startStates);
    const centerX = stageRect.left + stageRect.width / 2 + center.x;
    const centerY = stageRect.top + stageRect.height / 2 + center.y;
    const startAngleDeg = (Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180) / Math.PI;
    e.currentTarget.setPointerCapture(e.pointerId);
    transformModeRef.current = {
      kind: "rotate",
      layerIds,
      startStates,
      startRotate: layer.rotate,
      centerX,
      centerY,
      startAngleDeg,
    };
  }

  function onStagePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const mode = transformModeRef.current;
    if (!mode || !selectedLayer || selectedLayer.locked) return;
    if (mode.kind === "scale") {
      const dx = e.clientX - mode.startPointerX;
      const dy = e.clientY - mode.startPointerY;
      const deltaX = mode.axisX === 0 ? 0 : (mode.axisX * dx) / 220;
      const deltaY = mode.axisY === 0 ? 0 : (mode.axisY * dy) / 220;
      const factorX = mode.axisX === 0 ? 1 : Math.max(0.2, 1 + deltaX);
      const factorY = mode.axisY === 0 ? 1 : Math.max(0.2, 1 + deltaY);
      setLayers((prevLayers) =>
        prevLayers.map((layer) =>
          mode.layerIds.includes(layer.id)
            ? (() => {
                const start = mode.startStates.find((s) => s.id === layer.id);
                if (!start) return layer;
                return {
                  ...layer,
                  x: mode.centerX + (start.x - mode.centerX) * factorX,
                  y: mode.centerY + (start.y - mode.centerY) * factorY,
                  scaleX: Math.min(3, Math.max(0.2, start.scaleX * factorX)),
                  scaleY: Math.min(3, Math.max(0.2, start.scaleY * factorY)),
                };
              })()
            : layer,
        ),
      );
      return;
    }
    if (mode.kind === "rotate") {
      const currentAngle = (Math.atan2(e.clientY - mode.centerY, e.clientX - mode.centerX) * 180) / Math.PI;
      const deltaAngle = currentAngle - mode.startAngleDeg;
      const rawRotate = mode.startRotate + deltaAngle;
      const snapStep = 45;
      const snapped = Math.round(rawRotate / snapStep) * snapStep;
      const nextRotate = Math.abs(rawRotate - snapped) <= 6 ? snapped : rawRotate;
      const stageRect = stageRef.current?.getBoundingClientRect();
      if (!stageRect) return;
      const centerLocalX = mode.centerX - stageRect.left - stageRect.width / 2;
      const centerLocalY = mode.centerY - stageRect.top - stageRect.height / 2;
      const rotateDelta = nextRotate - mode.startRotate;
      const rad = (rotateDelta * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      setLayers((prevLayers) =>
        prevLayers.map((layer) =>
          mode.layerIds.includes(layer.id)
            ? (() => {
                const start = mode.startStates.find((s) => s.id === layer.id);
                if (!start) return layer;
                const relX = start.x - centerLocalX;
                const relY = start.y - centerLocalY;
                return {
                  ...layer,
                  x: relX * cos - relY * sin + centerLocalX,
                  y: relX * sin + relY * cos + centerLocalY,
                  rotate: Math.round(start.rotate + rotateDelta),
                };
              })()
            : layer,
        ),
      );
      return;
    }
    const dx = e.clientX - mode.start.pointerX;
    const dy = e.clientY - mode.start.pointerY;
    let nextX = mode.start.startX + dx;
    let nextY = mode.start.startY + dy;
    const guides: { x?: number; y?: number } = {};
    const snapThreshold = 12;
    const snapTargetsX = [
      0, // center
      -16, 16, // bleed
      -48, 48, // safety
      ...layers.filter((layer) => layer.id !== selectedLayer.id).map((layer) => layer.x),
    ];
    const snapTargetsY = [
      0, // center
      -16, 16, // bleed
      -48, 48, // safety
      ...layers.filter((layer) => layer.id !== selectedLayer.id).map((layer) => layer.y),
    ];
    const nearestX = snapTargetsX.find((target) => Math.abs(nextX - target) < snapThreshold);
    const nearestY = snapTargetsY.find((target) => Math.abs(nextY - target) < snapThreshold);
    if (nearestX != null) {
      nextX = nearestX;
      guides.x = nearestX;
    }
    if (nearestY != null) {
      nextY = nearestY;
      guides.y = nearestY;
    }
    setSnapGuides(guides);
    const mainStart = mode.startStates.find((s) => s.id === selectedLayer.id);
    const applyDx = mainStart ? nextX - mainStart.x : dx;
    const applyDy = mainStart ? nextY - mainStart.y : dy;
    setLayers((prevLayers) =>
      prevLayers.map((layer) =>
        mode.layerIds.includes(layer.id)
          ? (() => {
              const start = mode.startStates.find((s) => s.id === layer.id);
              if (!start) return layer;
              return { ...layer, x: start.x + applyDx, y: start.y + applyDy };
            })()
          : layer,
      ),
    );
  }

  function onStagePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (dragStartRef.current) {
      const pointerElement = e.target as HTMLElement;
      if (pointerElement?.hasPointerCapture?.(e.pointerId)) {
        pointerElement.releasePointerCapture(e.pointerId);
      }
    }
    dragStartRef.current = null;
    transformModeRef.current = null;
    setSnapGuides({});
  }

  function getLayerBaseSize(layer: CanvasLayer) {
    if (layer.type === "text") return { width: 280, height: 84 };
    return { width: 260, height: 260 };
  }

  function toggleLock(layerId: string) {
    updateEditor((prevLayers) =>
      prevLayers.map((layer) =>
        layer.id === layerId ? { ...layer, locked: !layer.locked } : layer,
      ),
    );
  }

  function bringForward(layerId: string) {
    updateEditor((prevLayers) => {
      const idx = prevLayers.findIndex((layer) => layer.id === layerId);
      if (idx <= 0) return prevLayers;
      const copy = [...prevLayers];
      const [target] = copy.splice(idx, 1);
      copy.splice(idx - 1, 0, target);
      return copy;
    });
  }

  function sendBackward(layerId: string) {
    updateEditor((prevLayers) => {
      const idx = prevLayers.findIndex((layer) => layer.id === layerId);
      if (idx < 0 || idx >= prevLayers.length - 1) return prevLayers;
      const copy = [...prevLayers];
      const [target] = copy.splice(idx, 1);
      copy.splice(idx + 1, 0, target);
      return copy;
    });
  }

  function onLayerDragStart(layerId: string) {
    dragLayerIdRef.current = layerId;
  }

  function onLayerDrop(targetLayerId: string) {
    const sourceLayerId = dragLayerIdRef.current;
    dragLayerIdRef.current = null;
    if (!sourceLayerId || sourceLayerId === targetLayerId) return;
    updateEditor((prevLayers) => {
      const sourceIdx = prevLayers.findIndex((layer) => layer.id === sourceLayerId);
      const targetIdx = prevLayers.findIndex((layer) => layer.id === targetLayerId);
      if (sourceIdx < 0 || targetIdx < 0) return prevLayers;
      const copy = [...prevLayers];
      const [sourceLayer] = copy.splice(sourceIdx, 1);
      copy.splice(targetIdx, 0, sourceLayer);
      return copy;
    });
  }

  function toggleMultiSelect(layerId: string, checked: boolean) {
    setSelectedLayerIds((prev) => {
      if (checked) return Array.from(new Set([...prev, layerId]));
      const next = prev.filter((id) => id !== layerId);
      if (next.length === 0) return [selectedLayerId ?? layerId];
      return next;
    });
  }

  function groupSelectedLayers() {
    if (selectedLayerIds.length < 2) return;
    const gid = `group_${Date.now()}`;
    updateEditor((prevLayers) =>
      prevLayers.map((layer) =>
        selectedLayerIds.includes(layer.id) ? { ...layer, groupId: gid } : layer,
      ),
    );
  }

  function ungroupSelectedLayers() {
    updateEditor((prevLayers) =>
      prevLayers.map((layer) =>
        selectedLayerIds.includes(layer.id) ? { ...layer, groupId: undefined } : layer,
      ),
    );
  }

  function nudgeSelection(dx: number, dy: number) {
    const ids = getActiveTransformLayerIds();
    if (ids.length === 0) return;
    updateEditor(
      (prevLayers) =>
        prevLayers.map((layer) =>
          ids.includes(layer.id) && !layer.locked
            ? { ...layer, x: layer.x + dx, y: layer.y + dy }
            : layer,
        ),
      { keepSelection: true },
    );
  }

  function alignLeft() {
    if (selectedLayerIds.length < 2) return;
    const selected = layers.filter((layer) => selectedLayerIds.includes(layer.id));
    const minX = Math.min(...selected.map((layer) => layer.x));
    updateEditor((prevLayers) =>
      prevLayers.map((layer) =>
        selectedLayerIds.includes(layer.id) ? { ...layer, x: minX } : layer,
      ),
    );
  }

  function alignCenter() {
    if (selectedLayerIds.length === 0) return;
    updateEditor((prevLayers) =>
      prevLayers.map((layer) =>
        selectedLayerIds.includes(layer.id) ? { ...layer, x: 0, y: 0 } : layer,
      ),
    );
  }

  function distributeHorizontal() {
    if (selectedLayerIds.length < 3) return;
    const selected = layers
      .filter((layer) => selectedLayerIds.includes(layer.id))
      .sort((a, b) => a.x - b.x);
    const left = selected[0].x;
    const right = selected[selected.length - 1].x;
    const step = (right - left) / (selected.length - 1);
    const target = new Map<string, number>();
    selected.forEach((layer, idx) => target.set(layer.id, left + step * idx));
    updateEditor((prevLayers) =>
      prevLayers.map((layer) =>
        target.has(layer.id) ? { ...layer, x: target.get(layer.id) ?? layer.x } : layer,
      ),
    );
  }

  /** Export all visible layers as a print-ready PNG using Fabric's native toDataURL.
   *  multiplier=3 → 1560×1560px from a 520px canvas ≈ 300 DPI for 5.2-inch print.
   */
  async function flattenCanvas(): Promise<string> {
    const url = fabricRef.current?.exportPng(3);
    if (url) return url;
    throw new Error("キャンバスがまだ初期化されていません");
  }

  const [flattenedPreviewUrl, setFlattenedPreviewUrl] = useState("");
  const [flattenBusy, setFlattenBusy] = useState(false);
  const [flattenMsg, setFlattenMsg] = useState("");

  async function onPreviewFlatten() {
    setFlattenBusy(true);
    setFlattenMsg("合成中...");
    setFlattenedPreviewUrl("");
    try {
      const url = await flattenCanvas();
      setFlattenedPreviewUrl(url);
      setFlattenMsg("✅ 合成完了");
    } catch (e) {
      setFlattenMsg(`❌ ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setFlattenBusy(false);
    }
  }

  async function onSave() {
    setLoading(true);
    setError("");
    setSaved(null);
    try {
      // Flatten all visible layers into one print-ready PNG
      let mergedPng = flattenedPreviewUrl;
      if (!mergedPng) {
        try {
          mergedPng = await flattenCanvas();
          setFlattenedPreviewUrl(mergedPng);
        } catch {
          // Non-fatal: save continues without merged PNG
        }
      }

      let bodyJson: string;
      try {
        bodyJson = JSON.stringify({
          product_id: product.product_id,
          template_id: product.design_template_id,
          merged_design_png: mergedPng || null,
          text_layers: layers
            .filter((layer): layer is TextLayer => layer.type === "text")
            .map((layer) => ({ text: layer.text, color: layer.color, x: layer.x, y: layer.y })),
          color_layers: [{ role: "background", value: bgColor }],
          user_images: layers
            .filter((layer): layer is ImageLayer => layer.type === "image" && !layer.hidden)
            .map((layer) => ({
              name: layer.name,
              data_url: typeof layer.dataUrl === "string" ? layer.dataUrl : String(layer.dataUrl ?? ""),
            })),
          transform_matrix: [1, 0, 0, 1, 0, 0],
          estimated_dpi: estimatedDpi,
        });
      } catch {
        throw new Error("デザインのデータを JSON にできませんでした。レイヤー内容をご確認ください。");
      }
      if (!bodyJson || bodyJson === "{}") {
        throw new Error("保存用データが空です。ページを再読み込みして再度お試しください。");
      }
      const res = await fetch("/api/customizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: bodyJson,
      });
      const json = (await res.json()) as SaveResult & {
        code?: string;
        message?: string;
      };
      if (!res.ok) {
        throw new Error(json.message ?? "保存に失敗しました");
      }
      setSaved(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function onAddToCart() {
    if (!saved) return;
    if (dpiBlocksProduction) {
      setCartMsg("推定 DPI が 200 未満のため、カートに入れません（PRD §8.2）。スライダーで解像度を上げてください。");
      return;
    }
    setAddingToCart(true);
    setCartMsg("");
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: product.product_id,
          qty,
          source_sku_code: `${product.product_id}-customized`,
          customization_id: saved.customization_id,
          added_from: "customize",
        }),
      });
      if (!res.ok) throw new Error("カート追加に失敗しました");
      setCartMsg("カスタム商品をカートに追加しました");
    } catch (e) {
      setCartMsg(e instanceof Error ? e.message : "カート追加に失敗しました");
    } finally {
      setAddingToCart(false);
    }
  }

  function exportPrintDraftJson() {
    let raw: string;
    try {
      raw = JSON.stringify(printDraft, null, 2);
    } catch {
      setError("JSON エクスポートに失敗しました（データが大きすぎるか、不正な形式です）。");
      return;
    }
    const blob = new Blob([raw], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${product.slug}-print-draft.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function fetchAigcJob(jobId: string) {
    const res = await fetch(`${AIGC_GENERATIONS_API_PATH}/${jobId}`);
    const json = (await res.json()) as {
      status?: string;
      candidates?: AigcCandidate[];
      confirm_deadline_at?: string;
      warnings?: string[];
      error?: { code?: string; message?: string };
      message?: string;
    };
    return { ok: res.ok, json };
  }

  function onAigcRefFilesChange(fileList: FileList | null) {
    const list = Array.from(fileList ?? []).slice(0, AIGC_MAX_REFERENCE_ASSET_COUNT);
    setAigcRefFiles(list);
  }

  async function onAigcGenerate() {
    setAigcBusy(true);
    setAigcErr("");
    setAigcMsg("");
    clearAigcPoll();
    setAigcJobId(null);
    setAigcStatus(null);
    setAigcDeadlineIso(null);
    setAigcCandidates([]);
    setAigcPickIndex(0);
    try {
      const trimmedPrompt = aigcPrompt.trim();
      let reference_asset_ids: string[] = [];

      if (aigcRefFiles.length > 0) {
        const fd = new FormData();
        for (const f of aigcRefFiles) fd.append("files", f);
        const up = await fetch(AIGC_REFERENCE_ASSETS_API_PATH, { method: "POST", body: fd });
        const upJson = (await up.json()) as { assets?: { asset_id: string }[]; message?: string };
        if (!up.ok) throw new Error(upJson.message ?? "参考画像のアップロードに失敗しました");
        reference_asset_ids = (upJson.assets ?? []).map((a) => a.asset_id).filter(Boolean);
        if (reference_asset_ids.length === 0) throw new Error("asset_id が返りませんでした");
      }

      const cc = Math.min(
        AIGC_MAX_CANDIDATE_COUNT,
        Math.max(AIGC_MIN_CANDIDATE_COUNT, Math.floor(aigcCandidateCount)),
      );

      let mode: "txt2img" | "img2img" | "multi_ref" = "txt2img";
      let references:
        | { asset_id: string; role: "subject" | "style" | "layout" | "other" }[]
        | undefined;
      if (aigcMultiRef && reference_asset_ids.length >= 2) {
        mode = "multi_ref";
        references = reference_asset_ids.map((asset_id, i) => ({
          asset_id,
          role: (["subject", "style", "layout", "other"] as const)[i % 4],
        }));
      } else if (reference_asset_ids.length > 0) {
        mode = "img2img";
      }

      if (mode === "txt2img" && !trimmedPrompt) {
        throw new Error("テキスト生成ではプロンプトが必須です。");
      }

      const body: Record<string, unknown> = {
        product_id: product.product_id,
        prompt: trimmedPrompt || undefined,
        negative_prompt: [
          aigcNegative.trim(),
          aigcSuppressText ? "text, letters, words, watermark, signature, font, typography, characters, kanji, hiragana, katakana, chinese characters, calligraphy" : "",
        ].filter(Boolean).join(", ") || undefined,
        candidate_count: cc,
        reference_asset_ids: reference_asset_ids.length ? reference_asset_ids : undefined,
        mode,
      };
      if (references) body.references = references;

      const res = await fetch(AIGC_GENERATIONS_API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as {
        job_id?: string;
        message?: string;
        code?: string;
        status?: string;
        warnings?: string[];
      };
      if (!res.ok) throw new Error(json.message ?? json.code ?? "生成リクエストに失敗しました");
      const jobId = json.job_id;
      if (!jobId) throw new Error("job_id がありません");
      setAigcJobId(jobId);
      if (json.warnings?.length) setAigcMsg(json.warnings.join(" "));

      for (let i = 0; i < 60; i++) {
        const { ok, json: j } = await fetchAigcJob(jobId);
        if (!ok) throw new Error(j.message ?? "ジョブ取得に失敗しました");
        const st = j.status ?? "";
        setAigcStatus(st);
        setAigcDeadlineIso(j.confirm_deadline_at ?? null);
        if (st === "queued" || st === "processing") {
          setAigcMsg(
            j.warnings?.length ? `${j.warnings.join(" ")} — 生成中…` : "生成中…",
          );
        }
        if (st === "ready" && Array.isArray(j.candidates) && j.candidates.length > 0) {
          setAigcCandidates(j.candidates);
          setAigcPickIndex(0);
          setAigcMsg("候補が出ました。1枚選んで「候補を確定」を押してください（確認期限内）。");
          setAigcBusy(false);
          return;
        }
        if (st === "expired") {
          setAigcErr("確認期限を過ぎました。もう一度生成してください。");
          setAigcBusy(false);
          return;
        }
        if (st === "failed") {
          setAigcErr(j.error?.message ?? "生成に失敗しました");
          setAigcBusy(false);
          return;
        }
        await new Promise((r) => setTimeout(r, 200));
      }
      setAigcErr("タイムアウト：候補の取得に失敗しました");
    } catch (e) {
      setAigcErr(e instanceof Error ? e.message : "エラー");
    } finally {
      setAigcBusy(false);
    }
  }

  async function onAigcConfirm() {
    if (!aigcJobId || aigcStatus !== "ready") return;
    setAigcBusy(true);
    setAigcErr("");
    try {
      const res = await fetch(`${AIGC_GENERATIONS_API_PATH}/${aigcJobId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate_index: aigcPickIndex }),
      });
      const json = (await res.json()) as {
        status?: string;
        selected?: { index: number; url: string };
        message?: string;
        code?: string;
      };
      if (!res.ok) throw new Error(json.message ?? json.code ?? "確定に失敗しました");
      const url = json.selected?.url;
      if (!url) throw new Error("候補URLがありません");
      writeFdmAigcLastToWindow({ product_id: product.product_id, url, t: Date.now() });
      setAigcStatus(json.status ?? "confirmed");
      const id = `layer_img_aigc_${Date.now()}`;
      const newLayer: ImageLayer = {
        id,
        type: "image",
        name: `AI生成 候補${aigcPickIndex}`,
        dataUrl: url,
        locked: false,
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotate: 0,
      };
      updateEditor((prev) => [newLayer, ...prev]);
      setSelectedLayerId(id);
      setSelectedLayerIds([id]);
      setAigcCandidates([]);
      setAigcDeadlineIso(null);
      setAigcMsg("キャンバスに追加しました。「デザインを保存」でカスタム内容をサーバーに保存し、カートへ進めます。");
    } catch (e) {
      setAigcErr(e instanceof Error ? e.message : "エラー");
    } finally {
      setAigcBusy(false);
    }
  }

  function onAigcReset() {
    clearAigcPoll();
    setAigcJobId(null);
    setAigcStatus(null);
    setAigcDeadlineIso(null);
    setAigcCandidates([]);
    setAigcErr("");
    setAigcMsg("");
  }

  return (
    <>
      {/* Lightbox modal for AI candidate preview */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxUrl("")}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <img
              src={lightboxUrl}
              alt="拡大プレビュー"
              className="max-h-[85vh] max-w-[85vw] rounded-xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              onClick={() => setLightboxUrl("")}
              className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-zinc-800 shadow-lg hover:bg-zinc-100"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-6xl px-4 pt-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50/95 px-4 py-2 text-xs leading-relaxed text-amber-950">
          <strong className="font-semibold">デモについて：</strong>
          AI画像生成＋レイヤー編集体験。詳細は
          <Link href="/policies" className="mx-1 font-semibold text-[#e85c22] underline">
            ポリシー
          </Link>
          をご確認ください。
        </div>
      </div>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-3 lg:grid-cols-[1fr_400px] lg:items-start">
      <section className="lg:sticky lg:top-[104px]">
        <FabricCanvas
          ref={fabricRef}
          layers={layers}
          bgColor={bgColor}
          selectedLayerId={selectedLayerId}
          onLayerChange={onFabricLayerChange}
          onSelectionChange={(id) => {
            setSelectedLayerId(id);
            setSelectedLayerIds(id ? [id] : []);
          }}
          canvasSize={520}
          globalFontFamily={fontFamily !== "inherit" ? fontFamily : "sans-serif"}
          renderUnderlay={
            <ProductBaseLayer
              templateId={product.design_template_id}
              color={productColor}
              printArea={printArea}
            />
          }
        />
        <p className="mt-3 text-xs text-zinc-500">
          クリックで選択・ドラッグで移動・コーナーハンドルで拡縮・回転。テキストはダブルクリックで編集。
        </p>
        {dpiBlocksProduction ? (
          <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-800">
            <p>推定 DPI が 200 未満のため、カート追加と注文へ進むをブロックしています。</p>
            {selectedLayer?.type === "image" && (
              <button
                type="button"
                onClick={() => void onUpscale()}
                disabled={upscaleBusy}
                className="mt-2 rounded-full bg-red-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {upscaleBusy ? "AI 処理中..." : "✨ AI で画質を 4× 改善する"}
              </button>
            )}
            {upscaleMsg && <p className="mt-1 text-[11px]">{upscaleMsg}</p>}
          </div>
        ) : null}
      </section>

      <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm lg:max-h-[calc(100vh-112px)] lg:overflow-y-auto">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">デザインエディタ v2.5</h1>
          <p className="mt-1 text-sm text-zinc-600">{product.title}</p>
        </div>

        {/* Product color variants */}
        {(product as { color_variants?: { value: string; label: string }[] }).color_variants && (
          <div>
            <span className="mb-2 block text-sm font-medium text-zinc-700">商品カラー</span>
            <div className="flex flex-wrap gap-2">
              {(product as { color_variants: { value: string; label: string }[] }).color_variants.map((cv) => (
                <button
                  key={cv.value}
                  type="button"
                  onClick={() => setProductColor(cv.value)}
                  title={cv.label}
                  className={`h-8 w-8 rounded-full border-2 shadow-sm transition-transform ${
                    productColor === cv.value ? "scale-110 border-[#e85c22]" : "border-zinc-300 hover:border-zinc-500"
                  }`}
                  style={{ backgroundColor: cv.value }}
                />
              ))}
              <span className="self-center text-xs text-zinc-500">
                {(product as { color_variants: { value: string; label: string }[] }).color_variants.find(
                  (c) => c.value === productColor,
                )?.label}
              </span>
            </div>
          </div>
        )}

        {/* Print area selector */}
        <div>
          <span className="mb-2 block text-sm font-medium text-zinc-700">印刷箇所</span>
          <div className="flex gap-2">
            {(["front", "back"] as const).map((area) => (
              <button
                key={area}
                type="button"
                onClick={() => setPrintArea(area)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                  printArea === area
                    ? "bg-[#e85c22] text-white"
                    : "border border-zinc-300 text-zinc-600 hover:border-zinc-500"
                }`}
              >
                {area === "front" ? "フロント" : "バック"}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 text-sm text-zinc-800">
          <h2 className="text-sm font-bold text-violet-900">✨ AI 画像生成（fal.ai）</h2>

          {/* Reference image status — set via unified upload above */}
          {aigcRefFiles.length > 0 ? (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-violet-100 px-3 py-2">
              <span className="text-xs text-violet-800">
                📎 参考画像 {aigcRefFiles.length} 枚セット済み
                {aigcRefFiles.length >= 2 ? "（複数画像参照モード）" : "（画像参照モード）"}
              </span>
              <button
                type="button"
                onClick={() => { setAigcRefFiles([]); setAigcMultiRef(false); }}
                className="ml-auto text-xs text-violet-500 hover:text-violet-800"
              >
                クリア
              </button>
            </div>
          ) : (
            <p className="mt-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
              参考画像なし（プロンプトのみで生成）。上の「AIで新しいデザインを生成する」から参考画像をセットできます。
            </p>
          )}
          <label className="mt-2 block">
            <span className="mb-1 block text-xs font-medium text-zinc-700">
              プロンプト（テキスト生成では必須／画像参照のみでは任意）
            </span>
            <textarea
              value={aigcPrompt}
              onChange={(e) => setAigcPrompt(e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="例：夜桜をバックにした幻想的な雰囲気、淡いパステルカラー"
              className="w-full rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-violet-500"
            />
            <p className="mt-0.5 text-[10px] text-zinc-400">
              ※ 日本語または英語で入力してください。特定の実在人物の生成には対応していません。
            </p>
          </label>
          <label className="mt-2 block">
            <span className="mb-1 block text-xs font-medium text-zinc-700">ネガティブプロンプト（任意）</span>
            <input
              value={aigcNegative}
              onChange={(e) => setAigcNegative(e.target.value)}
              maxLength={2000}
              className="w-full rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-violet-500"
              placeholder="例：低解像度、ぼやけた、暗い"
            />
          </label>
          <label className="mt-1.5 flex items-center gap-2 text-xs text-zinc-700">
            <input
              type="checkbox"
              checked={aigcSuppressText}
              onChange={(e) => setAigcSuppressText(e.target.checked)}
              className="rounded"
            />
            生成画像内の文字・ロゴを自動で除去する（推奨）
          </label>
          <label className="mt-2 block">
            <span className="mb-1 block text-xs font-medium text-zinc-700">
              候補枚数（{AIGC_MIN_CANDIDATE_COUNT}–{AIGC_MAX_CANDIDATE_COUNT}）
            </span>
            <input
              type="range"
              min={AIGC_MIN_CANDIDATE_COUNT}
              max={AIGC_MAX_CANDIDATE_COUNT}
              step={1}
              value={aigcCandidateCount}
              onChange={(e) => setAigcCandidateCount(Number(e.target.value))}
              className="w-full"
            />
            <span className="text-xs text-zinc-500">{aigcCandidateCount} 枚</span>
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void onAigcGenerate()}
              disabled={aigcBusy}
              className="rounded-full bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {aigcBusy ? "処理中…" : "候補を生成"}
            </button>
            {(aigcJobId || aigcMsg || aigcErr) && !aigcCandidates.length ? (
              <button
                type="button"
                onClick={onAigcReset}
                disabled={aigcBusy}
                className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 disabled:opacity-50"
              >
                リセット
              </button>
            ) : null}
          </div>
          {aigcErr ? <p className="mt-2 text-xs text-red-600">{aigcErr}</p> : null}
          {aigcMsg && !aigcErr ? <p className="mt-2 text-xs text-emerald-800">{aigcMsg}</p> : null}
          {aigcStatus === "ready" && aigcCandidates.length > 0 ? (
            <div className="mt-3 space-y-2 border-t border-violet-200 pt-3">
              <p className="text-xs font-semibold text-violet-900">候補を選択</p>
              {aigcSecondsLeft != null ? (
                <p className="text-xs text-amber-800">
                  確認の残り時間:{" "}
                  <span className="font-mono font-bold">
                    {String(Math.floor(aigcSecondsLeft / 60)).padStart(2, "0")}:
                    {String(aigcSecondsLeft % 60).padStart(2, "0")}
                  </span>
                </p>
              ) : null}
              <div className="flex gap-2">
                {aigcCandidates.map((c) => (
                  <div key={c.index} className="relative">
                    <button
                      type="button"
                      onClick={() => setAigcPickIndex(c.index)}
                      className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${
                        aigcPickIndex === c.index ? "border-violet-600 ring-2 ring-violet-300" : "border-zinc-200"
                      }`}
                    >
                      <Image src={c.url} alt={`候補 ${c.index}`} fill className="object-cover" sizes="80px" />
                    </button>
                    <button
                      type="button"
                      title="拡大表示"
                      onClick={() => setLightboxUrl(c.url)}
                      className="absolute right-0.5 top-0.5 rounded bg-black/60 px-1 py-0.5 text-[10px] text-white hover:bg-black/80"
                    >
                      🔍
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => void onAigcConfirm()}
                disabled={aigcBusy || aigcSecondsLeft === 0}
                className="mt-1 w-full rounded-full bg-[#e85c22] py-2 text-xs font-bold text-white hover:bg-[#d14f1b] disabled:opacity-50"
              >
                候補を確定してキャンバスへ
              </button>
            </div>
          ) : null}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={undo}
            disabled={historyPast.length === 0}
            className="rounded-full border border-zinc-300 px-3 py-1 text-xs disabled:opacity-50"
          >
            元に戻す
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={historyFuture.length === 0}
            className="rounded-full border border-zinc-300 px-3 py-1 text-xs disabled:opacity-50"
          >
            やり直し
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={alignLeft}
            disabled={selectedLayerIds.length < 2}
            className="rounded border border-zinc-300 px-2 py-1 text-xs disabled:opacity-50"
          >
            左揃え
          </button>
          <button
            type="button"
            onClick={alignCenter}
            className="rounded border border-zinc-300 px-2 py-1 text-xs"
          >
            中央
          </button>
          <button
            type="button"
            onClick={distributeHorizontal}
            disabled={selectedLayerIds.length < 3}
            className="rounded border border-zinc-300 px-2 py-1 text-xs disabled:opacity-50"
          >
            均等配置
          </button>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-zinc-700">テキスト</span>
          <input
            value={textLayer?.text ?? ""}
            onChange={(e) =>
              updateEditor((prevLayers) =>
                prevLayers.map((layer) =>
                  layer.type === "text" ? { ...layer, text: e.target.value } : layer,
                ),
              )
            }
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-[#e85c22]"
            placeholder="例：AKIRA FAN CLUB"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-zinc-700">フォント</span>
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#e85c22]"
            style={{ fontFamily: fontFamily !== "inherit" ? fontFamily : undefined }}
          >
            <option value="inherit">デフォルト</option>
            <option value="'Noto Sans JP', sans-serif">Noto Sans JP</option>
            <option value="'M PLUS Rounded 1c', sans-serif">M PLUS Rounded 1c</option>
            <option value="'DotGothic16', sans-serif">DotGothic16（ドット）</option>
            <option value="'Kosugi Maru', sans-serif">Kosugi Maru</option>
            <option value="'Yusei Magic', sans-serif">Yusei Magic（手書き）</option>
            <option value="'Zen Antique Soft', serif">Zen Antique Soft（明朝）</option>
            <option value="serif">セリフ体</option>
            <option value="monospace">等幅</option>
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-700">文字色</span>
            <input
              type="color"
              value={textLayer?.color ?? "#e85c22"}
              onChange={(e) =>
                updateEditor((prevLayers) =>
                  prevLayers.map((layer) =>
                    layer.type === "text" ? { ...layer, color: e.target.value } : layer,
                  ),
                )
              }
              className="h-10 w-full cursor-pointer rounded border border-zinc-300 bg-white"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-700">背景色</span>
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="h-10 w-full cursor-pointer rounded border border-zinc-300 bg-white"
            />
          </label>
        </div>

        <div>
          <span className="mb-2 block text-sm font-medium text-zinc-700">画像をアップロード</span>

          {!pendingFile ? (
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50 px-4 py-3 transition-colors hover:border-zinc-400 hover:bg-zinc-100">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0 text-zinc-400">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <div>
                <p className="text-sm font-medium text-zinc-700">クリックして画像を選択</p>
                <p className="text-xs text-zinc-400">PNG / JPG / WebP</p>
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
              />
            </label>
          ) : (
            <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pendingDataUrl}
                  alt="preview"
                  className="h-14 w-14 shrink-0 rounded-lg border border-zinc-100 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-zinc-700">{pendingFile.name}</p>
                  <p className="mt-0.5 text-xs text-zinc-400">どちらで使用しますか？</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setPendingFile(null); setPendingDataUrl(""); }}
                  className="shrink-0 rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                  aria-label="キャンセル"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={onPlaceOnCanvas}
                  className="flex-1 rounded-full bg-zinc-800 px-3 py-2 text-xs font-bold text-white hover:bg-zinc-700"
                >
                  このままcanvasに置く
                </button>
                <button
                  type="button"
                  onClick={onUseAsAiRef}
                  className="flex-1 rounded-full bg-violet-600 px-3 py-2 text-xs font-bold text-white hover:bg-violet-700"
                >
                  AIで新しいデザインを生成する
                </button>
              </div>
            </div>
          )}
        </div>

        {selectedLayer?.type === "image" && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
            <p className="mb-2 text-xs font-bold text-emerald-800">✨ AI 画像ツール</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void onRmbg()}
                disabled={rmbgBusy}
                className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {rmbgBusy ? "処理中..." : "背景を削除"}
              </button>
              <button
                type="button"
                onClick={() => void onUpscale()}
                disabled={upscaleBusy}
                className="rounded-full border border-emerald-600 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
              >
                {upscaleBusy ? "処理中..." : "AI 超解像 (4×)"}
              </button>
            </div>
            {rmbgMsg && <p className="mt-1.5 text-xs text-emerald-700">{rmbgMsg}</p>}
            {upscaleMsg && <p className="mt-1.5 text-xs text-emerald-700">{upscaleMsg}</p>}
          </div>
        )}

        {/* AI Sticker generation panel */}
        <div className="rounded-xl border border-pink-200 bg-pink-50/60 p-4">
          <h2 className="mb-2 text-sm font-bold text-pink-900">🎀 AIスタンプ生成</h2>
          <p className="mb-2 text-xs text-zinc-500">キーワードを入力すると、AIが透明背景の貼り付け用スタンプを生成します</p>
          <div className="flex gap-2">
            <input
              value={stickerKeyword}
              onChange={(e) => setStickerKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void onStickerGenerate(); }}
              placeholder="例：星、ハート、桜、推し"
              className="flex-1 rounded-lg border border-pink-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-pink-500"
              disabled={stickerBusy}
            />
            <button
              type="button"
              onClick={() => void onStickerGenerate()}
              disabled={stickerBusy || !stickerKeyword.trim()}
              className="rounded-full bg-pink-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-pink-600 disabled:opacity-50"
            >
              {stickerBusy ? "生成中..." : "生成"}
            </button>
          </div>
          {stickerMsg && (
            <p className="mt-1.5 text-xs text-pink-700">{stickerMsg}</p>
          )}
          {stickerHistory.length > 0 && (
            <div className="mt-2">
              <p className="mb-1 text-xs text-zinc-500">最近のキーワード</p>
              <div className="flex flex-wrap gap-1">
                {stickerHistory.map((kw, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setStickerKeyword(kw)}
                    className="rounded-full border border-pink-300 bg-white px-2 py-0.5 text-xs text-pink-700 hover:bg-pink-100"
                  >
                    {kw}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-700">画像の拡大率</span>
            <input
              type="range"
              min={0.3}
              max={2.5}
              step={0.01}
              value={selectedLayer ? (selectedLayer.scaleX + selectedLayer.scaleY) / 2 : 1}
              onChange={(e) =>
                updateSelectedLayer((layer) => ({
                  ...layer,
                  scaleX: Number(e.target.value),
                  scaleY: Number(e.target.value),
                }))
              }
              className="w-full"
            />
            <span className="text-xs text-zinc-500">
              {selectedLayer ? `${selectedLayer.scaleX.toFixed(2)} x ${selectedLayer.scaleY.toFixed(2)}` : "1.00"}
            </span>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-700">画像の回転</span>
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={selectedLayer?.rotate ?? 0}
              onChange={(e) =>
                updateSelectedLayer((layer) => ({ ...layer, rotate: Number(e.target.value) }))
              }
              className="w-full"
            />
            <span className="text-xs text-zinc-500">{selectedLayer?.rotate ?? 0}°</span>
          </label>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <p className="mb-2 text-xs font-semibold text-zinc-700">レイヤー（上から手前／ドラッグで並べ替え）</p>
          <div className="mb-2 flex gap-2">
            <button
              type="button"
              onClick={groupSelectedLayers}
              disabled={selectedLayerIds.length < 2}
              className="rounded border border-zinc-300 px-2 py-0.5 text-[11px] disabled:opacity-50"
            >
              グループ化
            </button>
            <button
              type="button"
              onClick={ungroupSelectedLayers}
              className="rounded border border-zinc-300 px-2 py-0.5 text-[11px]"
            >
              グループ解除
            </button>
          </div>
          <div className="space-y-1">
            {layers.map((layer) => (
              <div
                key={layer.id}
                draggable
                onDragStart={() => onLayerDragStart(layer.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onLayerDrop(layer.id)}
                className={`flex items-center gap-2 rounded px-2 py-1 text-xs ${
                  selectedLayerId === layer.id ? "bg-orange-100" : "bg-white"
                }`}
              >
                <input
                  type="checkbox"
                  title="表示／非表示"
                  checked={!layer.hidden}
                  onChange={(e) =>
                    updateEditor((prev) =>
                      prev.map((l) => l.id === layer.id ? { ...l, hidden: !e.target.checked } : l)
                    )
                  }
                />
                <span className="inline-flex h-6 w-6 items-center justify-center overflow-hidden rounded border border-zinc-300 bg-zinc-100">
                  {layer.type === "image" ? (
                    <Image src={layer.dataUrl} alt="" width={24} height={24} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-bold text-zinc-600">T</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLayerId(layer.id);
                    setSelectedLayerIds([layer.id]);
                  }}
                  className="flex-1 text-left"
                >
                  {layer.type === "image" ? "🖼" : "📝"} {layer.name}
                  {layer.groupId ? ` [${layer.groupId.slice(-4)}]` : ""}
                </button>
                <button
                  type="button"
                  onClick={() => toggleLock(layer.id)}
                  className="rounded border border-zinc-300 px-1"
                >
                  {layer.locked ? "ロック解除" : "ロック"}
                </button>
                <button
                  type="button"
                  onClick={() => bringForward(layer.id)}
                  className="rounded border border-zinc-300 px-1"
                >
                  上へ
                </button>
                <button
                  type="button"
                  onClick={() => sendBackward(layer.id)}
                  className="rounded border border-zinc-300 px-1"
                >
                  下へ
                </button>
                <button
                  type="button"
                  title="削除"
                  onClick={() =>
                    updateEditor((prev) => prev.filter((l) => l.id !== layer.id))
                  }
                  className="rounded border border-red-300 px-1 text-red-500 hover:bg-red-50"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-zinc-700">
            推定DPI（印刷の解像度目安）
          </span>
          <input
            type="range"
            min={72}
            max={400}
            step={1}
            value={estimatedDpi}
            onChange={(e) => setEstimatedDpi(Number(e.target.value))}
            className="w-full"
          />
          <span className="text-xs text-zinc-500">{estimatedDpi} DPI</span>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-zinc-700">点数</span>
          <input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-[#e85c22]"
          />
        </label>

        {/* Flatten / merge preview */}
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900">🖨 印刷用合成プレビュー</span>
            <button
              type="button"
              onClick={() => void onPreviewFlatten()}
              disabled={flattenBusy}
              className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {flattenBusy ? "合成中..." : "レイヤーを合成"}
            </button>
          </div>
          {flattenMsg && <p className="mb-1 text-xs text-indigo-700">{flattenMsg}</p>}
          {flattenedPreviewUrl && (
            <div className="flex flex-col gap-2">
              <img
                src={flattenedPreviewUrl}
                alt="合成プレビュー"
                className="w-full rounded border border-indigo-200 object-contain"
              />
              <a
                href={flattenedPreviewUrl}
                download="design-merged.png"
                className="inline-flex items-center justify-center rounded-full border border-indigo-400 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
              >
                ⬇ PNG をダウンロード
              </a>
            </div>
          )}
          {!flattenedPreviewUrl && !flattenBusy && (
            <p className="text-xs text-zinc-400">「レイヤーを合成」を押すと全表示中レイヤーを1枚のPNGに合成して確認できます</p>
          )}
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={loading}
          className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#e85c22] text-sm font-bold text-white hover:bg-[#d14f1b] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "保存中…" : "デザインを保存"}
        </button>
        <button
          type="button"
          onClick={exportPrintDraftJson}
          className="inline-flex h-11 w-full items-center justify-center rounded-full border border-zinc-300 text-sm font-semibold text-zinc-700 hover:border-zinc-400"
        >
          印刷用データをJSONで出力
        </button>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        ) : null}

        {saved ? (
          <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
            <p>
              customization_id:{" "}
              <span className="font-mono">{saved.customization_id}</span>
            </p>
            <p>
              requestId: <span className="font-mono">{saved.requestId}</span>
            </p>
            <p className={dpiTone}>
              DPI: {saved.dpi_check_result.estimated_dpi} / 推奨{" "}
              {saved.dpi_check_result.min_recommended_dpi}
            </p>
            <p>{saved.dpi_check_result.message}</p>
            {saved.warnings.length > 0 ? (
              <ul className="list-disc pl-5">
                {saved.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : null}
            <a
              href={saved.preview_url}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-[#e85c22] underline"
            >
              プレビュー情報
            </a>
            <br />
            {dpiBlocksProduction ? (
              <span className="inline-block text-xs text-red-600">注文へ進む（DPI 不足のため停止）</span>
            ) : (
              <Link
                href={`${storePath("/checkout")}?customization_id=${saved.customization_id}`}
                className="inline-block text-[#e85c22] underline"
              >
                このデザインで注文へ進む →
              </Link>
            )}
            <br />
            <button
              type="button"
              onClick={onAddToCart}
              disabled={addingToCart || dpiBlocksProduction}
              className="mt-1 inline-flex h-8 items-center justify-center rounded-full border border-zinc-300 px-3 text-xs font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {addingToCart ? "追加中…" : "カートに入れる"}
            </button>
            <Link href={storePath("/cart")} className="ml-2 text-[#e85c22] underline">
              カートを開く
            </Link>
          </div>
        ) : null}
        {cartMsg ? <p className="text-xs text-zinc-500">{cartMsg}</p> : null}

        <Link
          href={storePath(`/products/${product.slug}`)}
          className="inline-block text-sm text-[#e85c22] hover:underline"
        >
          ← 商品ページに戻る
        </Link>
      </section>
    </div>
    </>
  );
}
