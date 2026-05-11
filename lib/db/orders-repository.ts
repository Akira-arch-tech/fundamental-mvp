import { and, count, desc, eq, gte, ilike, lte, or } from "drizzle-orm";
import type { DrizzleDb } from "@/lib/db/client";
import { orders } from "@/lib/db/schema";
import type { OrderRecord } from "@/lib/types";

function rowToOrder(row: typeof orders.$inferSelect): OrderRecord {
  return {
    order_id: row.orderId,
    order_no: row.orderNo,
    customization_id: row.customizationId,
    product_id: row.productId,
    qty: row.qty,
    recipient_name: row.recipientName,
    recipient_phone: row.recipientPhone,
    shipping_address: row.shippingAddress,
    note: row.note ?? undefined,
    status: row.status as OrderRecord["status"],
    workorder_id: row.workorderId,
    unit_price: row.unitPrice,
    shipping_fee: row.shippingFee,
    total_amount: row.totalAmount,
    created_at: row.createdAt.toISOString(),
  };
}

export async function insertOrder(db: DrizzleDb, record: OrderRecord): Promise<void> {
  await db.insert(orders).values({
    orderId: record.order_id,
    orderNo: record.order_no,
    customizationId: record.customization_id,
    productId: record.product_id,
    qty: record.qty,
    recipientName: record.recipient_name,
    recipientPhone: record.recipient_phone,
    shippingAddress: record.shipping_address,
    note: record.note ?? null,
    status: record.status,
    workorderId: record.workorder_id,
    unitPrice: record.unit_price,
    shippingFee: record.shipping_fee,
    totalAmount: record.total_amount,
    createdAt: new Date(record.created_at),
  });
}

export async function selectOrderById(
  db: DrizzleDb,
  orderId: string,
): Promise<OrderRecord | undefined> {
  const [row] = await db.select().from(orders).where(eq(orders.orderId, orderId)).limit(1);
  return row ? rowToOrder(row) : undefined;
}

export type ListOrdersParams = {
  page: number;
  pageSize: number;
  status?: string;
  keyword?: string;
  /** ISO 8601，含边界（>=） */
  createdFrom?: string;
  /** ISO 8601，含边界（<=） */
  createdTo?: string;
};

function parseBoundaryIso(s: string | undefined): Date | undefined {
  if (!s?.trim()) return undefined;
  const d = new Date(s.trim());
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function listOrdersPage(
  db: DrizzleDb,
  params: ListOrdersParams,
): Promise<{ items: OrderRecord[]; total: number }> {
  const offset = (params.page - 1) * params.pageSize;
  const conditions = [];
  if (params.status?.trim()) {
    conditions.push(eq(orders.status, params.status.trim()));
  }
  if (params.keyword?.trim()) {
    const kw = `%${params.keyword.trim()}%`;
    conditions.push(
      or(
        ilike(orders.orderNo, kw),
        ilike(orders.recipientName, kw),
        ilike(orders.orderId, kw),
      )!,
    );
  }
  const from = parseBoundaryIso(params.createdFrom);
  if (from) conditions.push(gte(orders.createdAt, from));
  const to = parseBoundaryIso(params.createdTo);
  if (to) conditions.push(lte(orders.createdAt, to));
  const where = conditions.length ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(orders)
    .where(where)
    .orderBy(desc(orders.createdAt))
    .limit(params.pageSize)
    .offset(offset);

  const [cnt] = await db.select({ n: count() }).from(orders).where(where);
  return { items: rows.map(rowToOrder), total: cnt?.n ?? 0 };
}

export async function updateOrderStatus(
  db: DrizzleDb,
  orderId: string,
  status: OrderRecord["status"],
): Promise<boolean> {
  const rows = await db
    .update(orders)
    .set({ status })
    .where(eq(orders.orderId, orderId))
    .returning({ id: orders.orderId });
  return rows.length > 0;
}

export async function updateOrderNote(
  db: DrizzleDb,
  orderId: string,
  note: string | null,
): Promise<boolean> {
  const rows = await db
    .update(orders)
    .set({ note })
    .where(eq(orders.orderId, orderId))
    .returning({ id: orders.orderId });
  return rows.length > 0;
}

export async function selectOrderByOrderNo(
  db: DrizzleDb,
  orderNo: string,
): Promise<OrderRecord | undefined> {
  const [row] = await db.select().from(orders).where(eq(orders.orderNo, orderNo)).limit(1);
  return row ? rowToOrder(row) : undefined;
}
