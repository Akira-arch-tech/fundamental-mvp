import fs from "node:fs/promises";
import path from "node:path";

export interface PricingTierRule {
  min_qty: number;
  discount_percent: number;
}

export interface PricingTemplate {
  markup_percent: number;
  shipping_fee_base: number;
  free_shipping_qty: number;
  tiers: PricingTierRule[];
  updated_at: string;
}

export interface PricingResult {
  unit_price: number;
  shipping_fee: number;
  total_amount: number;
  matched_tier_min_qty: number | null;
  discount_percent: number;
}

export interface PricingExplain {
  base_unit_price: number;
  markup_percent: number;
  marked_unit_price: number;
  discount_percent: number;
  final_unit_price: number;
  qty: number;
  shipping_fee: number;
  total_amount: number;
  matched_tier_min_qty: number | null;
}

const FILE = path.join(process.cwd(), ".fdm-pricing-template.json");

export const DEFAULT_PRICING_TEMPLATE: PricingTemplate = {
  markup_percent: 0,
  shipping_fee_base: 500,
  free_shipping_qty: 5,
  tiers: [
    { min_qty: 1, discount_percent: 0 },
    { min_qty: 10, discount_percent: 3 },
    { min_qty: 50, discount_percent: 8 },
    { min_qty: 200, discount_percent: 12 },
  ],
  updated_at: new Date().toISOString(),
};

function clampNumber(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function normalizeTemplate(input: Partial<PricingTemplate>): PricingTemplate {
  const tiersRaw = Array.isArray(input.tiers) ? input.tiers : DEFAULT_PRICING_TEMPLATE.tiers;
  const tiers = tiersRaw
    .map((r) => ({
      min_qty: Math.max(1, Math.floor(Number(r.min_qty) || 1)),
      discount_percent: clampNumber(Number(r.discount_percent) || 0, 0, 90),
    }))
    .sort((a, b) => a.min_qty - b.min_qty);
  const safeTiers = tiers.length > 0 ? tiers : DEFAULT_PRICING_TEMPLATE.tiers;
  return {
    markup_percent: clampNumber(Number(input.markup_percent) || 0, -20, 300),
    shipping_fee_base: Math.max(0, Math.floor(Number(input.shipping_fee_base) || 0)),
    free_shipping_qty: Math.max(1, Math.floor(Number(input.free_shipping_qty) || 1)),
    tiers: safeTiers,
    updated_at: new Date().toISOString(),
  };
}

export async function getPricingTemplate(): Promise<PricingTemplate> {
  try {
    const raw = await fs.readFile(FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<PricingTemplate>;
    return normalizeTemplate(parsed);
  } catch {
    return { ...DEFAULT_PRICING_TEMPLATE };
  }
}

export async function savePricingTemplate(input: Partial<PricingTemplate>): Promise<PricingTemplate> {
  const next = normalizeTemplate(input);
  await fs.writeFile(FILE, JSON.stringify(next, null, 2), "utf-8");
  return next;
}

export function calculatePricing(basePrice: number, qty: number, template: PricingTemplate): PricingResult {
  const safeBase = Math.max(0, Math.round(basePrice));
  const safeQty = Math.max(1, Math.floor(qty));
  const marked = Math.round(safeBase * (1 + template.markup_percent / 100));
  let matched: PricingTierRule | null = null;
  for (const r of template.tiers) {
    if (safeQty >= r.min_qty) matched = r;
  }
  const discountPercent = matched?.discount_percent ?? 0;
  const unit = Math.max(0, Math.round(marked * (1 - discountPercent / 100)));
  const shipping = safeQty >= template.free_shipping_qty ? 0 : template.shipping_fee_base;
  const total = unit * safeQty + shipping;
  return {
    unit_price: unit,
    shipping_fee: shipping,
    total_amount: total,
    matched_tier_min_qty: matched?.min_qty ?? null,
    discount_percent: discountPercent,
  };
}

export function explainPricing(basePrice: number, qty: number, template: PricingTemplate): PricingExplain {
  const safeBase = Math.max(0, Math.round(basePrice));
  const safeQty = Math.max(1, Math.floor(qty));
  const marked = Math.round(safeBase * (1 + template.markup_percent / 100));
  const result = calculatePricing(safeBase, safeQty, template);
  return {
    base_unit_price: safeBase,
    markup_percent: template.markup_percent,
    marked_unit_price: marked,
    discount_percent: result.discount_percent,
    final_unit_price: result.unit_price,
    qty: safeQty,
    shipping_fee: result.shipping_fee,
    total_amount: result.total_amount,
    matched_tier_min_qty: result.matched_tier_min_qty,
  };
}
