import { NextResponse } from "next/server";
import { listCrmTimeline } from "@/lib/integration/crm-timeline-store";
import { newRequestId } from "@/lib/request-id";
import { getAuthedUser } from "@/lib/server-auth";

export async function GET(req: Request) {
  const requestId = newRequestId();
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "login required", requestId },
      { status: 401, headers: { "X-Request-Id": requestId } },
    );
  }
  const url = new URL(req.url);
  const orderNo = url.searchParams.get("order_no") ?? undefined;
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 50));
  const items = await listCrmTimeline({
    order_no: orderNo ?? undefined,
    limit: Number.isFinite(limit) ? limit : 50,
  });
  return NextResponse.json({ items, requestId }, { headers: { "X-Request-Id": requestId } });
}
