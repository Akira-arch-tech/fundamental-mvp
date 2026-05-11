import { NextResponse } from "next/server";
import { normalizeCreatedRangeIso } from "@/lib/backoffice-date-range";
import { listOrdersBackoffice } from "@/lib/orders-store";
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
  const status = url.searchParams.get("status") ?? undefined;
  const keyword = url.searchParams.get("keyword") ?? undefined;
  const createdFromRaw = url.searchParams.get("created_from") ?? undefined;
  const createdToRaw = url.searchParams.get("created_to") ?? undefined;
  const { createdFrom, createdTo } = normalizeCreatedRangeIso(
    createdFromRaw?.trim() || undefined,
    createdToRaw?.trim() || undefined,
  );

  const { items, total } = await listOrdersBackoffice({
    page,
    pageSize,
    status: status?.trim() || undefined,
    keyword: keyword?.trim() || undefined,
    createdFrom,
    createdTo,
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
