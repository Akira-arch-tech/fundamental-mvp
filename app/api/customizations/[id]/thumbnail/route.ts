import { NextResponse } from "next/server";
import { getCustomization } from "@/lib/customizations-store";
import { newRequestId } from "@/lib/request-id";

function parseDataUrl(dataUrl: string): { mime: string; buf: Buffer } | null {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl.trim());
  if (!match) return null;
  try {
    return { mime: match[1], buf: Buffer.from(match[2], "base64") };
  } catch {
    return null;
  }
}

function fallbackSvg(customization: {
  color_layers: { role: string; value: string }[];
  text_layers: { text: string }[];
  product_id: string;
}): string {
  const bg =
    customization.color_layers.find((c) => c.role === "background")?.value ?? "#f4f4f5";
  const label =
    customization.text_layers[0]?.text?.slice(0, 40) ||
    customization.product_id.toUpperCase();
  const safeLabel = label.replace(/[<>&'"]/g, "");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
  <rect width="320" height="320" fill="${bg}"/>
  <text x="160" y="168" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" fill="#52525b">${safeLabel}</text>
</svg>`;
}

/** 结账/抽屉用：返回定制缩略图（首图 data URL 或 SVG 占位） */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = newRequestId();
  const { id } = await params;
  const customization = await getCustomization(id);

  if (!customization) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "customization not found", requestId },
      { status: 404, headers: { "X-Request-Id": requestId } },
    );
  }

  for (const img of customization.user_images) {
    const parsed = parseDataUrl(img.data_url);
    if (parsed) {
      return new NextResponse(new Uint8Array(parsed.buf), {
        headers: {
          "Content-Type": parsed.mime,
          "Cache-Control": "private, max-age=3600",
          "X-Request-Id": requestId,
        },
      });
    }
  }

  const svg = fallbackSvg(customization);
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "private, max-age=300",
      "X-Request-Id": requestId,
    },
  });
}
