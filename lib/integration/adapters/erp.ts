/**
 * ERP 出站适配（MVP）：可指向真实 URL，或本地跳过（仅写对接任务成功）。
 */

export async function executeErpOutbound(payload: unknown, requestId: string): Promise<void> {
  if (process.env.ERP_PUSH_SIMULATE_FAIL === "1") {
    throw new Error("simulated ERP failure (ERP_PUSH_SIMULATE_FAIL=1)");
  }
  const url = process.env.EXTERNAL_ERP_URL?.trim();
  if (!url) {
    return;
  }
  const idem =
    typeof payload === "object" &&
    payload !== null &&
    "order_id" in payload &&
    typeof (payload as { order_id: unknown }).order_id === "string"
      ? `erp:${(payload as { order_id: string }).order_id}`
      : requestId;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Request-Id": requestId,
      "Idempotency-Key": idem,
    },
    body: JSON.stringify({ ...(payload as object), requestId }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) {
    throw new Error(`ERP push failed: HTTP ${res.status}`);
  }
}
