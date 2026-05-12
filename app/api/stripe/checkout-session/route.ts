import { NextResponse } from "next/server";
import { products } from "@/data/seed";
import { createStripeCheckoutSession } from "@/lib/stripe-fulfillment";
import { getRequestOrigin } from "@/lib/request-origin";
import { newRequestId } from "@/lib/request-id";
import { isStripeConfigured } from "@/lib/stripe-env";

export async function POST(req: Request) {
  const requestId = newRequestId();
  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        code: "NOT_CONFIGURED",
        message:
          "STRIPE_SECRET_KEY が未設定です。.env にテストキーを設定するか、デモ決済をご利用ください（PRD §8.5）。",
        requestId,
      },
      { status: 503, headers: { "X-Request-Id": requestId } },
    );
  }

  try {
    const body = (await req.json()) as {
      customization_id?: string;
      product_id?: string;
      qty?: number;
      recipient_name?: string;
      recipient_phone?: string;
      shipping_address?: string;
      note?: string;
      copyright_acknowledged?: boolean;
    };

    const required = [
      "customization_id",
      "product_id",
      "qty",
      "recipient_name",
      "recipient_phone",
      "shipping_address",
    ] as const;
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { code: "VALIDATION_ERROR", message: `${field} is required`, requestId },
          { status: 422, headers: { "X-Request-Id": requestId } },
        );
      }
    }

    const qty = Number(body.qty);
    if (!Number.isInteger(qty) || qty < 1) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "qty must be integer >= 1", requestId },
        { status: 422, headers: { "X-Request-Id": requestId } },
      );
    }

    if (body.copyright_acknowledged !== true) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "copyright_acknowledged must be true (PRD §8.1)",
          requestId,
        },
        { status: 422, headers: { "X-Request-Id": requestId } },
      );
    }

    const product = products.find((p) => p.product_id === body.product_id);
    if (!product) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "product not found", requestId },
        { status: 404, headers: { "X-Request-Id": requestId } },
      );
    }

    const origin = getRequestOrigin(req);
    const { url, sessionId } = await createStripeCheckoutSession({
      origin,
      customization_id: body.customization_id as string,
      product_id: body.product_id as string,
      qty,
      recipient_name: body.recipient_name as string,
      recipient_phone: body.recipient_phone as string,
      shipping_address: body.shipping_address as string,
      note: body.note,
      product_title: product.title,
    });

    return NextResponse.json(
      { url, session_id: sessionId, requestId },
      { headers: { "X-Request-Id": requestId } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "checkout session failed";
    return NextResponse.json(
      { code: "STRIPE_ERROR", message: msg, requestId },
      { status: 400, headers: { "X-Request-Id": requestId } },
    );
  }
}
