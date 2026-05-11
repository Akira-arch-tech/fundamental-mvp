import { NextResponse } from "next/server";
import { getOrder } from "@/lib/orders-store";
import {
  createExceptionRequest,
  listExceptionRequestsByOrder,
} from "@/lib/exception-requests-store";
import { newRequestId } from "@/lib/request-id";
import type { ExceptionRequestRecord } from "@/lib/types";

type ExceptionInput = {
  type: ExceptionRequestRecord["type"];
  reason: string;
};

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
  const items = await listExceptionRequestsByOrder(id);
  return NextResponse.json({ items, requestId }, { headers: { "X-Request-Id": requestId } });
}

export async function POST(
  req: Request,
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

  try {
    const body = (await req.json()) as Partial<ExceptionInput>;
    if (!body.type || !body.reason) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "type and reason are required", requestId },
        { status: 422, headers: { "X-Request-Id": requestId } },
      );
    }
    const allowed: ExceptionRequestRecord["type"][] = ["redesign", "reship", "refund"];
    if (!allowed.includes(body.type)) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "invalid exception type", requestId },
        { status: 422, headers: { "X-Request-Id": requestId } },
      );
    }

    const item = await createExceptionRequest(id, body.type, body.reason);
    return NextResponse.json({ ...item, requestId }, { headers: { "X-Request-Id": requestId } });
  } catch {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: "invalid json body", requestId },
      { status: 400, headers: { "X-Request-Id": requestId } },
    );
  }
}
