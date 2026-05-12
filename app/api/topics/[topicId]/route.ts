import { NextResponse } from "next/server";
import { getTopic } from "@/lib/catalog";
import { newRequestId } from "@/lib/request-id";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ topicId: string }> },
) {
  const requestId = newRequestId();
  const { topicId } = await params;
  const topic = getTopic(topicId);
  if (!topic) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "topic not found", requestId },
      { status: 404, headers: { "X-Request-Id": requestId } },
    );
  }
  return NextResponse.json(
    { ...topic, requestId },
    { headers: { "X-Request-Id": requestId } },
  );
}
