import { NextResponse } from "next/server";
import { getOrder } from "@/lib/orders-store";
import { createSupportTicket } from "@/lib/support-tickets-store";
import { newRequestId } from "@/lib/request-id";

type AskInput = {
  order_id: string;
  question: string;
};

export async function POST(req: Request) {
  const requestId = newRequestId();
  try {
    const body = (await req.json()) as Partial<AskInput>;
    if (!body.order_id || !body.question) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "order_id and question are required", requestId },
        { status: 422, headers: { "X-Request-Id": requestId } },
      );
    }

    const order = await getOrder(body.order_id);
    if (!order) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "order not found", requestId },
        { status: 404, headers: { "X-Request-Id": requestId } },
      );
    }

    const ticket = await createSupportTicket(body.order_id, body.question);
    return NextResponse.json(
      {
        ...ticket,
        requestId,
      },
      { headers: { "X-Request-Id": requestId } },
    );
  } catch {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: "invalid json body", requestId },
      { status: 400, headers: { "X-Request-Id": requestId } },
    );
  }
}
