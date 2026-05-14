import { createHmac } from "node:crypto";
import { spawn } from "node:child_process";

const port = 3101;
const host = "127.0.0.1";
const base = `http://${host}:${port}`;
const store = "/shop";
const ERP_SECRET = "mvp_test_erp_secret";
const WORKER_KEY = "mvp_test_worker_key";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function signErpWebhookBody(rawBody, secret) {
  const t = Math.floor(Date.now() / 1000);
  const v1 = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  return `t=${t},v1=${v1}`;
}

/** @param {Response} res */
function sessionCookieHeader(res) {
  const name = "fdm_session";
  if (typeof res.headers.getSetCookie === "function") {
    for (const line of res.headers.getSetCookie()) {
      if (line.startsWith(`${name}=`)) return line.split(";")[0].trim();
    }
  }
  const raw = res.headers.get("set-cookie");
  if (raw) {
    const first = raw.split(";")[0].trim();
    if (first.startsWith(`${name}=`)) return first;
  }
  return "";
}

async function waitUntilReady(timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${base}${store}/favorite`);
      if (res.ok) return;
    } catch {
      // continue
    }
    await sleep(1000);
  }
  throw new Error("dev server did not become ready within 60s");
}

/** 与 `scripts/seed-users.ts` 对齐：`VERIFY_CLICKFLOW_WITH_DB=1` 时用邮箱密码登录。 */
const VERIFY_SEED_EMAIL_BY_ROLE = {
  admin: "verify-admin@fundamental.local",
  ops: "verify-ops@fundamental.local",
  customer_service: "verify-cs@fundamental.local",
};

async function mockLogin(role, displayName) {
  if (process.env.VERIFY_CLICKFLOW_WITH_DB === "1") {
    const email = VERIFY_SEED_EMAIL_BY_ROLE[role];
    if (!email) throw new Error(`db login: unknown role ${role}`);
    const password = process.env.VERIFY_SEED_PASSWORD || "FundamentalVerify#2026";
    const res = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`db login failed ${res.status}: ${t.slice(0, 240)}`);
    }
    const c = sessionCookieHeader(res);
    if (!c) throw new Error("no session cookie after db login");
    return c;
  }
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, display_name: displayName }),
  });
  if (!res.ok) throw new Error(`mock login failed: ${res.status}`);
  const c = sessionCookieHeader(res);
  if (!c) throw new Error("no session cookie");
  return c;
}

async function main() {
  const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
  const child = spawn(
    npxCmd,
    ["next", "dev", "--hostname", host, "--port", String(port)],
    {
      stdio: "pipe",
      env: {
        ...process.env,
        NEXT_DISABLE_TURBOPACK: "1",
        ERP_WEBHOOK_SECRET: ERP_SECRET,
        INTEGRATION_WORKER_KEY: WORKER_KEY,
        ...(process.env.VERIFY_CLICKFLOW_WITH_DB === "1" ? {} : { DATABASE_URL: "" }),
      },
    },
  );
  child.stderr.on("data", (buf) => process.stderr.write(buf));

  try {
    await waitUntilReady();

    const cookie = await mockLogin("admin", "mvp-verify");

    const customizationRes = await fetch(`${base}/api/customizations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: "p1",
        text_layers: [{ text: "MVP", color: "#111111" }],
        color_layers: [{ role: "background", value: "#ffffff" }],
        user_images: [],
        estimated_dpi: 220,
      }),
    });
    if (!customizationRes.ok) throw new Error("POST /api/customizations failed");
    const customizationJson = await customizationRes.json();
    const customizationId = customizationJson.customization_id;

    const checkoutPageRes = await fetch(
      `${base}${store}/checkout?customization_id=${encodeURIComponent(customizationId)}`,
    );
    if (!checkoutPageRes.ok) {
      throw new Error(`checkout with customization_id returned ${checkoutPageRes.status}`);
    }
    const checkoutHtml = await checkoutPageRes.text();
    if (!checkoutHtml.includes("ご注文手続き")) {
      throw new Error("checkout page missing ご注文手続き");
    }

    const orderRes = await fetch(`${base}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customization_id: customizationJson.customization_id,
        product_id: "p1",
        qty: 1,
        recipient_name: "MVP User",
        recipient_phone: "090-0000-0000",
        shipping_address: "Tokyo",
        note: "mvp-verify",
        payment_method: "demo_instant",
        copyright_acknowledged: true,
      }),
    });
    if (!orderRes.ok) throw new Error("POST /api/orders failed");
    const orderJson = await orderRes.json();
    const orderId = orderJson.order_id;
    const orderNo = orderJson.order_no;

    const bHome = await fetch(`${base}/b`);
    if (!bHome.ok) throw new Error(`/b dashboard failed: ${bHome.status}`);
    const bHtml = await bHome.text();
    if (!bHtml.includes("管理后台") || !bHtml.includes("订单总数")) {
      throw new Error("/b dashboard missing KPI markers");
    }

    const exPending = await fetch(
      `${base}/api/backoffice/exceptions?page=1&page_size=50&pending_queue=1`,
      { headers: { Cookie: cookie } },
    );
    if (!exPending.ok) throw new Error("GET exceptions?pending_queue=1 failed");
    const exPJson = await exPending.json();
    for (const row of exPJson.items ?? []) {
      if (row.status !== "submitted" && row.status !== "processing") {
        throw new Error(`pending_queue list must be submitted|processing only, got ${row.status}`);
      }
    }
    const exPendingPlusStatus = await fetch(
      `${base}/api/backoffice/exceptions?page=1&page_size=50&pending_queue=1&status=rejected`,
      { headers: { Cookie: cookie } },
    );
    if (!exPendingPlusStatus.ok) throw new Error("GET exceptions pending_queue+status failed");
    const exMixJson = await exPendingPlusStatus.json();
    for (const row of exMixJson.items ?? []) {
      if (row.status !== "submitted" && row.status !== "processing") {
        throw new Error("pending_queue=1 must ignore status param (no rejected rows)");
      }
    }

    const batchExport = await fetch(`${base}/api/backoffice/orders/batch-export`, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ order_ids: [orderId] }),
    });
    if (!batchExport.ok) throw new Error(`POST batch-export failed: ${batchExport.status}`);
    const batchCsv = await batchExport.text();
    if (!batchCsv.includes("order_id") || !batchCsv.includes(orderNo) || !batchCsv.includes(orderId)) {
      throw new Error("batch-export CSV missing header or order row");
    }

    await sleep(1200);

    const workerRes = await fetch(`${base}/api/integrations/worker/run?limit=20`, {
      method: "POST",
      headers: { "X-Integration-Worker-Key": WORKER_KEY },
    });
    if (!workerRes.ok) throw new Error(`worker run failed: ${workerRes.status}`);
    const workerJson = await workerRes.json();
    if (typeof workerJson.processed !== "number") throw new Error("worker response missing processed");

    const jobsRes = await fetch(`${base}/api/backoffice/integration-jobs?page=1&page_size=20`, {
      headers: { Cookie: cookie },
    });
    if (!jobsRes.ok) throw new Error("GET integration-jobs failed");
    const jobsJson = await jobsRes.json();
    const jobs = jobsJson.items ?? [];
    const erpOk = jobs.some((j) => j.event_type === "erp.order_created" && j.status === "success");
    if (!erpOk) throw new Error("expected successful erp.order_created job");

    const eventId = `evt_mvp_${Date.now()}`;
    const webhookBody = JSON.stringify({
      event_id: eventId,
      event_type: "shipment.updated",
      order_no: orderNo,
      status: "ERP_SENT",
      tracking_no: "TEST-TRACK-1",
      occurred_at: new Date().toISOString(),
    });
    const sig = signErpWebhookBody(webhookBody, ERP_SECRET);
    const wh1 = await fetch(`${base}/api/integrations/erp/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Signature": sig },
      body: webhookBody,
    });
    if (!wh1.ok) throw new Error(`webhook first call failed: ${wh1.status}`);

    const sig2 = signErpWebhookBody(webhookBody, ERP_SECRET);
    const wh2 = await fetch(`${base}/api/integrations/erp/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Signature": sig2 },
      body: webhookBody,
    });
    if (wh2.status !== 409) throw new Error("duplicate webhook should return 409");

    const badSig = signErpWebhookBody(webhookBody, "wrong_secret");
    const wh3 = await fetch(`${base}/api/integrations/erp/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Signature": badSig },
      body: webhookBody,
    });
    if (wh3.status !== 401) throw new Error("bad webhook signature should return 401");

    const alertsRes = await fetch(`${base}/api/backoffice/alerts?limit=20`, {
      headers: { Cookie: cookie },
    });
    if (!alertsRes.ok) throw new Error("GET alerts failed");
    const alertsJson = await alertsRes.json();
    const alerts = alertsJson.items ?? [];
    const hasSigAlert = alerts.some((a) => a.code === "WEBHOOK_SIGNATURE_INVALID");
    if (!hasSigAlert) throw new Error("expected WEBHOOK_SIGNATURE_INVALID alert");

    const exportRes = await fetch(`${base}/api/backoffice/audit-export`, {
      headers: { Cookie: cookie },
    });
    if (exportRes.status !== 200) throw new Error(`audit export failed: ${exportRes.status}`);
    const csv = await exportRes.text();
    if (!csv.includes("exception_request_id")) throw new Error("audit csv missing header");

    const orderGet = await fetch(`${base}/api/orders/${orderId}`);
    const orderDetail = await orderGet.json();
    if (orderDetail.status !== "shipped") throw new Error("order should be shipped after ERP_SENT webhook");

    const trBad = await fetch(`${base}/api/traces/not-a-request`);
    if (trBad.status !== 422) throw new Error(`GET /api/traces invalid id expected 422, got ${trBad.status}`);
    const trOk = await fetch(`${base}/api/traces/req_smoke_nonexistent`);
    if (!trOk.ok) throw new Error(`GET /api/traces valid format failed: ${trOk.status}`);
    const trJson = await trOk.json();
    if (trJson.trace_id !== "req_smoke_nonexistent" || !trJson.requestId)
      throw new Error("trace response missing trace_id or requestId");
    if (!Array.isArray(trJson.integration_jobs)) throw new Error("trace.integration_jobs must be array");

    const cronA = await fetch(`${base}/api/cron/aigc-worker`, {
      headers: { Authorization: `Bearer ${WORKER_KEY}` },
    });
    if (!cronA.ok) throw new Error(`GET /api/cron/aigc-worker failed: ${cronA.status}`);
    const cronAJson = await cronA.json();
    if (typeof cronAJson.processed !== "number") throw new Error("aigc-worker response missing processed");

    console.log("MVP verification passed (W12/W13 smoke).");
  } finally {
    child.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error("MVP verification failed:", err.message);
  process.exit(1);
});
