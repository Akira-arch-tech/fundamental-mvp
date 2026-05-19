import { products } from "@/data/seed";
import { saveCustomization } from "@/lib/customizations-store";
import type { ProductType } from "./types";

const PRODUCT_TO_SEED_ID: Record<ProductType, string> = {
  acrylic_standee: "p4",
  badge: "p1",
  phone_case: "p1",
  clear_file: "p1",
  tshirt: "p1",
};

export interface CheckoutLinkResult {
  customization_id: string;
  url: string;
  product_id: string;
}

/** 将 Agent 确认的设计图写入定制草稿，返回结账预览 URL */
export async function createCheckoutPreview(params: {
  productType: ProductType;
  designUrl: string;
  siteOrigin?: string;
}): Promise<CheckoutLinkResult> {
  const product_id = PRODUCT_TO_SEED_ID[params.productType] ?? "p4";
  const product = products.find((p) => p.product_id === product_id);
  if (!product) {
    throw new Error(`product not found: ${product_id}`);
  }

  const created = await saveCustomization({
    product_id,
    template_id: product.design_template_id,
    text_layers: [],
    color_layers: [],
    user_images: [{ name: "agent-design.png", data_url: params.designUrl }],
    transform_matrix: [1, 0, 0, 1, 0, 0],
    estimated_dpi: 180,
  });

  const origin =
    params.siteOrigin?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "";

  const path = `/checkout?customization_id=${encodeURIComponent(created.customization_id)}`;
  const url = origin ? `${origin}${path}` : path;

  return {
    customization_id: created.customization_id,
    url,
    product_id,
  };
}
