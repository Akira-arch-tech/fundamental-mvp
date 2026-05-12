import { after, NextResponse } from "next/server";
import { enqueueIntegrationJob } from "@/lib/integration/jobs-store";
import { runIntegrationWorker } from "@/lib/integration/worker";
import { getOrder } from "@/lib/orders-store";
import {
  getExceptionRequest,
  updateExceptionRequestStatus,
} from "@/lib/exception-requests-store";
import { newRequestId } from "@/lib/request-id";
import { getAuthedUser } from "@/lib/server-auth";
import type { ExceptionRequestRecord, OperatorRole } from "@/lib/types";

type UpdateInput = {
  status: ExceptionRequestRecord["status"];
  /** 已废弃：审计以登录会话为准，body 中的 operator / operator_role 会被忽略 */
  operator?: string;
  operator_role?: OperatorRole;
  note?: string;
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; exceptionId: string }> },
) {
  const requestId = newRequestId();
  const { id, exceptionId } = await params;
  const order = await getOrder(id);
  if (!order) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "order not found", requestId },
      { status: 404, headers: { "X-Request-Id": requestId } },
    );
  }

  const item = await getExceptionRequest(exceptionId);
  if (!item || item.order_id !== id) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "exception request not found", requestId },
      { status: 404, headers: { "X-Request-Id": requestId } },
    );
  }

  try {
    const body = (await req.json()) as Partial<UpdateInput>;
    const allowed: ExceptionRequestRecord["status"][] = [
      "processing",
      "approved",
      "rejected",
    ];
    if (!body.status || !allowed.includes(body.status)) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "invalid target status", requestId },
        { status: 422, headers: { "X-Request-Id": requestId } },
      );
    }

    const session = await getAuthedUser();
    if (!session) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "login required", requestId },
        { status: 401, headers: { "X-Request-Id": requestId } },
      );
    }

    const operatorRole = session.role;
    const operatorName = session.display_name;
    const allowedRoles: Record<ExceptionRequestRecord["status"], OperatorRole[]> = {
      submitted: [],
      processing: ["ops", "admin"],
      approved: ["admin"],
      rejected: ["admin"],
    };
    if (!allowedRoles[body.status].includes(operatorRole)) {
      return NextResponse.json(
        {
          code: "FORBIDDEN",
          message: `role ${operatorRole} cannot set status ${body.status}`,
          requestId,
        },
        { status: 403, headers: { "X-Request-Id": requestId } },
      );
    }

    const updated = await updateExceptionRequestStatus(
      exceptionId,
      body.status,
      operatorName,
      operatorRole,
      body.note,
    );
    if (!updated) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "exception request not found", requestId },
        { status: 404, headers: { "X-Request-Id": requestId } },
      );
    }

    const noChange = updated.status !== body.status;
    if (noChange) {
      return NextResponse.json(
        {
          code: "INVALID_STATE_TRANSITION",
          message: `cannot transit from ${item.status} to ${body.status}`,
          requestId,
        },
        { status: 409, headers: { "X-Request-Id": requestId } },
      );
    }

    after(async () => {
      await enqueueIntegrationJob({
        target_system: "crm",
        event_type: "crm.exception_updated",
        payload: {
          order_id: order.order_id,
          order_no: order.order_no,
          exception_request_id: exceptionId,
          status: body.status,
          operator: operatorName,
          note: body.note,
        },
        idempotency_key: `crm:exc:${exceptionId}:${body.status}`,
        request_id: requestId,
      });
      await enqueueIntegrationJob({
        target_system: "erp",
        event_type: "erp.exception_instruction",
        payload: {
          order_id: order.order_id,
          order_no: order.order_no,
          exception_request_id: exceptionId,
          exception_type: item.type,
          decision: body.status,
        },
        idempotency_key: `erp:excinst:${exceptionId}:${body.status}`,
        request_id: requestId,
      });
      await runIntegrationWorker(10);
    });

    return NextResponse.json(
      { ...updated, requestId },
      { headers: { "X-Request-Id": requestId } },
    );
  } catch {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: "invalid json body", requestId },
      { status: 400, headers: { "X-Request-Id": requestId } },
    );
  }
}
