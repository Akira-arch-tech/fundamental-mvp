import { NextResponse } from "next/server";
import { getOrder } from "@/lib/orders-store";
import { newRequestId } from "@/lib/request-id";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = newRequestId();
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "order not found", requestId },
      { status: 404, headers: { "X-Request-Id": requestId } },
    );
  }
  return NextResponse.json({ ...order, requestId }, { headers: { "X-Request-Id": requestId } });
}
