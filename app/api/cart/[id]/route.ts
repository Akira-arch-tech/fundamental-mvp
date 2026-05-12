import { NextResponse } from "next/server";
import { removeCartItem, updateCartItemQty } from "@/lib/cart-store";
import { newRequestId } from "@/lib/request-id";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = newRequestId();
  try {
    const { id } = await params;
    const body = (await req.json()) as { qty?: number };
    const qty = Number(body.qty ?? 1);
    const item = await updateCartItemQty(id, qty);
    if (!item) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "cart item not found", requestId },
        { status: 404, headers: { "X-Request-Id": requestId } },
      );
    }
    return NextResponse.json({ item, requestId }, { headers: { "X-Request-Id": requestId } });
  } catch {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: "invalid request", requestId },
      { status: 400, headers: { "X-Request-Id": requestId } },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = newRequestId();
  const { id } = await params;
  const ok = await removeCartItem(id);
  if (!ok) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "cart item not found", requestId },
      { status: 404, headers: { "X-Request-Id": requestId } },
    );
  }
  return NextResponse.json({ ok: true, requestId }, { headers: { "X-Request-Id": requestId } });
}
