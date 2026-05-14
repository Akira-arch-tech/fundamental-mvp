import { spawn } from "node:child_process";

const port = 3100;
const host = "127.0.0.1";
const base = `http://${host}:${port}`;
const store = "/shop";

const checks = [
  { path: "/ja", mustInclude: "アクリルオーダーメイド特集" },
  { path: `${store}/favorite`, mustInclude: "オリジナル推し活グッズ" },
  { path: `${store}/products`, mustInclude: "商品一覧" },
  { path: `${store}/products/free-acrylic-stand-clear`, mustInclude: "デザインを始める" },
  {
    path: `${store}/customize/p1`,
    mustIncludeAll: ["デザインエディタ", "AI 画像"],
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

/** 与 `scripts/seed-users.ts` 对齐：`VERIFY_CLICKFLOW_WITH_DB=1` 时用邮箱密码登录。 */
const VERIFY_SEED_EMAIL_BY_ROLE = {
  admin: "verify-admin@fundamental.local",
  ops: "verify-ops@fundamental.local",
  customer_service: "verify-cs@fundamental.local",
};

async function mockLogin(role, displayName) {
  if (process.env.VERIFY_CLICKFLOW_WITH_DB === "1") {
    const email = VERIFY_SEED_EMAIL_BY_ROLE[role];
    if (!email) {
      throw new Error(`db login: unknown role ${role}`);
    }
    const password = process.env.VERIFY_SEED_PASSWORD || "FundamentalVerify#2026";
    const res = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`db login as ${role} failed ${res.status}: ${t.slice(0, 240)}`);
    }
    const cookie = sessionCookieHeader(res);
    if (!cookie) {
      throw new Error("db login did not return fdm_session cookie");
    }
    return cookie;
  }
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, display_name: displayName }),
  });
  if (!res.ok) {
    throw new Error(`mock login as ${role} failed`);
  }
  const cookie = sessionCookieHeader(res);
  if (!cookie) {
    throw new Error("mock login did not return fdm_session cookie");
  }
  return cookie;
}

async function waitUntilReady(timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${base}${store}/favorite`);
      if (res.ok) return;
    } catch {
      // continue polling
    }
    await sleep(1000);
  }
  throw new Error("dev server did not become ready within 60s");
}

async function runChecks() {
  for (const c of checks) {
    const url = `${base}${c.path}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`${c.path} returned ${res.status}`);
    }
    const html = await res.text();
    if (c.mustIncludeAll) {
      for (const m of c.mustIncludeAll) {
        if (!html.includes(m)) {
          throw new Error(`${c.path} missing marker: ${m}`);
        }
      }
    } else if (!html.includes(c.mustInclude)) {
      throw new Error(`${c.path} missing marker: ${c.mustInclude}`);
    }
    console.log(`PASS ${c.path}`);
  }

  const aigcCreate = await fetch(`${base}/api/aigc/generations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      product_id: "p1",
      prompt: "verify-clickflow",
      mode: "txt2img",
      candidate_count: 2,
    }),
  });
  if (!aigcCreate.ok) {
    throw new Error(`POST /api/aigc/generations failed ${aigcCreate.status}`);
  }
  const aigcCreateJson = await aigcCreate.json();
  if (!aigcCreateJson.job_id) throw new Error("AIGC create missing job_id");
  if (aigcCreateJson.status !== "queued") {
    throw new Error(`AIGC create unexpected status ${aigcCreateJson.status}`);
  }
  const jobId = aigcCreateJson.job_id;
  let aigcGetJson;
  for (let i = 0; i < 50; i++) {
    const aigcGet = await fetch(`${base}/api/aigc/generations/${jobId}`);
    if (!aigcGet.ok) throw new Error(`GET /api/aigc/generations/[jobId] failed ${aigcGet.status}`);
    aigcGetJson = await aigcGet.json();
    if (aigcGetJson.status === "ready" && Array.isArray(aigcGetJson.candidates) && aigcGetJson.candidates.length > 0) {
      break;
    }
    if (aigcGetJson.status === "failed") {
      throw new Error(`AIGC job failed: ${aigcGetJson.error?.message ?? "unknown"}`);
    }
    await sleep(150);
  }
  if (
    !aigcGetJson ||
    aigcGetJson.status !== "ready" ||
    !Array.isArray(aigcGetJson.candidates) ||
    aigcGetJson.candidates.length === 0
  ) {
    throw new Error("AIGC job not ready with candidates after polling");
  }
  const aigcConfirm = await fetch(`${base}/api/aigc/generations/${jobId}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ candidate_index: 0 }),
  });
  if (!aigcConfirm.ok) {
    throw new Error(`POST /api/aigc/generations/[jobId]/confirm failed ${aigcConfirm.status}`);
  }
  const aigcConfirmJson = await aigcConfirm.json();
  if (aigcConfirmJson.status !== "confirmed" || !aigcConfirmJson.selected?.url) {
    throw new Error("AIGC confirm missing confirmed status or selected.url");
  }
  console.log("PASS /api/aigc/generations (create + get + confirm)");

  const miniPngB64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  const pngBuf = Buffer.from(miniPngB64, "base64");
  const fd1 = new FormData();
  fd1.append("files", new Blob([pngBuf], { type: "image/png" }), "ref1.png");
  const up1 = await fetch(`${base}/api/aigc/reference-assets`, { method: "POST", body: fd1 });
  if (!up1.ok) throw new Error(`POST reference-assets failed ${up1.status}`);
  const up1Json = await up1.json();
  const id1 = up1Json.assets?.[0]?.asset_id;
  if (!id1) throw new Error("reference-assets missing asset_id");

  const img2 = await fetch(`${base}/api/aigc/generations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      product_id: "p1",
      prompt: "clickflow-img2img",
      mode: "img2img",
      reference_asset_ids: [id1],
      candidate_count: 1,
    }),
  });
  if (!img2.ok) throw new Error(`POST img2img generations failed ${img2.status}`);
  const img2Json = await img2.json();
  const jobImg2 = img2Json.job_id;
  let stImg2;
  for (let i = 0; i < 50; i++) {
    const g = await fetch(`${base}/api/aigc/generations/${jobImg2}`);
    stImg2 = await g.json();
    if (stImg2.status === "ready" && stImg2.candidates?.length) break;
    if (stImg2.status === "failed") throw new Error(`img2img failed: ${stImg2.error?.message}`);
    await sleep(150);
  }
  if (!stImg2 || stImg2.status !== "ready") throw new Error("img2img job not ready");
  console.log("PASS /api/aigc/reference-assets + img2img");

  const fd2 = new FormData();
  fd2.append("files", new Blob([pngBuf], { type: "image/png" }), "a.png");
  fd2.append("files", new Blob([pngBuf], { type: "image/png" }), "b.png");
  const up2 = await fetch(`${base}/api/aigc/reference-assets`, { method: "POST", body: fd2 });
  if (!up2.ok) throw new Error(`POST reference-assets (2) failed ${up2.status}`);
  const up2Json = await up2.json();
  const ids2 = (up2Json.assets ?? []).map((a) => a.asset_id).filter(Boolean);
  if (ids2.length < 2) throw new Error("expected 2 asset ids for multi_ref");
  const multi = await fetch(`${base}/api/aigc/generations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      product_id: "p1",
      prompt: "clickflow-multi-ref",
      mode: "multi_ref",
      reference_asset_ids: ids2,
      references: [
        { asset_id: ids2[0], role: "subject" },
        { asset_id: ids2[1], role: "style" },
      ],
      candidate_count: 1,
    }),
  });
  if (!multi.ok) throw new Error(`POST multi_ref generations failed ${multi.status}`);
  const multiJson = await multi.json();
  const jobM = multiJson.job_id;
  let stM;
  for (let i = 0; i < 50; i++) {
    const g = await fetch(`${base}/api/aigc/generations/${jobM}`);
    stM = await g.json();
    if (stM.status === "ready" && stM.candidates?.length) break;
    if (stM.status === "failed") throw new Error(`multi_ref failed: ${stM.error?.message}`);
    await sleep(150);
  }
  if (!stM || stM.status !== "ready") throw new Error("multi_ref job not ready");
  console.log("PASS /api/aigc/generations multi_ref");

  const cronKey = process.env.INTEGRATION_WORKER_KEY || "clickflow_verify_worker";
  const cronRes = await fetch(`${base}/api/cron/aigc-worker`, {
    headers: { Authorization: `Bearer ${cronKey}` },
  });
  if (!cronRes.ok) {
    throw new Error(`GET /api/cron/aigc-worker failed ${cronRes.status}`);
  }
  const cronJson = await cronRes.json();
  if (typeof cronJson.processed !== "number") {
    throw new Error("cron aigc-worker missing processed count");
  }
  console.log("PASS /api/cron/aigc-worker");
  const customizationRes = await fetch(`${base}/api/customizations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      product_id: "p1",
      text_layers: [{ text: "VERIFY", color: "#111111" }],
      color_layers: [{ role: "background", value: "#ffffff" }],
      user_images: [],
      estimated_dpi: 220,
    }),
  });
  if (!customizationRes.ok) {
    throw new Error("POST /api/customizations failed");
  }
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
    throw new Error("checkout page missing ご注文手続き (valid customization path)");
  }
  if (!checkoutHtml.includes("デザインID（控え）")) {
    throw new Error("checkout page missing design id block");
  }

  const checkoutCamelRes = await fetch(
    `${base}${store}/checkout?customizationId=${encodeURIComponent(customizationId)}`,
  );
  if (!checkoutCamelRes.ok) {
    throw new Error(`checkout with customizationId (camel) returned ${checkoutCamelRes.status}`);
  }
  const checkoutCamelHtml = await checkoutCamelRes.text();
  if (!checkoutCamelHtml.includes("ご注文手続き")) {
    throw new Error("checkout camelCase query param not accepted");
  }
  console.log("PASS /shop/checkout (customization_id + customizationId + preview API)");

  const previewMetaRes = await fetch(`${base}/api/customizations/${customizationId}/preview`);
  if (!previewMetaRes.ok) {
    throw new Error(`GET customization preview failed: ${previewMetaRes.status}`);
  }
  const previewMetaJson = await previewMetaRes.json();
  if (previewMetaJson.customization_id !== customizationId) {
    throw new Error("preview JSON customization_id mismatch");
  }

  const orderRes = await fetch(`${base}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customization_id: customizationId,
      product_id: "p1",
      qty: 1,
      recipient_name: "Verify User",
      recipient_phone: "090-0000-0000",
      shipping_address: "Tokyo",
      note: "verify",
      payment_method: "demo_instant",
      copyright_acknowledged: true,
    }),
  });
  if (!orderRes.ok) {
    throw new Error("POST /api/orders failed");
  }
  const orderJson = await orderRes.json();
  const orderId = orderJson.order_id;

  const detailRes = await fetch(`${base}${store}/orders/${orderId}`);
  if (!detailRes.ok) {
    throw new Error(`${store}/orders/${orderId} returned ${detailRes.status}`);
  }
  const detailHtml = await detailRes.text();
  if (!detailHtml.includes("ご注文の進捗")) {
    throw new Error(`${store}/orders/${orderId} missing marker: ご注文の進捗`);
  }
  if (!detailHtml.includes("お問い合わせ") || !detailHtml.includes("特別対応のお申し出")) {
    throw new Error(`${store}/orders/${orderId} missing customer inquiry or exception panel (JP)`);
  }

  const supportRes = await fetch(`${base}/api/support/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      order_id: orderId,
      question: "请问什么时候发货？",
    }),
  });
  if (!supportRes.ok) {
    throw new Error("POST /api/support/ask failed");
  }

  const exceptionRes = await fetch(`${base}/api/orders/${orderId}/exceptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "refund",
      reason: "测试退款流程",
    }),
  });
  if (!exceptionRes.ok) {
    throw new Error(`POST /api/orders/${orderId}/exceptions failed`);
  }
  const exceptionJson = await exceptionRes.json();
  const exceptionId = exceptionJson.exception_request_id;

  const patchNoAuth = await fetch(
    `${base}/api/orders/${orderId}/exceptions/${exceptionId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "processing",
        note: "should be 401 without session",
      }),
    },
  );
  if (patchNoAuth.status !== 401) {
    throw new Error("PATCH exception without cookie should return 401");
  }

  const cookieOps = await mockLogin("ops", "verify-ops");

  const transitionRes = await fetch(
    `${base}/api/orders/${orderId}/exceptions/${exceptionId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookieOps },
      body: JSON.stringify({
        status: "processing",
        note: "auto transition check",
      }),
    },
  );
  if (!transitionRes.ok) {
    throw new Error(`PATCH /api/orders/${orderId}/exceptions/${exceptionId} failed`);
  }
  const transitionJson = await transitionRes.json();
  if (transitionJson.status !== "processing") {
    throw new Error("exception status transition did not apply");
  }
  if (!Array.isArray(transitionJson.audit_logs) || transitionJson.audit_logs.length === 0) {
    throw new Error("exception audit logs missing after transition");
  }

  const forbiddenApproveRes = await fetch(
    `${base}/api/orders/${orderId}/exceptions/${exceptionId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookieOps },
      body: JSON.stringify({
        status: "approved",
        note: "should be forbidden",
      }),
    },
  );
  if (forbiddenApproveRes.status !== 403) {
    throw new Error("role permission check failed: ops should not approve");
  }

  const cookieAdmin = await mockLogin("admin", "verify-super-admin");

  const approveByAdminRes = await fetch(
    `${base}/api/orders/${orderId}/exceptions/${exceptionId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookieAdmin },
      body: JSON.stringify({
        status: "approved",
        note: "admin approval",
      }),
    },
  );
  if (!approveByAdminRes.ok) {
    throw new Error("admin approval transition failed");
  }
  const approveByAdminJson = await approveByAdminRes.json();
  if (approveByAdminJson.status !== "approved") {
    throw new Error("admin approval did not change status to approved");
  }

  const dashRes = await fetch(`${base}/b`);
  if (!dashRes.ok) {
    throw new Error(`/b returned ${dashRes.status}`);
  }
  const dashHtml = await dashRes.text();
  if (!dashHtml.includes("管理后台") || !dashHtml.includes("订单总数")) {
    throw new Error("/b missing dashboard KPI markers");
  }

  const exPendingRes = await fetch(
    `${base}/api/backoffice/exceptions?page=1&page_size=100&pending_queue=1`,
    { headers: { Cookie: cookieAdmin } },
  );
  if (!exPendingRes.ok) {
    throw new Error(`GET exceptions pending_queue failed: ${exPendingRes.status}`);
  }
  const exPendingJson = await exPendingRes.json();
  for (const row of exPendingJson.items ?? []) {
    if (row.status !== "submitted" && row.status !== "processing") {
      throw new Error(`pending_queue must only list submitted|processing, got ${row.status}`);
    }
  }

  console.log(`PASS ${store}/orders/${orderId}`);

  // --- 购物车 CRUD 链路 ---
  // 先清空，防止上轮残留影响断言
  await fetch(`${base}/api/cart`, { method: "DELETE" });

  const cartAddRes = await fetch(`${base}/api/cart`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      product_id: "p1",
      qty: 2,
      added_from: "product",
      // p1 规格必填 + 白名单组合（见 lib/spec-combination-whitelist.ts）
      selected_specs: [
        { spec_id: "size", value_id: "s" },
        { spec_id: "base", value_id: "slit" },
      ],
    }),
  });
  if (!cartAddRes.ok) {
    throw new Error(`POST /api/cart failed: ${cartAddRes.status}`);
  }
  const cartAddJson = await cartAddRes.json();
  const cartItemId = cartAddJson.item?.cart_item_id;
  if (!cartItemId) {
    throw new Error("POST /api/cart missing cart_item_id");
  }

  const cartGetRes = await fetch(`${base}/api/cart`);
  if (!cartGetRes.ok) {
    throw new Error(`GET /api/cart failed: ${cartGetRes.status}`);
  }
  const cartGetJson = await cartGetRes.json();
  if (!Array.isArray(cartGetJson.items) || cartGetJson.items.length === 0) {
    throw new Error("GET /api/cart returned empty items after add");
  }
  if (typeof cartGetJson.total_amount !== "number") {
    throw new Error("GET /api/cart missing total_amount");
  }

  const cartPatchRes = await fetch(`${base}/api/cart/${cartItemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ qty: 3 }),
  });
  if (!cartPatchRes.ok) {
    throw new Error(`PATCH /api/cart/${cartItemId} failed: ${cartPatchRes.status}`);
  }
  const cartPatchJson = await cartPatchRes.json();
  if (cartPatchJson.item?.qty !== 3) {
    throw new Error("PATCH /api/cart qty update did not apply");
  }

  const cartDelRes = await fetch(`${base}/api/cart/${cartItemId}`, { method: "DELETE" });
  if (!cartDelRes.ok) {
    throw new Error(`DELETE /api/cart/${cartItemId} failed: ${cartDelRes.status}`);
  }

  const cartEmptyRes = await fetch(`${base}/api/cart`);
  const cartEmptyJson = await cartEmptyRes.json();
  if ((cartEmptyJson.items ?? []).some((it) => it.cart_item_id === cartItemId)) {
    throw new Error("cart item not removed after DELETE");
  }

  console.log("PASS cart CRUD flow");
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
        INTEGRATION_WORKER_KEY: process.env.INTEGRATION_WORKER_KEY || "clickflow_verify_worker",
        // 默认同 `isDatabaseEnabled()` 对齐：无 DB 时用 Mock Cookie 跑通后台 API；需测真实 DB 时设 VERIFY_CLICKFLOW_WITH_DB=1
        ...(process.env.VERIFY_CLICKFLOW_WITH_DB === "1" ? {} : { DATABASE_URL: "" }),
      },
    },
  );

  child.stdout.on("data", (buf) => {
    const text = String(buf);
    if (text.toLowerCase().includes("ready")) {
      process.stdout.write(text);
    }
  });
  child.stderr.on("data", (buf) => process.stderr.write(buf));

  try {
    await waitUntilReady();
    await runChecks();
    console.log("Clickflow verification passed.");
  } finally {
    child.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error("Clickflow verification failed:", err.message);
  process.exit(1);
});
