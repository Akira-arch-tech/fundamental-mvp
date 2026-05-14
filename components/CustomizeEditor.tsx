"use client";

import Image from "next/image";
import { RemoteSafeFillImage } from "@/components/RemoteSafeImage";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AigcCandidate } from "@/lib/aigc-types";
import { AIGC_GENERATIONS_API_PATH, AIGC_MAX_CANDIDATE_COUNT, AIGC_MAX_REFERENCE_ASSET_COUNT, AIGC_MIN_CANDIDATE_COUNT, AIGC_REFERENCE_ASSETS_API_PATH } from "@/lib/aigc-shared-constants";
import { writeFdmAigcLastToWindow } from "@/lib/shop-aigc-persist";
import { storePath } from "@/lib/storefront-constants";
import type { ProductDetail } from "@/lib/types";

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
      y: 180,
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

  async function onSave() {
    setLoading(true);
    setError("");
    setSaved(null);
    try {
      const res = await fetch("/api/customizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: product.product_id,
          template_id: product.design_template_id,
          text_layers: layers
            .filter((layer): layer is TextLayer => layer.type === "text")
            .map((layer) => ({ text: layer.text, color: layer.color, x: layer.x, y: layer.y })),
          color_layers: [{ role: "background", value: bgColor }],
          user_images: layers
            .filter((layer): layer is ImageLayer => layer.type === "image")
            .map((layer) => ({ name: layer.name, data_url: layer.dataUrl })),
          transform_matrix: [1, 0, 0, 1, 0, 0],
          estimated_dpi: estimatedDpi,
        }),
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
    const blob = new Blob([JSON.stringify(printDraft, null, 2)], {
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
        throw new Error("文生图（txt2img）ではプロンプトが必須です。");
      }

      const body: Record<string, unknown> = {
        product_id: product.product_id,
        prompt: trimmedPrompt || undefined,
        negative_prompt: aigcNegative.trim() || undefined,
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
      <div className="mx-auto max-w-6xl px-4 pt-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50/95 px-4 py-3 text-sm leading-relaxed text-amber-950">
          <strong className="font-semibold">デモについて：</strong>
          本ページは主に「画像アップロード＋キャンバス上の配置・テキスト編集」の体験です。AI
          画像生成は MVP として段階的に拡充しています（下の「AI
          画像」ブロック）。詳細は
          <Link href="/policies" className="mx-1 font-semibold text-[#e85c22] underline">
            ポリシー
          </Link>
          をご確認ください。
        </div>
      </div>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-4 lg:grid-cols-[1fr_380px]">
      <section>
        <div
          ref={stageRef}
          className="relative mx-auto aspect-square w-full max-w-[520px] overflow-hidden rounded-2xl border border-zinc-200 shadow-sm"
          style={{ backgroundColor: bgColor }}
          onPointerMove={onStagePointerMove}
          onPointerUp={onStagePointerUp}
          tabIndex={0}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 10 : 1;
            if (e.key === "ArrowUp") {
              e.preventDefault();
              nudgeSelection(0, -step);
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              nudgeSelection(0, step);
            } else if (e.key === "ArrowLeft") {
              e.preventDefault();
              nudgeSelection(-step, 0);
            } else if (e.key === "ArrowRight") {
              e.preventDefault();
              nudgeSelection(step, 0);
            }
          }}
        >
          <RemoteSafeFillImage
            src={product.cover_url}
            alt={product.title}
            className="object-cover opacity-15"
            sizes="(max-width:768px) 100vw, 520px"
          />
          {layers
            .slice()
            .reverse()
            .map((layer) => {
              if (layer.type === "image") {
                return (
                  <div
                    key={layer.id}
                    className={`absolute inset-0 ${
                      selectedLayerId === layer.id ? "ring-2 ring-[#e85c22]/50" : ""
                    }`}
                    style={{
                      transform: `translate(${layer.x}px, ${layer.y}px) scale(${layer.scaleX}, ${layer.scaleY}) rotate(${layer.rotate}deg)`,
                    }}
                    onPointerDown={(e) => onLayerPointerDown(e, layer)}
                  >
                    <Image
                      src={layer.dataUrl}
                      alt={layer.name}
                      fill
                      className="object-contain p-6"
                      sizes="(max-width:768px) 100vw, 520px"
                    />
                  </div>
                );
              }
              return (
                <div
                  key={layer.id}
                  className="absolute inset-x-0 bottom-6 px-6 text-center"
                  style={{
                    transform: `translate(${layer.x}px, ${layer.y}px) scale(${layer.scaleX}, ${layer.scaleY}) rotate(${layer.rotate}deg)`,
                  }}
                  onPointerDown={(e) => onLayerPointerDown(e, layer)}
                >
                  <p
                    className={`rounded-md bg-white/70 px-3 py-2 text-lg font-bold shadow-sm backdrop-blur ${
                      selectedLayerId === layer.id ? "ring-2 ring-[#e85c22]/50" : ""
                    }`}
                    style={{ color: layer.color }}
                  >
                    {layer.text || "テキストを入力してください"}
                  </p>
                </div>
              );
            })}
          {selectedLayer && !selectedLayer.locked ? (
            <div
              className="pointer-events-none absolute left-1/2 top-1/2"
              style={{
                transform: `translate(${selectedLayer.x}px, ${selectedLayer.y}px) rotate(${selectedLayer.rotate}deg)`,
              }}
            >
              <div
                className="relative border border-sky-500/70"
                style={{
                  width: getLayerBaseSize(selectedLayer).width * selectedLayer.scaleX,
                  height: getLayerBaseSize(selectedLayer).height * selectedLayer.scaleY,
                  transform: "translate(-50%, -50%)",
                }}
              >
                {(
                  [
                    [-1, -1],
                    [0, -1],
                    [1, -1],
                    [-1, 0],
                    [1, 0],
                    [-1, 1],
                    [0, 1],
                    [1, 1],
                  ] as const
                ).map(([ax, ay]) => (
                  <button
                    key={`${ax}-${ay}`}
                    type="button"
                    className="pointer-events-auto absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-sky-500"
                    style={{
                      left: `${(ax + 1) * 50}%`,
                      top: `${(ay + 1) * 50}%`,
                    }}
                    onPointerDown={(e) => onScaleHandlePointerDown(e, selectedLayer, ax, ay)}
                  />
                ))}
                <button
                  type="button"
                  className="pointer-events-auto absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-[180%] rounded-full border border-white bg-violet-500"
                  onPointerDown={(e) => onRotateHandlePointerDown(e, selectedLayer)}
                />
                <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[290%] rounded bg-black/70 px-2 py-0.5 text-[10px] text-white">
                  {Math.round(getLayerBaseSize(selectedLayer).width * selectedLayer.scaleX)}x
                  {Math.round(getLayerBaseSize(selectedLayer).height * selectedLayer.scaleY)} ·{" "}
                  {selectedLayer.rotate}deg
                </div>
              </div>
            </div>
          ) : null}
          <div
            className="pointer-events-none absolute inset-[3%] rounded-xl border border-dashed border-red-400/45"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-[8%] rounded-lg border-2 border-dashed border-emerald-600/55"
            aria-hidden
          />
          {snapGuides.x != null ? (
            <div
              className="pointer-events-none absolute bottom-0 top-0 w-px bg-sky-500/70"
              style={{ left: `calc(50% + ${snapGuides.x}px)` }}
            />
          ) : null}
          {snapGuides.y != null ? (
            <div
              className="pointer-events-none absolute left-0 right-0 h-px bg-sky-500/70"
              style={{ top: `calc(50% + ${snapGuides.y}px)` }}
            />
          ) : null}
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          PRD §8.2：外周赤枠＝出血イメージ、内側緑枠＝安全区（簡易示意）。複数レイヤー・ロック・Undo/Redo に対応。
        </p>
        {dpiBlocksProduction ? (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-800">
            推定 DPI が 200 未満のため、カート追加と注文へ進むをブロックしています。
          </p>
        ) : null}
      </section>

      <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">デザインエディタ v2.5</h1>
          <p className="mt-1 text-sm text-zinc-600">{product.title}</p>
        </div>

        <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 text-sm text-zinc-800">
          <h2 className="text-sm font-bold text-violet-900">AI 画像（MVP デモ）</h2>
          <p className="mt-1 text-xs text-zinc-600">
            参考画像は最大 {AIGC_MAX_REFERENCE_ASSET_COUNT}{" "}
            枚まで。選択後は <code className="rounded bg-white/80 px-0.5">{AIGC_REFERENCE_ASSETS_API_PATH}</code>{" "}
            に multipart アップロードし、続けて <code className="rounded bg-white/80 px-0.5">{AIGC_GENERATIONS_API_PATH}</code>{" "}
            で <strong>txt2img / img2img / multi_ref</strong> ジョブを作成します（サーバーは mock provider）。
          </p>
          <label className="mt-2 block">
            <span className="mb-1 block text-xs font-medium text-zinc-700">参考画像（複数可）</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => onAigcRefFilesChange(e.target.files)}
              className="block w-full rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-xs file:mr-2 file:rounded file:border-0 file:bg-violet-100 file:px-2 file:py-1"
            />
            {aigcRefFiles.length > 0 ? (
              <span className="mt-1 block text-xs text-zinc-500">選択中: {aigcRefFiles.length} 枚</span>
            ) : null}
          </label>
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={aigcMultiRef}
              disabled={aigcRefFiles.length < 2}
              onChange={(e) => setAigcMultiRef(e.target.checked)}
            />
            <span className={aigcRefFiles.length < 2 ? "text-zinc-400" : ""}>
              多图组合（multi_ref、2 枚以上で有効・角色按 subject/style/… 轮换）
            </span>
          </label>
          <label className="mt-2 block">
            <span className="mb-1 block text-xs font-medium text-zinc-700">
              プロンプト（文生图で必須／参考のみの图生图では任意）
            </span>
            <textarea
              value={aigcPrompt}
              onChange={(e) => setAigcPrompt(e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="例：推しの雰囲気に合う淡い背景"
              className="w-full rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-violet-500"
            />
          </label>
          <label className="mt-2 block">
            <span className="mb-1 block text-xs font-medium text-zinc-700">ネガティブプロンプト（任意）</span>
            <input
              value={aigcNegative}
              onChange={(e) => setAigcNegative(e.target.value)}
              maxLength={2000}
              className="w-full rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-violet-500"
              placeholder="例：低解像度、テキスト"
            />
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
                  <button
                    key={c.index}
                    type="button"
                    onClick={() => setAigcPickIndex(c.index)}
                    className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${
                      aigcPickIndex === c.index ? "border-violet-600 ring-2 ring-violet-300" : "border-zinc-200"
                    }`}
                  >
                    <Image src={c.url} alt={`候補 ${c.index}`} fill className="object-cover" sizes="80px" />
                  </button>
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

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-zinc-700">画像をアップロード</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onUpload(e.target.files?.[0] ?? null)}
            className="block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5"
          />
          {selectedLayer?.type === "image" ? (
            <span className="mt-1 block text-xs text-zinc-500">{selectedLayer.name}</span>
          ) : null}
        </label>
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
                  checked={selectedLayerIds.includes(layer.id)}
                  onChange={(e) => toggleMultiSelect(layer.id, e.target.checked)}
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
