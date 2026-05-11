import { NextResponse } from "next/server";
import { getWorkorder } from "@/lib/workorders-store";
import { newRequestId } from "@/lib/request-id";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = newRequestId();
  const { id } = await params;
  const workorder = await getWorkorder(id);
  if (!workorder) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "workorder not found", requestId },
      { status: 404, headers: { "X-Request-Id": requestId } },
    );
  }
  return NextResponse.json(
    { ...workorder, requestId },
    { headers: { "X-Request-Id": requestId } },
  );
}
