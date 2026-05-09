"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type {
  ExceptionRequestRecord,
  OperatorRole,
  SupportTicketRecord,
} from "@/lib/types";
import { operatorRoleZh } from "@/lib/backoffice-ui-labels";

type MeResponse =
  | { authenticated: false }
  | { authenticated: true; user_id: string; display_name: string; role: OperatorRole };

/** 管理后台订单运营页：中文；含客服记录、异常审批与审计 */
export function InternalOrderOperationsPanel({
  orderId,
  supportTickets,
  exceptionRequests,
}: {
  orderId: string;
  supportTickets: SupportTicketRecord[];
  exceptionRequests: ExceptionRequestRecord[];
}) {
  const router = useRouter();
  const [reviewNote, setReviewNote] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        const json = (await res.json()) as MeResponse;
        if (!cancelled) setMe(json);
      } catch {
        if (!cancelled) setMe({ authenticated: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function statusMeta(status: ExceptionRequestRecord["status"]) {
    if (status === "submitted") return { label: "已提交", cls: "bg-blue-50 text-blue-700 border-blue-200" };
    if (status === "processing") return { label: "处理中", cls: "bg-amber-50 text-amber-700 border-amber-200" };
    if (status === "approved") return { label: "已通过", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    return { label: "已拒绝", cls: "bg-red-50 text-red-700 border-red-200" };
  }

  function typeLabel(type: ExceptionRequestRecord["type"]) {
    if (type === "redesign") return "改图";
    if (type === "reship") return "补发";
    return "退款";
  }

  function roleCanTransit(role: OperatorRole, target: ExceptionRequestRecord["status"]) {
    if (target === "processing") return role === "ops" || role === "admin";
    if (target === "approved" || target === "rejected") return role === "admin";
    return false;
  }

  async function updateExceptionStatus(
    exceptionId: string,
    status: ExceptionRequestRecord["status"],
  ) {
    setError("");
    setUpdatingId(exceptionId);
    try {
      const res = await fetch(`/api/orders/${orderId}/exceptions/${exceptionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status,
          note: reviewNote.trim() || undefined,
        }),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(json.message ?? "状态更新失败");
      router.refresh();
      setReviewNote("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "状态更新失败");
    } finally {
      setUpdatingId("");
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm shadow-amber-950/5 sm:p-5">
        <h3 className="text-sm font-bold text-zinc-900">客服记录（CRM 同步用原文）</h3>
        <p className="mt-1 text-xs leading-relaxed text-zinc-600">
          以下为买家提交的问题与系统自动回复（买家端展示为日语）。
        </p>
        <div className="mt-3 space-y-2">
          {supportTickets.length === 0 ? (
            <p className="text-xs text-zinc-500">暂无记录</p>
          ) : (
            supportTickets.map((t) => (
              <div
                key={t.support_ticket_id}
                className="rounded-xl border border-amber-50/90 bg-amber-50/30 p-3 text-xs text-zinc-800"
              >
                <p className="font-medium text-zinc-900">问：{t.question}</p>
                <p className="mt-1.5 leading-relaxed text-zinc-700">答：{t.answer}</p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm shadow-amber-950/5 sm:p-5">
        <h3 className="text-sm font-bold text-zinc-900">异常申请与审批（同步 ERP 指令）</h3>
        <div className="mt-2 rounded-lg border border-amber-100 bg-amber-50/50 p-3">
          <p className="text-xs font-medium text-amber-950">操作身份（服务端会话）</p>
          {me === null ? (
            <p className="mt-1 text-xs text-zinc-500">读取登录状态…</p>
          ) : me.authenticated ? (
            <p className="mt-1 text-xs text-zinc-800">
              已登录：<span className="font-medium">{me.display_name}</span>（{operatorRoleZh(me.role)}）
            </p>
          ) : (
            <p className="mt-1 text-xs text-amber-900">
              未登录无法审批。请先
              <Link href="/b/login" className="font-medium text-orange-700 underline">
                管理后台登录
              </Link>
              。
            </p>
          )}
          <input
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder="审批备注（可选）"
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs outline-none focus:border-[#e85c22]"
          />
        </div>

        <div className="mt-3 space-y-2">
          {exceptionRequests.length === 0 ? (
            <p className="text-xs text-zinc-500">暂无异常申请</p>
          ) : (
            exceptionRequests.map((r) => (
              <div
                key={r.exception_request_id}
                className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 text-xs text-zinc-800"
              >
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  <span>{typeLabel(r.type)}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] ${statusMeta(r.status).cls}`}>
                    {statusMeta(r.status).label}
                  </span>
                </p>
                <p className="mt-1 text-zinc-600">{r.reason}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {r.status === "submitted" || r.status === "processing" ? (
                    <>
                      {r.status === "submitted" ? (
                        <button
                          type="button"
                          onClick={() => updateExceptionStatus(r.exception_request_id, "processing")}
                          disabled={
                            updatingId.length > 0 ||
                            me === null ||
                            !me.authenticated ||
                            !roleCanTransit(me.role, "processing")
                          }
                          className="rounded-full border border-zinc-300 px-2 py-1 text-[11px] hover:border-zinc-400 disabled:opacity-50"
                        >
                          {updatingId === r.exception_request_id ? "提交中…" : "标记处理中"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => updateExceptionStatus(r.exception_request_id, "approved")}
                        disabled={
                          updatingId.length > 0 ||
                          me === null ||
                          !me.authenticated ||
                          !roleCanTransit(me.role, "approved")
                        }
                        className="rounded-full border border-emerald-300 px-2 py-1 text-[11px] text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                      >
                        通过
                      </button>
                      <button
                        type="button"
                        onClick={() => updateExceptionStatus(r.exception_request_id, "rejected")}
                        disabled={
                          updatingId.length > 0 ||
                          me === null ||
                          !me.authenticated ||
                          !roleCanTransit(me.role, "rejected")
                        }
                        className="rounded-full border border-red-300 px-2 py-1 text-[11px] text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        拒绝
                      </button>
                    </>
                  ) : (
                    <span className="text-[11px] text-zinc-500">该申请已结束</span>
                  )}
                </div>
                <div className="mt-2 rounded border border-zinc-200 bg-white p-2">
                  <p className="text-[11px] font-medium text-zinc-600">审计日志</p>
                  <div className="mt-1 space-y-1">
                    {(r.audit_logs ?? []).length === 0 ? (
                      <p className="text-[11px] text-zinc-400">暂无日志</p>
                    ) : (
                      (r.audit_logs ?? []).map((log, idx) => (
                        <p key={`${log.at}-${idx}`} className="text-[11px] text-zinc-600">
                          {new Date(log.at).toLocaleString("zh-CN")} · {log.operator}（
                          {operatorRoleZh(log.operator_role)}）· {log.from_status} → {log.to_status}
                          {log.note ? ` · ${log.note}` : ""}
                        </p>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
