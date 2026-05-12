import { NextResponse } from "next/server";
import { getOrder } from "@/lib/orders-store";
import { newRequestId } from "@/lib/request-id";
import { getAuthedUser } from "@/lib/server-auth";
import { orderStatusZh } from "@/lib/backoffice-ui-labels";

const MAX_IDS = 100;

function csvCell(v: string): string {
  if (/[",\r\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

/** 按订单 ID 列表导出 CSV（需登录；用于运营批量复制/对账） */
export async function POST(req: Request) {
  const requestId = newRequestId();
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "login required", requestId },
      { status: 401, headers: { "X-Request-Id": requestId } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: "invalid JSON", requestId },
      { status: 400, headers: { "X-Request-Id": requestId } },
    );
  }

  const rawIds =
    body &&
    typeof body === "object" &&
    "order_ids" in body &&
    Array.isArray((body as { order_ids: unknown }).order_ids)
      ? ((body as { order_ids: unknown[] }).order_ids as unknown[])
      : null;

  if (!rawIds?.length) {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: "order_ids required", requestId },
      { status: 400, headers: { "X-Request-Id": requestId } },
    );
  }

  const orderIds = rawIds
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim())
    .slice(0, MAX_IDS);

  if (!orderIds.length) {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: "no valid order_ids", requestId },
      { status: 400, headers: { "X-Request-Id": requestId } },
    );
  }

  const rows = await Promise.all(orderIds.map((id) => getOrder(id)));
  const header = ["order_id", "order_no", "status", "status_zh", "recipient_name", "total_amount", "created_at"];
  const lines = [header.join(",")];
  for (let i = 0; i < orderIds.length; i++) {
    const o = rows[i];
    if (!o) {
      lines.push(
        [orderIds[i], "", "NOT_FOUND", "未找到", "", "", ""].map(csvCell).join(","),
      );
      continue;
    }
    lines.push(
      [
        o.order_id,
        o.order_no,
        o.status,
        orderStatusZh(o.status),
        o.recipient_name,
        String(o.total_amount),
        o.created_at,
      ]
        .map((c) => csvCell(String(c)))
        .join(","),
    );
  }

  const csv = "\uFEFF" + lines.join("\r\n");
  const filename = `orders-export-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Request-Id": requestId,
    },
  });
}
