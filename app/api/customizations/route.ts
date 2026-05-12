import { NextResponse } from "next/server";
import { products } from "@/data/seed";
import { saveCustomization } from "@/lib/customizations-store";
import { newRequestId } from "@/lib/request-id";
import type { CustomizationCreateInput } from "@/lib/types";

export async function POST(req: Request) {
  const requestId = newRequestId();
  try {
    const body = (await req.json()) as Partial<CustomizationCreateInput>;

    if (!body.product_id) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "product_id is required", requestId },
        { status: 422, headers: { "X-Request-Id": requestId } },
      );
    }
    const product = products.find((p) => p.product_id === body.product_id);
    if (!product) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "product not found", requestId },
        { status: 404, headers: { "X-Request-Id": requestId } },
      );
    }

    const payload: CustomizationCreateInput = {
      product_id: body.product_id,
      template_id: body.template_id ?? product.design_template_id,
      text_layers: body.text_layers ?? [],
      color_layers: body.color_layers ?? [],
      user_images: body.user_images ?? [],
      transform_matrix: body.transform_matrix ?? [1, 0, 0, 1, 0, 0],
      estimated_dpi: body.estimated_dpi ?? 180,
    };

    const created = await saveCustomization(payload);

    return NextResponse.json(
      {
        customization_id: created.customization_id,
        product_id: created.product_id,
        template_id: created.template_id,
        preview_url: created.preview_url,
        dpi_check_result: created.dpi_check_result,
        warnings: created.warnings,
        requestId,
      },
      { headers: { "X-Request-Id": requestId } },
    );
  } catch {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: "invalid json body", requestId },
      { status: 400, headers: { "X-Request-Id": requestId } },
    );
  }
}
