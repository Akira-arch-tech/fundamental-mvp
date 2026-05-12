import Stripe from "stripe";
import { products } from "@/data/seed";
import { STORE_BASE_PATH } from "@/lib/storefront-constants";
import { getCustomization } from "@/lib/customizations-store";
import { getOrder, saveOrder } from "@/lib/orders-store";
import {
  getOrderIdForStripeSession,
  linkStripeSessionToOrder,
} from "@/lib/stripe-session-map";
import type { OrderRecord } from "@/lib/types";

export function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(key);
}

export function computeOrderTotalJpy(
  productId: string,
  qty: number,
): { unitPrice: number; shippingFee: number; total: number } {
  const product = products.find((p) => p.product_id === productId);
  const unitPrice = product?.price_from ?? 0;
  const shippingFee = qty >= 5 ? 0 : 500;
  return { unitPrice, shippingFee, total: unitPrice * qty + shippingFee };
}

/** Stripe metadata 键名压缩（单值 ≤500 字符） */
const M = {
  customization_id: "c",
  product_id: "p",
  qty: "q",
  recipient_name: "rn",
  recipient_phone: "rp",
  shipping_address: "sa",
  note: "n",
  copy: "copy",
} as const;

export function buildCheckoutMetadata(input: {
  customization_id: string;
  product_id: string;
  qty: number;
  recipient_name: string;
  recipient_phone: string;
  shipping_address: string;
  note?: string;
}): Record<string, string> {
  return {
    [M.customization_id]: input.customization_id,
    [M.product_id]: input.product_id,
    [M.qty]: String(input.qty),
    [M.recipient_name]: input.recipient_name.slice(0, 480),
    [M.recipient_phone]: input.recipient_phone.slice(0, 120),
    [M.shipping_address]: input.shipping_address.slice(0, 480),
    [M.note]: (input.note ?? "").slice(0, 480),
    [M.copy]: "1",
  };
}

function parseCheckoutMetadata(meta: Stripe.Metadata | undefined | null): {
  customization_id: string;
  product_id: string;
  qty: number;
  recipient_name: string;
  recipient_phone: string;
  shipping_address: string;
  note?: string;
} | null {
  if (!meta?.[M.customization_id] || !meta[M.product_id]) return null;
  if (meta[M.copy] !== "1") return null;
  const qty = Number(meta[M.qty]);
  if (!Number.isInteger(qty) || qty < 1) return null;
  return {
    customization_id: meta[M.customization_id] as string,
    product_id: meta[M.product_id] as string,
    qty,
    recipient_name: (meta[M.recipient_name] as string) ?? "",
    recipient_phone: (meta[M.recipient_phone] as string) ?? "",
    shipping_address: (meta[M.shipping_address] as string) ?? "",
    note: meta[M.note] ? String(meta[M.note]) : undefined,
  };
}

export async function createStripeCheckoutSession(params: {
  origin: string;
  customization_id: string;
  product_id: string;
  qty: number;
  recipient_name: string;
  recipient_phone: string;
  shipping_address: string;
  note?: string;
  product_title: string;
}): Promise<{ url: string | null; sessionId: string }> {
  const stripe = getStripeClient();
  const customization = await getCustomization(params.customization_id);
  if (!customization) {
    throw new Error("customization not found");
  }
  if (customization.product_id !== params.product_id) {
    throw new Error("product mismatch");
  }

  const { unitPrice, shippingFee, total } = computeOrderTotalJpy(params.product_id, params.qty);

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      price_data: {
        currency: "jpy",
        product_data: {
          name: `${params.product_title} × ${params.qty}`,
        },
        unit_amount: unitPrice * params.qty,
      },
      quantity: 1,
    },
  ];
  if (shippingFee > 0) {
    lineItems.push({
      price_data: {
        currency: "jpy",
        product_data: { name: "送料" },
        unit_amount: shippingFee,
      },
      quantity: 1,
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    success_url: `${params.origin}${STORE_BASE_PATH}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${params.origin}${STORE_BASE_PATH}/checkout?customization_id=${encodeURIComponent(params.customization_id)}`,
    metadata: buildCheckoutMetadata({
      customization_id: params.customization_id,
      product_id: params.product_id,
      qty: params.qty,
      recipient_name: params.recipient_name,
      recipient_phone: params.recipient_phone,
      shipping_address: params.shipping_address,
      note: params.note,
    }),
    payment_method_types: ["card"],
  });

  if (session.amount_total != null && session.amount_total !== total) {
    throw new Error("session amount mismatch (internal)");
  }

  return { url: session.url, sessionId: session.id };
}

export type FulfillResult =
  | { ok: true; order: OrderRecord; requestId: string }
  | { ok: false; code: string; message: string; requestId: string; httpStatus: number };

export async function fulfillPaidCheckoutSession(
  sessionId: string,
  requestId: string,
): Promise<FulfillResult> {
  const existingOrderId = await getOrderIdForStripeSession(sessionId);
  if (existingOrderId) {
    const order = await getOrder(existingOrderId);
    if (order) {
      return { ok: true, order, requestId };
    }
  }

  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== "paid") {
    return {
      ok: false,
      code: "PAYMENT_INCOMPLETE",
      message: "決済が完了していません。Stripe の画面で支払いを完了してください。",
      requestId,
      httpStatus: 402,
    };
  }

  const parsed = parseCheckoutMetadata(session.metadata);
  if (!parsed) {
    return {
      ok: false,
      code: "BAD_METADATA",
      message: "Checkout メタデータが無効です",
      requestId,
      httpStatus: 400,
    };
  }

  const { total } = computeOrderTotalJpy(parsed.product_id, parsed.qty);
  if (session.amount_total !== total) {
    return {
      ok: false,
      code: "AMOUNT_MISMATCH",
      message: "支払い金額が注文計算と一致しません",
      requestId,
      httpStatus: 400,
    };
  }

  const customization = await getCustomization(parsed.customization_id);
  if (!customization) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "customization not found",
      requestId,
      httpStatus: 404,
    };
  }

  const doubleCheck = await getOrderIdForStripeSession(sessionId);
  if (doubleCheck) {
    const order = await getOrder(doubleCheck);
    if (order) {
      return { ok: true, order, requestId };
    }
  }

  const order = await saveOrder({
    customization_id: parsed.customization_id,
    product_id: parsed.product_id,
    qty: parsed.qty,
    recipient_name: parsed.recipient_name,
    recipient_phone: parsed.recipient_phone,
    shipping_address: parsed.shipping_address,
    note: parsed.note,
    payment_method: "stripe",
    copyright_acknowledged: true,
  });

  await linkStripeSessionToOrder(sessionId, order.order_id);

  return { ok: true, order, requestId };
}
