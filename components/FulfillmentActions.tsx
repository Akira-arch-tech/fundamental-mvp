"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ShipmentEvent } from "@/lib/types";

const quickEvents: Array<{
  type: ShipmentEvent["event_type"];
  label: string;
  location: string;
}> = [
  { type: "packed", label: "梱包完了", location: "Tokyo Factory" },
  { type: "shipped", label: "出荷完了", location: "Tokyo Hub" },
  { type: "in_transit", label: "輸送中", location: "Saitama Linehaul" },
  { type: "delivered", label: "配達完了", location: "Customer Address" },
];

/** 内部后台：时间线写入中文节点名，与买家日语页区分 */
const internalQuickEvents: Array<{
  type: ShipmentEvent["event_type"];
  label: string;
  location: string;
}> = [
  { type: "packed", label: "已打包", location: "东京工厂" },
  { type: "shipped", label: "已发货", location: "东京集散中心" },
  { type: "in_transit", label: "运输中", location: "埼玉干线" },
  { type: "delivered", label: "已签收", location: "收件地址" },
];

export function FulfillmentActions({
  orderId,
  variant = "ja",
}: {
  orderId: string;
  /** internal：管理后台演示用中文说明；ja：日语（若将来买家端需演示按钮时使用） */
  variant?: "ja" | "internal";
}) {
  const router = useRouter();
  const [loadingType, setLoadingType] = useState<string>("");
  const [error, setError] = useState("");
  const isInternal = variant === "internal";
  const events = isInternal ? internalQuickEvents : quickEvents;

  async function pushEvent(eventType: ShipmentEvent["event_type"], label: string, location: string) {
    setError("");
    setLoadingType(eventType);
    try {
      const res = await fetch("/api/shipments/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          event_type: eventType,
          event_label: label,
          location,
          tracking_no: "TRK-TEST-001",
        }),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) {
        throw new Error(json.message ?? (isInternal ? "节点写入失败" : "イベント登録失敗"));
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : isInternal ? "节点写入失败" : "イベント登録失敗");
    } finally {
      setLoadingType("");
    }
  }

  return (
    <div
      className={`rounded-2xl border bg-white p-4 shadow-sm ${
        isInternal ? "border-amber-100 shadow-amber-950/5" : "border-zinc-200"
      }`}
    >
      <h3 className="text-sm font-bold text-zinc-800">
        {isInternal ? "物流节点演示（写入发货时间线）" : "履約更新（Demo 操作）"}
      </h3>
      <p className="mt-1 text-xs text-zinc-500">
        {isInternal
          ? "模拟仓库/承运商回传节点，用于演示 ERP 回调前的内部补录。买家端不展示此操作区。"
          : "クリックすると物流イベントを追加し、下の時間線が更新されます。"}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {events.map((e) => (
          <button
            key={e.type}
            type="button"
            onClick={() => pushEvent(e.type, e.label, e.location)}
            disabled={loadingType.length > 0}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
              isInternal
                ? "border-amber-200/90 bg-amber-50/60 text-amber-950 hover:border-[#e85c22] hover:bg-white"
                : "border-zinc-200 hover:border-[#e85c22] hover:text-[#e85c22]"
            }`}
          >
            {loadingType === e.type ? (isInternal ? "提交中…" : "送信中...") : e.label}
          </button>
        ))}
      </div>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
