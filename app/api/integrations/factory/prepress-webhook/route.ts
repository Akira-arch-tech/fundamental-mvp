import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { newRequestId } from "@/lib/request-id";
import { resolveOrderRef } from "@/lib/orders-store";
import { buildPrepressBundleManifest } from "@/lib/prepress-bundle";

export const dynamic = "force-dynamic";

function safeEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (aa.length !== bb.length) return false;
  return timingSafeEqual(aa, bb);
}

/**
 * 工厂印前 Webhook（MVP）：POST JSON body `{ order_id, event: "prepress_ready" }`，
 * Header `X-Factory-Signature: sha256=<hex>` 与 `FACTORY_WEBHOOK_SECRET` 做 HMAC。
 */
export async function POST(req: Request) {
  const requestId = newRequestId();
  const secret = process.env.FACTORY_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { code: "NOT_CONFIGURED", message: "FACTORY_WEBHOOK_SECRET not set", requestId },
      { status: 503, headers: { "X-Request-Id": requestId } },
    );
  }
  const sig = req.headers.get("x-factory-signature")?.trim() ?? "";
  const raw = await req.text();
  const expected = `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
  if (!sig || !safeEqual(sig, expected)) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "invalid signature", requestId },
      { status: 401, headers: { "X-Request-Id": requestId } },
    );
  }
  let body: { order_id?: string; event?: string };
  try {
    body = JSON.parse(raw) as { order_id?: string; event?: string };
  } catch {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: "invalid json", requestId },
      { status: 400, headers: { "X-Request-Id": requestId } },
    );
  }
  const orderId = typeof body.order_id === "string" ? body.order_id.trim() : "";
  if (!orderId) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "order_id required", requestId },
      { status: 422, headers: { "X-Request-Id": requestId } },
    );
  }
  const order = await resolveOrderRef(orderId);
  if (!order) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "order not found", requestId },
      { status: 404, headers: { "X-Request-Id": requestId } },
    );
  }
  const bundle = buildPrepressBundleManifest(order);
  return NextResponse.json(
    {
      ok: true,
      received: body.event ?? "unknown",
      bundle,
      requestId,
    },
    { headers: { "X-Request-Id": requestId } },
  );
}
