import { NextResponse } from "next/server";
import { newRequestId } from "@/lib/request-id";
import { getAuthedUser } from "@/lib/server-auth";
import { buildPrepressBundleManifest } from "@/lib/prepress-bundle";
import { resolveOrderRef } from "@/lib/orders-store";

export const dynamic = "force-dynamic";

/** 印前「包」MVP：返回可机读的 bundle 清单（JSON），工厂可按 URL 拉取 metadata 与预览图 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const requestId = newRequestId();
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "login required", requestId },
      { status: 401, headers: { "X-Request-Id": requestId } },
    );
  }
  const { id } = await ctx.params;
  const order = await resolveOrderRef(decodeURIComponent(id));
  if (!order) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "order not found", requestId },
      { status: 404, headers: { "X-Request-Id": requestId } },
    );
  }
  const manifest = buildPrepressBundleManifest(order);
  return NextResponse.json({ ok: true, bundle: manifest, requestId }, { headers: { "X-Request-Id": requestId } });
}
