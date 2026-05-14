import { NextRequest, NextResponse } from "next/server";
import { upscaleImage } from "@/lib/design-tools/upscale-client";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(req: NextRequest) {
  const apiKey = process.env.FAL_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "FAL_KEY not configured" }, { status: 500 });
  }

  let imageUrl: string;
  try {
    const body = await req.json() as { image_url?: string };
    imageUrl = body.image_url ?? "";
    if (!imageUrl) throw new Error("image_url required");
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }

  try {
    const result = await upscaleImage(imageUrl, apiKey);
    return NextResponse.json({ image_url: result.imageUrl });
  } catch (e) {
    console.error("[upscale]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
