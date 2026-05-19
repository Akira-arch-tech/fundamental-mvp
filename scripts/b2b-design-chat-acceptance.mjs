/**
 * B2B design-chat acceptance: API smoke + optional Playwright screenshots.
 * Run: node scripts/b2b-design-chat-acceptance.mjs
 * Requires dev server at http://localhost:3000
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT_DIR = join(process.cwd(), "docs/acceptance-screenshots");

const B2B_STEPS = [
  {
    id: "N2",
    msg: "B2B",
    expect: (e, st) =>
      st.step === "b2b_streamer" && e.some((x) => x.type === "text" && x.content.includes("B2B")),
  },
  {
    id: "N3",
    msg: "Pocochaで活躍する女性ライバー。ピンク×ホワイトの可愛い系",
    expect: (e) => e.some((x) => x.type === "quick_replies"),
  },
  { id: "N4", msg: "LINE OpenChat", expect: (e) => e.some((x) => x.type === "text" && x.content.includes("LINE")) },
  { id: "N5", msg: "アクリルスタンド", expect: (e) => e.some((x) => x.type === "text" && x.content.includes("アクリル")) },
  {
    id: "N6",
    msg: "青い星空と月モチーフ、キラキラしたファンタジー系",
    expect: (e) => e.some((x) => x.type === "image" && String(x.url).includes("picsum.photos")),
  },
  {
    id: "N7",
    msg: "確認、このデザインで進めます",
    expect: (e) => e.some((x) => x.type === "mockup"),
  },
  {
    id: "N8",
    msg: "文案を生成してください",
    expect: (e) =>
      e.some(
        (x) =>
          x.type === "copywriting" &&
          (String(x.content).includes("テンプレート") || String(x.content).includes("【タイトル】")),
      ),
  },
  { id: "N9", msg: "サンプル注文", expect: (e) => e.some((x) => x.type === "quick_replies" && x.items?.[0]?.label?.includes("版")) },
  { id: "N10", msg: "L版 (10cm)", expect: (e) => e.some((x) => x.type === "text" && x.content.includes("数量")) },
  { id: "N11", msg: "2個", expect: (e) => e.some((x) => x.type === "text" && x.content.includes("合計")) },
  { id: "N12", msg: "注文を確定します", expect: (e) => e.some((x) => x.type === "order" && x.data?.orderId) },
];

async function postChat(message, state) {
  const res = await fetch(`${BASE}/api/design-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, state }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  const events = [];
  for (const chunk of text.split("\n\n")) {
    for (const line of chunk.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      try {
        events.push(JSON.parse(line.slice(6)));
      } catch {
        /* skip */
      }
    }
  }
  let nextState = { ...state };
  for (const e of events) {
    if (e.type === "state" && e.patch) nextState = { ...nextState, ...e.patch };
  }
  return { events, state: nextState };
}

async function runApiAcceptance() {
  let state = { step: "welcome" };
  const results = [];

  for (const step of B2B_STEPS) {
    const { events, state: next } = await postChat(step.msg, state);
    state = next;
    const ok = step.expect(events, state);
    results.push({ id: step.id, ok, step: state.step, eventTypes: [...new Set(events.map((e) => e.type))] });
    if (!ok) {
      console.error(`FAIL ${step.id}`, events.filter((e) => e.type !== "done").slice(-5));
      process.exitCode = 1;
    } else {
      console.log(`PASS ${step.id} → step=${state.step}`);
    }
  }

  return results;
}

async function runPlaywrightScreenshots() {
  let playwright;
  try {
    playwright = await import("playwright");
  } catch {
    console.warn("playwright not installed — skipping UI screenshots");
    return false;
  }

  await mkdir(OUT_DIR, { recursive: true });
  const { chromium } = playwright;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${BASE}/design-chat`, { waitUntil: "networkidle" });

  const clickReply = async (pattern) => {
    const btn = page.getByRole("button", { name: pattern });
    await btn.first().waitFor({ state: "visible", timeout: 15000 });
    await btn.first().click();
    await page.waitForTimeout(800);
  };

  const typeSend = async (text) => {
    const input = page.locator('input[type="text"], textarea').last();
    await input.fill(text);
    await input.press("Enter");
    await page.waitForTimeout(1200);
  };

  await page.screenshot({ path: join(OUT_DIR, "b2b-01-welcome.png"), fullPage: true });

  await clickReply(/B2B/);
  await typeSend("Pocochaで活躍する女性ライバー。ピンク×ホワイトの可愛い系");
  await clickReply(/LINE/);
  await clickReply(/アクリルスタンド/);
  await typeSend("青い星空と月モチーフ、キラキラしたファンタジー系");

  await page.getByText(/生成できました|AIが生成/).first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT_DIR, "b2b-02-design-image.png"), fullPage: true });

  await clickReply(/このデザインで進める|進める/);
  await page.waitForTimeout(600);
  await clickReply(/文案を生成/);
  await page.getByText(/文案が完成|テンプレート|タイトル/).first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT_DIR, "b2b-03-mockup-copy.png"), fullPage: true });

  await clickReply(/サンプル注文/);
  await clickReply(/L版/);
  await typeSend("2個");
  await clickReply(/注文を確定/);
  await page.getByText(/FUN-|ご注文ありがとう/).first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT_DIR, "b2b-04-order-complete.png"), fullPage: true });

  await browser.close();
  return true;
}

const apiResults = await runApiAcceptance();
const shotOk = await runPlaywrightScreenshots();

const summary = { apiResults, screenshots: shotOk ? OUT_DIR : null, base: BASE };
await writeFile(join(process.cwd(), "docs/b2b-acceptance-result.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
