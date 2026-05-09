import { NextResponse } from "next/server";
import { appendAiArtifact, listAiArtifacts } from "@/lib/ai-artifacts-store";
import { resolveProductRef } from "@/lib/catalog";
import { appendOrderNoteLine, resolveOrderRef } from "@/lib/orders-store";
import { setProductAiCover } from "@/lib/product-ai-cover-store";
import { newRequestId } from "@/lib/request-id";
import { getAuthedUser } from "@/lib/server-auth";

/** 写入订单 note 的一行摘要（与 artifacts 表并列，便于履约侧直接看订单） */
function buildAiHandoffOrderNoteLine(input: {
  task_id: string | null;
  asset_url: string | null;
  memo: string | null;
}): string {
  const iso = new Date().toISOString();
  const task = input.task_id?.trim() || "—";
  let asset = input.asset_url?.trim() || "—";
  if (asset.length > 480) asset = `${asset.slice(0, 480)}…`;
  const memo = input.memo?.trim();
  const parts = [`[AI] ${iso}`, `task=${task}`, `asset=${asset}`];
  if (memo) parts.push(`memo=${memo}`);
  return parts.join(" | ");
}

export async function GET(req: Request) {
  const requestId = newRequestId();
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "login required", requestId },
      { status: 401, headers: { "X-Request-Id": requestId } },
    );
  }
  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 20, 1), 100);
  const items = await listAiArtifacts(limit);
  return NextResponse.json({ items, requestId }, { headers: { "X-Request-Id": requestId } });
}

export async function POST(req: Request) {
  const requestId = newRequestId();
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "login required", requestId },
      { status: 401, headers: { "X-Request-Id": requestId } },
    );
  }
  type HandoffBody = {
    task_id?: string;
    asset_url?: string;
    note?: string;
    order_ref?: string;
    /** 可选：product_id（p1）或 slug；需同时提供 https 素材 URL，写入该 SKU 列表/商详封面 */
    product_ref?: string;
  };
  let body: HandoffBody;
  try {
    body = (await req.json()) as HandoffBody;
  } catch {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: "invalid json body", requestId },
      { status: 400, headers: { "X-Request-Id": requestId } },
    );
  }

  try {
    const task_id = body.task_id?.trim();
    const asset_url = body.asset_url?.trim();
    if (!task_id && !asset_url) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "task_id or asset_url is required", requestId },
        { status: 422, headers: { "X-Request-Id": requestId } },
      );
    }

    const memo = body.note?.trim() || null;
    const taskIdOrNull = task_id || null;
    const assetUrlOrNull = asset_url || null;

    let linked_product_id: string | null = null;
    let linked_product_slug: string | null = null;
    const product_ref = body.product_ref?.trim();
    if (product_ref) {
      const prod = resolveProductRef(product_ref);
      if (!prod) {
        return NextResponse.json(
          {
            code: "PRODUCT_REF_NOT_FOUND",
            message: `未找到商品：${product_ref}（请填写 product_id 如 p1，或 slug）`,
            requestId,
          },
          { status: 422, headers: { "X-Request-Id": requestId } },
        );
      }
      if (!assetUrlOrNull) {
        return NextResponse.json(
          {
            code: "PRODUCT_COVER_REQUIRES_ASSET_URL",
            message: "关联商品时必须填写「素材 URL」（https），用作店铺列表与商详封面",
            requestId,
          },
          { status: 422, headers: { "X-Request-Id": requestId } },
        );
      }
      try {
        await setProductAiCover(prod.product_id, assetUrlOrNull);
      } catch {
        return NextResponse.json(
          {
            code: "INVALID_COVER_URL",
            message: "素材 URL 须为 http(s) 链接，才能写入商品封面",
            requestId,
          },
          { status: 422, headers: { "X-Request-Id": requestId } },
        );
      }
      linked_product_id = prod.product_id;
      linked_product_slug = prod.slug;
    }

    let linked_order_id: string | null = null;
    const order_ref = body.order_ref?.trim();
    if (order_ref) {
      const ord = await resolveOrderRef(order_ref);
      if (!ord) {
        return NextResponse.json(
          {
            code: "ORDER_REF_NOT_FOUND",
            message: `未找到订单：${order_ref}（请填写内部 order_id 或订单号 order_no）`,
            requestId,
          },
          { status: 422, headers: { "X-Request-Id": requestId } },
        );
      }
      linked_order_id = ord.order_id;
      const line = buildAiHandoffOrderNoteLine({
        task_id: taskIdOrNull,
        asset_url: assetUrlOrNull,
        memo,
      });
      const appended = await appendOrderNoteLine(linked_order_id, line);
      if (!appended.ok) {
        const message =
          appended.code === "NOTE_TOO_LONG"
            ? "订单备注总长超过上限，请先精简历史备注后再登记"
            : "订单不存在或已删除";
        return NextResponse.json(
          { code: appended.code, message, requestId },
          { status: 422, headers: { "X-Request-Id": requestId } },
        );
      }
    }

    const item = await appendAiArtifact({
      task_id: taskIdOrNull,
      asset_url: assetUrlOrNull,
      note: memo,
      linked_order_id,
      linked_product_id,
      linked_product_slug,
    });
    return NextResponse.json({ item, requestId }, { headers: { "X-Request-Id": requestId } });
  } catch {
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "登记失败，请稍后重试", requestId },
      { status: 500, headers: { "X-Request-Id": requestId } },
    );
  }
}
