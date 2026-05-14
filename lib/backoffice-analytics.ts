import { getDb } from "@/lib/db/client";
import { listOrdersPage } from "@/lib/db/orders-repository";
import { listOrdersBackoffice } from "@/lib/orders-store";
import { products } from "@/data/seed";

export type SkuSalesRow = {
  product_id: string;
  title: string;
  qty_sold: number;
  order_count: number;
};

export type OrderStatusBreakdown = Record<string, number>;

export type BackofficeAnalyticsSummary = {
  total_orders: number;
  by_status: OrderStatusBreakdown;
  sku_sales: SkuSalesRow[];
  /** 演示：审图队列占位（无计时字段时返回 0） */
  artwork_review_queue_estimate: number;
};

export async function getBackofficeAnalyticsSummary(): Promise<BackofficeAnalyticsSummary> {
  const db = getDb();
  const pageSize = 500;
  let items: { product_id: string; qty: number; status: string }[] = [];
  let total = 0;

  if (db) {
    const page = await listOrdersPage(db, { page: 1, pageSize });
    items = page.items.map((o) => ({ product_id: o.product_id, qty: o.qty, status: o.status }));
    total = page.total;
  } else {
    const page = await listOrdersBackoffice({ page: 1, pageSize });
    items = page.items.map((o) => ({ product_id: o.product_id, qty: o.qty, status: o.status }));
    total = page.total;
  }

  const by_status: OrderStatusBreakdown = {};
  const qtyByProduct: Record<string, { qty: number; orders: number }> = {};
  for (const o of items) {
    by_status[o.status] = (by_status[o.status] ?? 0) + 1;
    if (!qtyByProduct[o.product_id]) qtyByProduct[o.product_id] = { qty: 0, orders: 0 };
    qtyByProduct[o.product_id].qty += o.qty;
    qtyByProduct[o.product_id].orders += 1;
  }

  const sku_sales: SkuSalesRow[] = Object.entries(qtyByProduct)
    .map(([product_id, v]) => {
      const p = products.find((x) => x.product_id === product_id);
      return {
        product_id,
        title: p?.title ?? product_id,
        qty_sold: v.qty,
        order_count: v.orders,
      };
    })
    .sort((a, b) => b.qty_sold - a.qty_sold);

  const artwork_review_queue_estimate = by_status.reviewing ?? 0;

  return {
    total_orders: total,
    by_status,
    sku_sales,
    artwork_review_queue_estimate,
  };
}
