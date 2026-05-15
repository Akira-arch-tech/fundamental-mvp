import { NextRequest, NextResponse } from "next/server";
import { generateSticker } from "@/lib/design-tools/sticker-gen";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const apiKey = process.env.FAL_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "FAL_KEY not configured" }, { status: 500 });
  }

  let keyword: string;
  try {
    const body = await req.json() as { keyword?: string };
    keyword = body.keyword?.trim() ?? "";
    if (!keyword) throw new Error("keyword required");
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }

  try {
    const result = await generateSticker(keyword, apiKey);
    return NextResponse.json({ image_url: result.imageUrl });
  } catch (e) {
    console.error("[sticker]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
