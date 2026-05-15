"use client";

import { useEffect, useImperativeHandle, useRef, forwardRef } from "react";
import type { Canvas as FabricCanvasType, FabricObject } from "fabric";

// ── Layer types (shared with CustomizeEditor) ──────────────────────────────
export type LayerType = "image" | "text";

export interface BaseLayer {
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

export interface ImageLayer extends BaseLayer {
  type: "image";
  dataUrl: string;
}

export interface TextLayer extends BaseLayer {
  type: "text";
  text: string;
  color: string;
  fontFamily?: string;
  fontSize?: number;
}

export type CanvasLayer = ImageLayer | TextLayer;

// Internal Fabric object with our custom metadata
interface TaggedObject extends FabricObject {
  _layerId: string;
  _dataUrl?: string;
}

function asTagged(obj: FabricObject): TaggedObject {
  return obj as unknown as TaggedObject;
}

// ── Ref API exposed to parent ──────────────────────────────────────────────
export interface FabricCanvasHandle {
  exportPng(multiplier?: number): string;
  getCanvas(): FabricCanvasType | null;
}

// ── Props ──────────────────────────────────────────────────────────────────
interface Props {
  layers: CanvasLayer[];
  bgColor: string;
  selectedLayerId: string | null;
  onLayerChange: (id: string, patch: Partial<CanvasLayer>) => void;
  onSelectionChange: (id: string | null) => void;
  canvasSize?: number;
  renderUnderlay?: React.ReactNode;
  globalFontFamily?: string;
}

// ── Component ──────────────────────────────────────────────────────────────
export const FabricCanvas = forwardRef<FabricCanvasHandle, Props>(function FabricCanvas(
  { layers, bgColor, selectedLayerId, onLayerChange, onSelectionChange, canvasSize = 520, renderUnderlay, globalFontFamily = "sans-serif" },
  ref
) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fcRef = useRef<FabricCanvasType | null>(null);
  const objMapRef = useRef<Map<string, FabricObject>>(new Map());
  const suppressSyncRef = useRef(false);

  // Latest callbacks in a ref so event handlers don't go stale
  const onLayerChangeRef = useRef(onLayerChange);
  const onSelectionChangeRef = useRef(onSelectionChange);
  onLayerChangeRef.current = onLayerChange;
  onSelectionChangeRef.current = onSelectionChange;

  // ── Bootstrap Fabric canvas once ────────────────────────────────────────
  useEffect(() => {
    if (!canvasElRef.current) return;
    let fc: FabricCanvasType;

    import("fabric").then(({ Canvas, FabricText, FabricImage }) => {
      fc = new Canvas(canvasElRef.current!, {
        width: canvasSize,
        height: canvasSize,
        selection: true,
        backgroundColor: bgColor,
        preserveObjectStacking: true,
      });
      fcRef.current = fc;

      fc.on("selection:created", () => {
        const active = fc.getActiveObject();
        onSelectionChangeRef.current(active ? asTagged(active)._layerId ?? null : null);
      });
      fc.on("selection:updated", () => {
        const active = fc.getActiveObject();
        onSelectionChangeRef.current(active ? asTagged(active)._layerId ?? null : null);
      });
      fc.on("selection:cleared", () => onSelectionChangeRef.current(null));

      fc.on("object:modified", (e) => {
        if (suppressSyncRef.current || !e.target) return;
        const obj = e.target;
        const id = asTagged(obj)._layerId;
        if (!id) return;
        onLayerChangeRef.current(id, {
          x: (obj.left ?? 0) - canvasSize / 2,
          y: (obj.top ?? 0) - canvasSize / 2,
          scaleX: obj.scaleX ?? 1,
          scaleY: obj.scaleY ?? 1,
          rotate: obj.angle ?? 0,
        });
      });

      fc.on("text:changed", (e) => {
        if (!e.target) return;
        const obj = e.target;
        const id = asTagged(obj)._layerId;
        if (!id) return;
        const text = (obj as unknown as { text: string }).text ?? "";
        onLayerChangeRef.current(id, { text } as Partial<TextLayer>);
      });

      // Initial layer sync
      void syncLayersToFabric(fc, layers, objMapRef.current, canvasSize, FabricImage, FabricText, globalFontFamily);
    });

    return () => {
      fc?.dispose();
      fcRef.current = null;
      objMapRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasSize]);

  // ── Sync bgColor ───────────────────────────────────────────────────────
  useEffect(() => {
    const fc = fcRef.current;
    if (!fc) return;
    fc.backgroundColor = bgColor;
    fc.requestRenderAll();
  }, [bgColor]);

  // ── Sync layers → Fabric objects ──────────────────────────────────────
  useEffect(() => {
    const fc = fcRef.current;
    if (!fc) return;
    import("fabric").then(({ FabricImage, FabricText }) => {
      suppressSyncRef.current = true;
      void syncLayersToFabric(fc, layers, objMapRef.current, canvasSize, FabricImage, FabricText, globalFontFamily).then(
        () => { suppressSyncRef.current = false; }
      );
    });
  }, [layers, canvasSize, globalFontFamily]);

  // ── Sync selection parent → Fabric ────────────────────────────────────
  useEffect(() => {
    const fc = fcRef.current;
    if (!fc) return;
    if (selectedLayerId === null) {
      fc.discardActiveObject();
      fc.requestRenderAll();
      return;
    }
    const obj = objMapRef.current.get(selectedLayerId);
    if (obj) {
      suppressSyncRef.current = true;
      fc.setActiveObject(obj);
      fc.requestRenderAll();
      suppressSyncRef.current = false;
    }
  }, [selectedLayerId]);

  // ── Imperative handle ──────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    exportPng(multiplier = 3) {
      return fcRef.current?.toDataURL({ format: "png", multiplier }) ?? "";
    },
    getCanvas() {
      return fcRef.current;
    },
  }));

  return (
    <div
      className="relative mx-auto overflow-hidden rounded-2xl border border-zinc-200 shadow-sm"
      style={{ width: canvasSize, height: canvasSize }}
    >
      {/* Product base layer sits under the Fabric canvas */}
      {renderUnderlay && (
        <div className="pointer-events-none absolute inset-0 z-0">{renderUnderlay}</div>
      )}
      <div className="absolute inset-0 z-10">
        <canvas ref={canvasElRef} />
      </div>
    </div>
  );
});

// ── Sync helper ────────────────────────────────────────────────────────────
type FabricImageCtor = typeof import("fabric")["FabricImage"];
type FabricTextCtor = typeof import("fabric")["FabricText"];

async function syncLayersToFabric(
  fc: FabricCanvasType,
  layers: CanvasLayer[],
  objMap: Map<string, FabricObject>,
  canvasSize: number,
  FabricImage: FabricImageCtor,
  FabricText: FabricTextCtor,
  globalFontFamily = "sans-serif"
) {
  const center = canvasSize / 2;
  const incomingIds = new Set(layers.map((l) => l.id));

  // Remove deleted layers
  for (const [id, obj] of Array.from(objMap.entries())) {
    if (!incomingIds.has(id)) {
      fc.remove(obj);
      objMap.delete(id);
    }
  }

  // Bottom-to-top order for z rendering (layers[0] = topmost in UI)
  const ordered = [...layers].reverse();

  for (const layer of ordered) {
    const existing = objMap.get(layer.id);

    const commonProps = {
      left: center + layer.x,
      top: center + layer.y,
      scaleX: layer.scaleX,
      scaleY: layer.scaleY,
      angle: layer.rotate,
      visible: !layer.hidden,
      selectable: !layer.locked,
      evented: !layer.locked,
      originX: "center" as const,
      originY: "center" as const,
    };

    if (layer.type === "image") {
      const imgLayer = layer as ImageLayer;
      const existingTagged = existing ? asTagged(existing) : null;

      if (existingTagged?._dataUrl === imgLayer.dataUrl) {
        existing!.set(commonProps);
      } else {
        if (existing) fc.remove(existing);
        try {
          const img = await FabricImage.fromURL(imgLayer.dataUrl, { crossOrigin: "anonymous" });
          const box = canvasSize - 48;
          const ratio = Math.min(box / (img.width || 1), box / (img.height || 1));
          img.set({ ...commonProps, scaleX: layer.scaleX * ratio, scaleY: layer.scaleY * ratio });
          const tagged = asTagged(img);
          tagged._layerId = layer.id;
          tagged._dataUrl = imgLayer.dataUrl;
          fc.add(img);
          objMap.set(layer.id, img);
          fc.requestRenderAll();
          continue;
        } catch {
          continue;
        }
      }
    } else {
      const tl = layer as TextLayer;
      const fontFamily = tl.fontFamily ?? globalFontFamily;
      const fontSize = tl.fontSize ?? 36;
      if (existing) {
        // Use set() so Fabric's internal dirty/render logic fires correctly
        existing.set({
          ...commonProps,
          fill: tl.color,
          text: tl.text || " ",
          fontFamily,
          fontSize,
        } as Parameters<typeof existing.set>[0]);
      } else {
        const textObj = new FabricText(tl.text || " ", {
          ...commonProps,
          fill: tl.color,
          fontWeight: "bold",
          fontFamily,
          fontSize,
          editable: true,
        });
        asTagged(textObj)._layerId = layer.id;
        fc.add(textObj);
        objMap.set(layer.id, textObj);
        fc.requestRenderAll();
        continue;
      }
    }

    if (existing && !asTagged(existing)._layerId) {
      asTagged(existing)._layerId = layer.id;
    }
  }

  // Enforce z-order (layers[0] = topmost → highest z-index)
  const reversedForZ = [...layers].reverse();
  reversedForZ.forEach((layer, i) => {
    const obj = objMap.get(layer.id);
    if (obj) fc.moveObjectTo(obj, i);
  });

  fc.requestRenderAll();
}
