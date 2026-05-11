import { NextResponse } from "next/server";
import { newRequestId } from "@/lib/request-id";
import { getAuthedUser } from "@/lib/server-auth";
import { getGeneration } from "@/lib/image-generation/generation-store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = newRequestId();
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "login required", requestId },
      { status: 401, headers: { "X-Request-Id": requestId } },
    );
  }
  const { id } = await params;
  const generationId = decodeURIComponent(id).trim();
  if (!generationId) {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: "missing id", requestId },
      { status: 400, headers: { "X-Request-Id": requestId } },
    );
  }
  const generation = await getGeneration(generationId);
  if (!generation) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "generation not found", requestId },
      { status: 404, headers: { "X-Request-Id": requestId } },
    );
  }
  return NextResponse.json({ generation, requestId }, { headers: { "X-Request-Id": requestId } });
}
