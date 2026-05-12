import { NextResponse } from "next/server";
import { listAllExceptionRequests } from "@/lib/exception-requests-store";
import { newRequestId } from "@/lib/request-id";
import { getAuthedUser } from "@/lib/server-auth";

function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET() {
  const requestId = newRequestId();
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "login required", requestId },
      { status: 401, headers: { "X-Request-Id": requestId } },
    );
  }
  if (user.role !== "admin") {
    return NextResponse.json(
      { code: "FORBIDDEN", message: "admin only", requestId },
      { status: 403, headers: { "X-Request-Id": requestId } },
    );
  }

  const exceptions = await listAllExceptionRequests();
  const header = [
    "exception_request_id",
    "order_id",
    "exception_type",
    "exception_status",
    "audit_at",
    "operator",
    "operator_role",
    "action",
    "from_status",
    "to_status",
    "note",
  ];
  const lines = [header.join(",")];

  for (const ex of exceptions) {
    for (const log of ex.audit_logs ?? []) {
      lines.push(
        [
          escapeCsvCell(ex.exception_request_id),
          escapeCsvCell(ex.order_id),
          escapeCsvCell(ex.type),
          escapeCsvCell(ex.status),
          escapeCsvCell(log.at),
          escapeCsvCell(log.operator),
          escapeCsvCell(log.operator_role),
          escapeCsvCell(log.action),
          escapeCsvCell(log.from_status),
          escapeCsvCell(log.to_status),
          escapeCsvCell(log.note ?? ""),
        ].join(","),
      );
    }
  }

  const csv = `\uFEFF${lines.join("\n")}`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="exception-audit-${new Date().toISOString().slice(0, 10)}.csv"`,
      "X-Request-Id": requestId,
    },
  });
}
