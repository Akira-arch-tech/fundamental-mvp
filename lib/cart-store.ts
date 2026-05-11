import fs from "node:fs/promises";
import path from "node:path";
import { products } from "@/data/seed";
import { isSpecCombinationAllowed } from "@/lib/spec-combination-whitelist";
import type {
  CartItemRecord,
  CartSpecSelection,
  ProductDetail,
  SpecOption,
} from "@/lib/types";

const STORE_PATH = path.join(process.cwd(), ".cart-store.json");

interface AddCartInput {
  product_id: string;
  qty: number;
  selected_specs?: CartSpecSelection[];
  source_sku_code?: string;
  customization_id?: string;
  added_from: "product" | "customize";
}

class CartValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CartValidationError";
  }
}

function newCartItemId(): string {
  const hex = () => Math.random().toString(16).slice(2, 10);
  return `cart_${hex()}${hex()}`;
}

async function readStore(): Promise<Record<string, CartItemRecord>> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf-8");
    return JSON.parse(raw) as Record<string, CartItemRecord>;
  } catch {
    return {};
  }
}

async function writeStore(data: Record<string, CartItemRecord>) {
  await fs.writeFile(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

function getSpecValueById(spec: SpecOption, valueId: string) {
  return spec.values.find((value) => value.id === valueId);
}

function normalizeSelections(
  product: ProductDetail,
  selectedSpecs: CartSpecSelection[] | undefined,
  addedFrom: AddCartInput["added_from"],
) {
  const bySpecId = new Map((selectedSpecs ?? []).map((selection) => [selection.spec_id, selection]));
  const normalized: CartSpecSelection[] = [];
  let optionPrice = 0;
  const skuParts: string[] = [];

  for (const spec of product.spec_schema) {
    const selected = bySpecId.get(spec.id);
    if (!selected) {
      if (addedFrom === "product") {
        throw new CartValidationError(`missing required spec: ${spec.label}`);
      }
      continue;
    }
    const value = getSpecValueById(spec, selected.value_id);
    if (!value) {
      throw new CartValidationError(`invalid spec value for ${spec.label}`);
    }
    normalized.push({
      spec_id: spec.id,
      spec_label: spec.label,
      value_id: value.id,
      value_label: value.label,
    });
    optionPrice += value.price_delta ?? 0;
    skuParts.push(`${spec.id}:${value.id}`);
  }

  if (addedFrom === "product" && normalized.length !== product.spec_schema.length) {
    throw new CartValidationError("spec selection is incomplete");
  }
  if (addedFrom === "product" && !isSpecCombinationAllowed(product.product_id, normalized)) {
    throw new CartValidationError(
      "selected spec combination is not allowed, please change size or process",
    );
  }

  const dynamicSku = skuParts.length > 0 ? `${product.product_id}__${skuParts.join("|")}` : product.product_id;

  return {
    normalizedSelections: normalized,
    optionPrice,
    dynamicSku,
  };
}

export async function listCartItems(): Promise<CartItemRecord[]> {
  const store = await readStore();
  return Object.values(store).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function addCartItem(input: AddCartInput): Promise<CartItemRecord> {
  const product = products.find((p) => p.product_id === input.product_id);
  if (!product) {
    throw new Error("product not found");
  }
  const qty = Math.max(1, Math.floor(input.qty));
  const { normalizedSelections, optionPrice, dynamicSku } = normalizeSelections(
    product,
    input.selected_specs,
    input.added_from,
  );
  const finalSkuCode = input.source_sku_code ?? dynamicSku;
  const unit_price = product.price_from + optionPrice;
  const store = await readStore();
  const existing = Object.values(store).find(
    (it) =>
      it.product_id === input.product_id &&
      it.customization_id === input.customization_id &&
      it.source_sku_code === finalSkuCode,
  );

  if (existing) {
    existing.qty += qty;
    existing.line_total = existing.qty * existing.unit_price;
    store[existing.cart_item_id] = existing;
    await writeStore(store);
    return existing;
  }

  const item: CartItemRecord = {
    cart_item_id: newCartItemId(),
    product_id: input.product_id,
    product_slug: product.slug,
    product_title: product.title,
    cover_url: product.cover_url,
    qty,
    unit_price,
    line_total: unit_price * qty,
    selected_specs: normalizedSelections,
    source_sku_code: finalSkuCode,
    customization_id: input.customization_id,
    added_from: input.added_from,
    created_at: new Date().toISOString(),
  };
  store[item.cart_item_id] = item;
  await writeStore(store);
  return item;
}

export async function removeCartItem(cartItemId: string): Promise<boolean> {
  const store = await readStore();
  if (!store[cartItemId]) return false;
  delete store[cartItemId];
  await writeStore(store);
  return true;
}

export async function updateCartItemQty(
  cartItemId: string,
  qty: number,
): Promise<CartItemRecord | undefined> {
  const store = await readStore();
  const item = store[cartItemId];
  if (!item) return undefined;
  item.qty = Math.max(1, Math.floor(qty));
  item.line_total = item.qty * item.unit_price;
  store[item.cart_item_id] = item;
  await writeStore(store);
  return item;
}

export async function clearCart() {
  await writeStore({});
}
