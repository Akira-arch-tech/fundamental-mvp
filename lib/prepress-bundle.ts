import type { OrderRecord } from "@/lib/types";

/** 印前包 MVP：JSON 清单（工厂或内部工具可据此拉取各 URL） */
export type PrepressBundleManifest = {
  version: 1;
  order_id: string;
  order_no: string;
  generated_at: string;
  customization_id: string;
  product_id: string;
  /** 相对站点根的 API 路径，便于工厂拉取 */
  metadata_api_path: string;
  /** 定制预览图（若存在） */
  preview_api_path: string;
};

export function buildPrepressBundleManifest(order: OrderRecord): PrepressBundleManifest {
  const cid = order.customization_id;
  return {
    version: 1,
    order_id: order.order_id,
    order_no: order.order_no,
    generated_at: new Date().toISOString(),
    customization_id: cid,
    product_id: order.product_id,
    metadata_api_path: `/api/backoffice/orders/${encodeURIComponent(order.order_id)}/prepress-metadata`,
    preview_api_path: `/api/customizations/${encodeURIComponent(cid)}/preview`,
  };
}
