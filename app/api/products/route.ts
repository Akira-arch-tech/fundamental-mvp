import { NextResponse } from "next/server";
import { listProductsMerged } from "@/lib/catalog";
import { parseProductListParams } from "@/lib/query-parse";
import { newRequestId } from "@/lib/request-id";

export async function GET(req: Request) {
  const requestId = newRequestId();
  const url = new URL(req.url);
  const sp = Object.fromEntries(url.searchParams.entries());
  const parsed = parseProductListParams(sp);
  const { items, total, page, page_size } = await listProductsMerged(parsed);
  return NextResponse.json(
    { items, total, page, page_size, requestId },
    { headers: { "X-Request-Id": requestId } },
  );
}
