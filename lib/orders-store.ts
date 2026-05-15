import fs from "node:fs/promises";
import path from "node:path";
import { recordAigcLifecycleEvent } from "@/lib/aigc-lifecycle";
import { products } from "@/data/seed";
import { getDb } from "@/lib/db/client";
import {
  insertOrder,
  listOrdersPage,
  selectOrderById,
  selectOrderByOrderNo,
  updateOrderNote as updateOrderNoteInDb,
  updateOrderStatus as updateOrderStatusInDb,
} from "@/lib/db/orders-repository";
import { calculatePricing, getPricingTemplate } from "@/lib/pricing-template";
import { addShipmentEvent } from "@/lib/shipment-events-store";
import { createWorkorder } from "@/lib/workorders-store";
import type { OrderCreateInput, OrderRecord } from "@/lib/types";

const STORE_PATH = process.env.VERCEL ? "/tmp/.orders-store.json" : path.join(process.cwd(), ".orders-store.json");

function newOrderId(): string {
  const hex = () => Math.random().toString(16).slice(2, 10);
  return `ord_${hex()}${hex()}`;
}

function newOrderNo(): string {
  const ts = Date.now().toString().slice(-8);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `FDM-${ts}-${suffix}`;
}

async function readStore(): Promise<Record<string, OrderRecord>> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf-8");
    return JSON.parse(raw) as Record<string, OrderRecord>;
  } catch {
    return {};
  }
}

async function writeStore(data: Record<string, OrderRecord>) {
  await fs.writeFile(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

async function ensureOrderHydratedFile(order: OrderRecord): Promise<OrderRecord> {
  if (order.workorder_id) return order;
  const workorder = await createWorkorder(order.order_id);
  const hydrated: OrderRecord = { ...order, workorder_id: workorder.workorder_id };
  const store = await readStore();
  store[hydrated.order_id] = hydrated;
  await writeStore(store);
  await addShipmentEvent({
    order_id: hydrated.order_id,
    event_type: "order_created",
    event_label: "注文を受け付けました",
    location: "FUNDAMENTAL Platform",
  });
  return hydrated;
}

export async function saveOrder(input: OrderCreateInput): Promise<OrderRecord> {
  const product = products.find((p) => p.product_id === input.product_id);
  const basePrice = product?.price_from ?? 0;
  const pricingTemplate = await getPricingTemplate();
  const pricing = calculatePricing(basePrice, input.qty, pricingTemplate);
  const order_id = newOrderId();
  const workorder = await createWorkorder(order_id);

  const record: OrderRecord = {
    ...input,
    payment_method:
      input.payment_method === "demo_instant"
        ? "demo_instant"
        : input.payment_method === "stripe"
          ? "stripe"
          : undefined,
    copyright_acknowledged: input.copyright_acknowledged === true,
    order_id,
    order_no: newOrderNo(),
    status: "created",
    workorder_id: workorder.workorder_id,
    unit_price: pricing.unit_price,
    shipping_fee: pricing.shipping_fee,
    total_amount: pricing.total_amount,
    created_at: new Date().toISOString(),
  };

  const db = getDb();
  if (db) {
    await insertOrder(db, record);
  } else {
    const store = await readStore();
    store[record.order_id] = record;
    await writeStore(store);
  }

  await addShipmentEvent({
    order_id: record.order_id,
    event_type: "order_created",
    event_label: "注文を受け付けました",
    location: "FUNDAMENTAL Platform",
  });
  return record;
}

export async function getOrder(orderId: string): Promise<OrderRecord | undefined> {
  const db = getDb();
  if (db) {
    return selectOrderById(db, orderId);
  }
  const store = await readStore();
  const order = store[orderId];
  if (!order) return undefined;
  return ensureOrderHydratedFile(order);
}

export async function getOrderByOrderNo(orderNo: string): Promise<OrderRecord | undefined> {
  const db = getDb();
  if (db) {
    return selectOrderByOrderNo(db, orderNo);
  }
  const store = await readStore();
  return Object.values(store).find((o) => o.order_no === orderNo);
}

const ORDER_NOTE_MAX = 12_000;

/** 按内部 ID 或订单号解析订单（trim 后先按 order_id 查，再按 order_no） */
export async function resolveOrderRef(ref: string): Promise<OrderRecord | undefined> {
  const t = ref.trim();
  if (!t) return undefined;
  const byId = await getOrder(t);
  if (byId) return byId;
  return getOrderByOrderNo(t);
}

/**
 * 在订单 `note` 末尾追加一行（用于 AI 回写等内部运营备注）。
 * @returns NOT_FOUND / NOTE_TOO_LONG / ok
 */
export async function appendOrderNoteLine(
  orderId: string,
  line: string,
): Promise<{ ok: true } | { ok: false; code: "NOT_FOUND" | "NOTE_TOO_LONG" }> {
  const trimmed = line.trim();
  if (!trimmed) return { ok: true };
  const order = await getOrder(orderId);
  if (!order) return { ok: false, code: "NOT_FOUND" };
  const prev = order.note?.trim() ?? "";
  const sep = prev ? "\n" : "";
  const next = `${prev}${sep}${trimmed}`;
  if (next.length > ORDER_NOTE_MAX) return { ok: false, code: "NOTE_TOO_LONG" };

  const db = getDb();
  if (db) {
    const updated = await updateOrderNoteInDb(db, orderId, next);
    return updated ? { ok: true } : { ok: false, code: "NOT_FOUND" };
  }
  const store = await readStore();
  const o = store[orderId];
  if (!o) return { ok: false, code: "NOT_FOUND" };
  o.note = next;
  await writeStore(store);
  return { ok: true };
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderRecord["status"],
): Promise<boolean> {
  const db = getDb();
  if (db) {
    const ok = await updateOrderStatusInDb(db, orderId, status);
    if (ok && status === "shipped") {
      void recordAigcLifecycleEvent({
        order_id: orderId,
        kind: "order_shipped",
        note: "PRD v0.3: 印前拉取后应清理 confirmed 临时图；此处仅写审计日志。",
      });
    }
    return ok;
  }
  const store = await readStore();
  const o = store[orderId];
  if (!o) return false;
  o.status = status;
  await writeStore(store);
  if (status === "shipped") {
    void recordAigcLifecycleEvent({
      order_id: orderId,
      kind: "order_shipped",
      note: "PRD v0.3: 印前拉取后应清理 confirmed 临时图；此处仅写审计日志。",
    });
  }
  return true;
}

export type ListOrdersBackofficeParams = {
  page: number;
  pageSize: number;
  status?: string;
  keyword?: string;
  createdFrom?: string;
  createdTo?: string;
};

export async function listOrdersBackoffice(
  params: ListOrdersBackofficeParams,
): Promise<{ items: OrderRecord[]; total: number }> {
  const db = getDb();
  if (db) {
    return listOrdersPage(db, {
      page: params.page,
      pageSize: params.pageSize,
      status: params.status,
      keyword: params.keyword,
      createdFrom: params.createdFrom,
      createdTo: params.createdTo,
    });
  }

  const store = await readStore();
  let rows = Object.values(store).sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (params.status?.trim()) {
    rows = rows.filter((o) => o.status === params.status);
  }
  if (params.keyword?.trim()) {
    const kw = params.keyword.trim().toLowerCase();
    rows = rows.filter(
      (o) =>
        o.order_no.toLowerCase().includes(kw) ||
        o.order_id.toLowerCase().includes(kw) ||
        o.recipient_name.toLowerCase().includes(kw),
    );
  }
  const fromMs = params.createdFrom?.trim()
    ? new Date(params.createdFrom.trim()).getTime()
    : undefined;
  const toMs = params.createdTo?.trim() ? new Date(params.createdTo.trim()).getTime() : undefined;
  if (fromMs !== undefined && !Number.isNaN(fromMs)) {
    rows = rows.filter((o) => new Date(o.created_at).getTime() >= fromMs);
  }
  if (toMs !== undefined && !Number.isNaN(toMs)) {
    rows = rows.filter((o) => new Date(o.created_at).getTime() <= toMs);
  }
  const total = rows.length;
  const start = (params.page - 1) * params.pageSize;
  const items = rows.slice(start, start + params.pageSize);
  return { items, total };
}
