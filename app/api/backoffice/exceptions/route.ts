import { NextResponse } from "next/server";
import { listExceptionsBackoffice } from "@/lib/exception-requests-store";
import { newRequestId } from "@/lib/request-id";
import { getAuthedUser } from "@/lib/server-auth";

function parseIntParam(v: string | null, fallback: number, min: number, max: number) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min) return fallback;
  return Math.min(n, max);
}

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
  const page = parseIntParam(url.searchParams.get("page"), 1, 1, 10_000);
  const pageSize = parseIntParam(url.searchParams.get("page_size"), 20, 1, 100);
  const pendingQueue = url.searchParams.get("pending_queue") === "1";
  const status = url.searchParams.get("status") ?? undefined;
  const type = url.searchParams.get("type") ?? undefined;
  const orderNo = url.searchParams.get("order_no") ?? undefined;

  const { items, total } = await listExceptionsBackoffice({
    page,
    pageSize,
    pendingQueue: pendingQueue || undefined,
    status: pendingQueue ? undefined : status?.trim() || undefined,
    type: type?.trim() || undefined,
    orderNo: orderNo?.trim() || undefined,
  });

  return NextResponse.json(
    {
      items,
      page,
      page_size: pageSize,
      total,
      requestId,
    },
    { headers: { "X-Request-Id": requestId } },
  );
}
