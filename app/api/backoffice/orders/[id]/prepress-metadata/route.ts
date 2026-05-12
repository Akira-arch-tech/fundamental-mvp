import { NextResponse } from "next/server";
import { products } from "@/data/seed";
import { getCustomization } from "@/lib/customizations-store";
import { getOrder } from "@/lib/orders-store";
import { buildPrepressMetadataBundle } from "@/lib/prepress-metadata";
import { newRequestId } from "@/lib/request-id";
import { getStoreSettings } from "@/lib/store-settings";
import { getAuthedUser } from "@/lib/server-auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = newRequestId();
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "login required", requestId },
      { status: 401, headers: { "X-Request-Id": requestId } },
    );
  }

  const { id: orderId } = await params;
  const order = await getOrder(orderId);
  if (!order) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "order not found", requestId },
      { status: 404, headers: { "X-Request-Id": requestId } },
    );
  }

  const customization = await getCustomization(order.customization_id);
  if (!customization) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "customization not found", requestId },
      { status: 404, headers: { "X-Request-Id": requestId } },
    );
  }

  const product = products.find((p) => p.product_id === order.product_id);
  const store = await getStoreSettings();
  const bundle = buildPrepressMetadataBundle({
    order,
    product,
    customization,
    display_currency: store.currency,
    generated_at: new Date().toISOString(),
  });

  const filename = `prepress-${order.order_no.replace(/[^\w-]+/g, "_")}.json`;
  return NextResponse.json(
    { ...bundle, requestId },
    {
      headers: {
        "X-Request-Id": requestId,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    },
  );
}
