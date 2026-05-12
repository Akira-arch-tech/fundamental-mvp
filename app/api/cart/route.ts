import { NextResponse } from "next/server";
import { addCartItem, clearCart, listCartItems } from "@/lib/cart-store";
import { newRequestId } from "@/lib/request-id";
import type { CartSpecSelection } from "@/lib/types";

interface AddCartBody {
  product_id?: string;
  qty?: number;
  selected_specs?: CartSpecSelection[];
  source_sku_code?: string;
  customization_id?: string;
  added_from?: "product" | "customize";
}

export async function GET() {
  const requestId = newRequestId();
  const items = await listCartItems();
  return NextResponse.json(
    {
      items,
      total_items: items.reduce((sum, it) => sum + it.qty, 0),
      total_amount: items.reduce((sum, it) => sum + it.line_total, 0),
      requestId,
    },
    { headers: { "X-Request-Id": requestId } },
  );
}

export async function POST(req: Request) {
  const requestId = newRequestId();
  try {
    const body = (await req.json()) as AddCartBody;
    if (!body.product_id) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "product_id is required", requestId },
        { status: 422, headers: { "X-Request-Id": requestId } },
      );
    }
    const item = await addCartItem({
      product_id: body.product_id,
      qty: Number(body.qty ?? 1),
      selected_specs: body.selected_specs ?? [],
      source_sku_code: body.source_sku_code,
      customization_id: body.customization_id,
      added_from: body.added_from ?? "product",
    });
    return NextResponse.json({ item, requestId }, { headers: { "X-Request-Id": requestId } });
  } catch (error) {
    const isValidationError =
      error instanceof Error && error.name === "CartValidationError";
    return NextResponse.json(
      {
        code: isValidationError ? "VALIDATION_ERROR" : "BAD_REQUEST",
        message: error instanceof Error ? error.message : "invalid request",
        requestId,
      },
      {
        status: isValidationError ? 422 : 400,
        headers: { "X-Request-Id": requestId },
      },
    );
  }
}

export async function DELETE() {
  const requestId = newRequestId();
  await clearCart();
  return NextResponse.json({ ok: true, requestId }, { headers: { "X-Request-Id": requestId } });
}
