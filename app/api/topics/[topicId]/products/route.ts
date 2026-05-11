import { NextResponse } from "next/server";
import { getTopic, listTopicProductsMerged } from "@/lib/catalog";
import { parseProductListParams } from "@/lib/query-parse";
import { newRequestId } from "@/lib/request-id";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ topicId: string }> },
) {
  const requestId = newRequestId();
  const { topicId } = await params;
  if (!getTopic(topicId)) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "topic not found", requestId },
      { status: 404, headers: { "X-Request-Id": requestId } },
    );
  }
  const url = new URL(req.url);
  const sp = Object.fromEntries(url.searchParams.entries());
  const parsed = parseProductListParams(sp);
  const { items, total, page, page_size } = await listTopicProductsMerged(topicId, parsed);
  return NextResponse.json(
    { items, total, page, page_size, requestId },
    { headers: { "X-Request-Id": requestId } },
  );
}
