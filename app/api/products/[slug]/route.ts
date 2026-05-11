import { NextResponse } from "next/server";
import { getProductBySlugMerged } from "@/lib/catalog";
import { newRequestId } from "@/lib/request-id";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const requestId = newRequestId();
  const { slug } = await params;
  const product = await getProductBySlugMerged(slug);
  if (!product) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "product not found", requestId },
      { status: 404, headers: { "X-Request-Id": requestId } },
    );
  }
  return NextResponse.json(
    { ...product, requestId },
    { headers: { "X-Request-Id": requestId } },
  );
}
