"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ExceptionRequestRecord, SupportTicketRecord } from "@/lib/types";

function exceptionTypeLabelJp(type: ExceptionRequestRecord["type"]): string {
  if (type === "redesign") return "デザイン修正の依頼";
  if (type === "reship") return "再発送の依頼";
  return "返金の依頼";
}

function exceptionStatusLabelJp(status: ExceptionRequestRecord["status"]): string {
  if (status === "submitted") return "受付済み（審査待ち）";
  if (status === "processing") return "対応中";
  if (status === "approved") return "承認済み";
  return "お見送り";
}

/** 买家订单页专用：日语；不含审批操作（审批在管理后台） */
export function CustomerOrderSupportPanel({
  orderId,
  supportTickets,
  exceptionRequests,
}: {
  orderId: string;
  supportTickets: SupportTicketRecord[];
  exceptionRequests: ExceptionRequestRecord[];
}) {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [exceptionType, setExceptionType] = useState<ExceptionRequestRecord["type"]>("redesign");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState<"support" | "exception" | "">("");
  const [error, setError] = useState("");

  async function submitSupport() {
    if (!question.trim()) return;
    setError("");
    setLoading("support");
    try {
      const res = await fetch("/api/support/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, question: question.trim() }),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(json.message ?? "送信に失敗しました");
      setQuestion("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "送信に失敗しました");
    } finally {
      setLoading("");
    }
  }

  async function submitException() {
    if (!reason.trim()) return;
    setError("");
    setLoading("exception");
    try {
      const res = await fetch(`/api/orders/${orderId}/exceptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: exceptionType, reason: reason.trim() }),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(json.message ?? "申請に失敗しました");
      setReason("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "申請に失敗しました");
    } finally {
      setLoading("");
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-zinc-800">お問い合わせ</h3>
        <p className="mt-1 text-xs text-zinc-500">
          発送時期・デザイン変更など、まずはこちらからご連絡ください。自動返信のあと、担当より順次ご案内します。
        </p>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
          placeholder="例：いつ頃発送されますか？ 画像の差し替えは可能ですか？"
          className="mt-3 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-[#e85c22]"
        />
        <button
          type="button"
          onClick={submitSupport}
          disabled={loading.length > 0}
          className="mt-2 inline-flex h-9 items-center justify-center rounded-full bg-[#e85c22] px-4 text-xs font-semibold text-white hover:bg-[#d14f1b] disabled:opacity-60"
        >
          {loading === "support" ? "送信中…" : "送信する"}
        </button>
        <div className="mt-3 space-y-2">
          {supportTickets.length === 0 ? (
            <p className="text-xs text-zinc-500">まだ履歴がありません</p>
          ) : (
            supportTickets.map((t) => (
              <div key={t.support_ticket_id} className="rounded-lg bg-zinc-50 p-2 text-xs text-zinc-700">
                <p className="font-medium">Q：{t.question}</p>
                <p className="mt-1 text-zinc-600">A：{t.answer}</p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-zinc-800">特別対応のお申し出</h3>
        <p className="mt-1 text-xs text-zinc-500">
          デザインのやり直し・未着時の再送・返金など、正式なお申し出はこちらから受け付けます。審査は運営側の管理画面で行います。
        </p>
        <div className="mt-3 grid gap-2">
          <select
            value={exceptionType}
            onChange={(e) => setExceptionType(e.target.value as ExceptionRequestRecord["type"])}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-[#e85c22]"
          >
            <option value="redesign">{exceptionTypeLabelJp("redesign")}</option>
            <option value="reship">{exceptionTypeLabelJp("reship")}</option>
            <option value="refund">{exceptionTypeLabelJp("refund")}</option>
          </select>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="内容とご希望を具体的にご記入ください"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-[#e85c22]"
          />
          <button
            type="button"
            onClick={submitException}
            disabled={loading.length > 0}
            className="inline-flex h-9 items-center justify-center rounded-full border border-[#e85c22] px-4 text-xs font-semibold text-[#e85c22] hover:bg-orange-50 disabled:opacity-60"
          >
            {loading === "exception" ? "送信中…" : "申請を送信"}
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {exceptionRequests.length === 0 ? (
            <p className="text-xs text-zinc-500">申請履歴はありません</p>
          ) : (
            exceptionRequests.map((r) => (
              <div key={r.exception_request_id} className="rounded-lg bg-zinc-50 p-2 text-xs text-zinc-700">
                <p className="font-medium">
                  {exceptionTypeLabelJp(r.type)} · {exceptionStatusLabelJp(r.status)}
                </p>
                <p className="mt-1 text-zinc-600">{r.reason}</p>
              </div>
            ))
          )}
        </div>
      </section>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
