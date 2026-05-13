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
  { path: `${store}/checkout`, mustInclude: "チェックアウト" },
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

async function mockLogin(role, displayName) {
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
      reference_asset_count: 0,
    }),
  });
  if (!aigcCreate.ok) {
    throw new Error(`POST /api/aigc/generations failed ${aigcCreate.status}`);
  }
  const aigcCreateJson = await aigcCreate.json();
  if (!aigcCreateJson.job_id) throw new Error("AIGC create missing job_id");
  if (aigcCreateJson.status !== "ready") {
    throw new Error(`AIGC create unexpected status ${aigcCreateJson.status}`);
  }
  const aigcGet = await fetch(`${base}/api/aigc/generations/${aigcCreateJson.job_id}`);
  if (!aigcGet.ok) throw new Error(`GET /api/aigc/generations/[jobId] failed ${aigcGet.status}`);
  const aigcGetJson = await aigcGet.json();
  if (aigcGetJson.status !== "ready" || !Array.isArray(aigcGetJson.candidates) || aigcGetJson.candidates.length === 0) {
    throw new Error("AIGC job not ready with candidates");
  }
  const aigcConfirm = await fetch(`${base}/api/aigc/generations/${aigcCreateJson.job_id}/confirm`, {
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
