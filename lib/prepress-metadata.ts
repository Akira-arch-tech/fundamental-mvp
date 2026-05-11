import type { CustomizationRecord, OrderRecord, ProductDetail } from "@/lib/types";
import type { StoreCurrency } from "@/lib/storefront-constants";

/**
 * PRD §8.3 印前包：JSON（变换矩阵、SKU、预览路径、图层摘要）
 * 不含完整 data_url，避免包体过大；生产环境应替换为对象存储签名 URL。
 */
export function buildPrepressMetadataBundle(params: {
  order: OrderRecord;
  product: ProductDetail | undefined;
  customization: CustomizationRecord;
  display_currency: StoreCurrency;
  generated_at: string;
}): Record<string, unknown> {
  const { order, product, customization, display_currency, generated_at } = params;

  return {
    schema_version: "fundamental.prepress.v1",
    generated_at,
    display_currency_hint: display_currency,
    pricing_note:
      display_currency === "KRW"
        ? "前台可展示 KRW；本订单金额字段仍以 JPY 内部单位存储（演示）"
        : "金额单位为 JPY",
    order: {
      order_id: order.order_id,
      order_no: order.order_no,
      status: order.status,
      qty: order.qty,
      workorder_id: order.workorder_id,
      unit_price: order.unit_price,
      shipping_fee: order.shipping_fee,
      total_amount: order.total_amount,
      payment_method: order.payment_method ?? "demo_instant",
      copyright_acknowledged: order.copyright_acknowledged ?? false,
    },
    product: product
      ? {
          product_id: product.product_id,
          slug: product.slug,
          title: product.title,
          design_template_id: product.design_template_id,
          category_ids: product.category_ids,
        }
      : { product_id: order.product_id },
    customization: {
      customization_id: customization.customization_id,
      template_id: customization.template_id,
      preview_url: customization.preview_url,
      dpi_check_result: customization.dpi_check_result,
      warnings: customization.warnings,
      transform_matrix: customization.transform_matrix ?? [1, 0, 0, 1, 0, 0],
      text_layers: customization.text_layers,
      color_layers: customization.color_layers,
      user_images: customization.user_images.map((img) => ({
        name: img.name,
        data_url_prefix_sha: img.data_url.slice(0, 96),
        approx_bytes: img.data_url.length,
        note: "生产环境：此处为受控下载 URL，本 JSON 不包含完整位图。",
      })),
    },
  };
}
