import { NextResponse } from "next/server";
import { addShipmentEvent } from "@/lib/shipment-events-store";
import { getOrder } from "@/lib/orders-store";
import { newRequestId } from "@/lib/request-id";
import type { ShipmentEvent } from "@/lib/types";

type ShipmentEventInput = {
  order_id: string;
  event_type: ShipmentEvent["event_type"];
  event_label: string;
  location: string;
  tracking_no?: string;
};

export async function POST(req: Request) {
  const requestId = newRequestId();
  try {
    const body = (await req.json()) as Partial<ShipmentEventInput>;
    const required = ["order_id", "event_type", "event_label", "location"] as const;
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { code: "VALIDATION_ERROR", message: `${field} is required`, requestId },
          { status: 422, headers: { "X-Request-Id": requestId } },
        );
      }
    }

    const order = await getOrder(body.order_id as string);
    if (!order) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "order not found", requestId },
        { status: 404, headers: { "X-Request-Id": requestId } },
      );
    }

    const event = await addShipmentEvent({
      order_id: body.order_id as string,
      event_type: body.event_type as ShipmentEvent["event_type"],
      event_label: body.event_label as string,
      location: body.location as string,
      tracking_no: body.tracking_no,
    });

    return NextResponse.json({ ...event, requestId }, { headers: { "X-Request-Id": requestId } });
  } catch {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: "invalid json body", requestId },
      { status: 400, headers: { "X-Request-Id": requestId } },
    );
  }
}
