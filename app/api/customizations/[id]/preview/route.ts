import { NextResponse } from "next/server";
import { getCustomization } from "@/lib/customizations-store";
import { newRequestId } from "@/lib/request-id";

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

  return NextResponse.json(
    {
      customization_id: customization.customization_id,
      product_id: customization.product_id,
      template_id: customization.template_id,
      preview_url: customization.preview_url,
      dpi_check_result: customization.dpi_check_result,
      warnings: customization.warnings,
      text_layers: customization.text_layers,
      color_layers: customization.color_layers,
      user_images_count: customization.user_images.length,
      created_at: customization.created_at,
      requestId,
    },
    { headers: { "X-Request-Id": requestId } },
  );
}
