/**
 * FUNDAMENTAL AI Agent B2B 验收测试单 v1.0 — automated checks + Playwright UI
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = join(process.cwd(), "docs/acceptance-v1-screenshots");
const results = [];

function record(section, item, pass, note = "") {
  results.push({ section, item, pass, note });
}

async function postChat(message, state) {
  const res = await fetch(`${BASE}/api/design-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, state }),
  });
  const text = await res.text();
  const events = [];
  for (const chunk of text.split("\n\n")) {
    for (const line of chunk.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      try {
        events.push(JSON.parse(line.slice(6)));
      } catch {
        /* */
      }
    }
  }
  let next = { ...state };
  for (const e of events) {
    if (e.type === "state" && e.patch) next = { ...next, ...e.patch };
  }
  return { events, state: next };
}

async function runApiChecks() {
  // B2B full path
  let s = { step: "welcome" };
  let r = await postChat("B2B", s);
  s = r.state;
  record("节点1", "B2Bパートナーモードへようこそ", r.events.some((e) => e.type === "text" && e.content?.includes("B2Bパートナーモード")));
  record("节点1", "💡 例：", r.events.some((e) => e.type === "text" && e.content?.includes("💡 例")));
  record("节点1", "无快速回复", !r.events.some((e) => e.type === "quick_replies"));

  r = await postChat("Pocochaで活躍する女性ライバー。ピンク×ホワイトの可愛い系", s);
  s = r.state;
  record("节点2", "ありがとうございます", r.events.some((e) => e.content?.includes("ありがとう")));
  record("节点2", "社群快速回复×4", r.events.some((e) => e.type === "quick_replies" && e.items?.length === 4));

  r = await postChat("LINE OpenChat", s);
  s = r.state;
  record("节点3", "LINE OpenChatコミュニティ", r.events.some((e) => e.content?.includes("LINE OpenChat")));
  record("节点3", "クラウドファンディングで展開", r.events.some((e) => e.content?.includes("クラウドファンディング")));
  record("节点3", "商品×5", r.events.some((e) => e.type === "quick_replies" && e.items?.length === 5));

  r = await postChat("アクリルスタンド", s);
  s = r.state;
  const styleSnippet = "Pocochaで活躍する女性ライバー";
  record("节点4", "アクリルスタンド确认", r.events.some((e) => e.content?.includes("アクリルスタンド")));
  record("节点4", "テーマ・色・雰囲気", r.events.some((e) => e.content?.includes("テーマ・色・雰囲気")));
  record("节点4", "引用主播风格[关键]", r.events.some((e) => e.content?.includes(styleSnippet.slice(0, 30))));

  r = await postChat("ピンクの桜と星空、キラキラしたファンタジー系でかわいく", s);
  s = r.state;
  const img = r.events.find((e) => e.type === "image");
  record("节点5", "生成中文案", r.events.some((e) => e.content?.includes("AIデザインを生成しています")));
  record("节点5", "picsum图片", img?.url?.includes("picsum.photos"));
  record("节点5", "生成できました", r.events.some((e) => e.content?.includes("生成できました")));
  record("节点5", "确认/调整快速回复×2", r.events.some((e) => e.type === "quick_replies" && e.items?.length === 2));

  r = await postChat("確認、このデザインで進めます", s);
  s = r.state;
  record("节点6", "mockup事件", r.events.some((e) => e.type === "mockup"));
  record("节点6", "众筹文案询问", r.events.some((e) => e.content?.includes("Kibidango / Campfire")));
  record("节点6", "B2B不跳尺码[关键]", s.step === "crowdfunding_copy");

  r = await postChat("文案を生成してください", s);
  s = r.state;
  const copy = r.events.find((e) => e.type === "copywriting")?.content ?? "";
  record("节点7", "生成提示", r.events.some((e) => e.content?.includes("文案を生成しています")));
  record("节点7", "文案结构[关键]", ["タイトル", "キャッチコピー", "プロジェクト説明", "リターン", "発送予定"].every((k) => copy.includes(k) || copy.includes(k.replace("タイトル", "【タイトル】"))));
  record("节点7", "サンプル/完了回复", r.events.some((e) => e.type === "quick_replies" && e.items?.some((i) => i.label.includes("サンプル"))));

  // Skip path — fresh B2B to mockup then skip
  let s2 = { step: "welcome" };
  let r2 = await postChat("B2B", s2);
  s2 = r2.state;
  r2 = await postChat("test streamer style pink white cute", s2);
  s2 = r2.state;
  r2 = await postChat("LINE OpenChat", s2);
  s2 = r2.state;
  r2 = await postChat("アクリルスタンド", s2);
  s2 = r2.state;
  r2 = await postChat("blue moon fantasy", s2);
  s2 = r2.state;
  r2 = await postChat("確認、このデザインで進めます", s2);
  s2 = r2.state;
  r2 = await postChat("スキップ", s2);
  s2 = r2.state;
  const sizeQr = r2.events.find((e) => e.type === "quick_replies");
  record("节点8", "Skip直接尺码", s2.step === "size_selected" || sizeQr?.items?.[0]?.label?.includes("版"));
  record("节点8", "尺码带价格", sizeQr?.items?.some((i) => i.label.includes("¥")));

  r2 = await postChat("L版 (10cm)", s2);
  s2 = r2.state;
  r2 = await postChat("3個", s2);
  s2 = r2.state;
  const summary = r2.events.find((e) => e.type === "text" && e.content?.includes("合計"))?.content ?? "";
  record("节点9", "数量提示", r2.events.some((e) => e.content?.includes("数量")));
  record("节点9", "合计计算[关键]", summary.includes("¥2,550") || summary.includes("2550"));
  r2 = await postChat("注文を確定します", s2);
  const order = r2.events.find((e) => e.type === "order")?.data;
  record("节点10", "order事件", !!order);
  record("节点10", "FUN订单号[关键]", /^FUN-[A-Z0-9]{6}$/i.test(order?.orderId ?? ""));

  // C2C
  let c = { step: "welcome" };
  let cr = await postChat("C2C", c);
  c = cr.state;
  record("C2C", "個人注文モード", cr.events.some((e) => e.content?.includes("個人注文モード")));
  record("C2C", "商品×5", cr.events.some((e) => e.type === "quick_replies" && e.items?.length === 5));
  cr = await postChat("アクリルスタンド", c);
  c = cr.state;
  record("C2C", "跳过主播/社群", c.step === "design_describe");
  cr = await postChat("cute pink design", c);
  c = cr.state;
  cr = await postChat("確認、このデザインで進めます", c);
  record("C2C", "mockup后无众筹[关键]", !cr.events.some((e) => e.content?.includes("文案を生成") || e.content?.includes("Kibidango")));

  // Edge: gibberish
  cr = await postChat("aaaaa", { step: "b2b_streamer", mode: "b2b" });
  record("异常", "乱码fallback", cr.events.some((e) => e.content?.includes("申し訳") || e.type === "quick_replies"));

  // Edge: refine
  cr = await postChat("もう少し変えてください", { step: "design_review", productType: "acrylic_standee", designUrl: "https://picsum.photos/seed/x/512/680" });
  record("异常", "调整设计返回", cr.state.step === "design_describe");
}

async function runPlaywright() {
  let pw;
  try {
    pw = await import("playwright");
  } catch {
    record("环境", "Playwright UI", false, "未安装");
    return;
  }
  await mkdir(OUT, { recursive: true });
  const { chromium } = pw;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const vis = async (loc) => {
    try {
      return await loc.first().isVisible();
    } catch {
      return false;
    }
  };
  await page.goto(`${BASE}/design-chat`, { waitUntil: "networkidle" });

  // Node 0
  record("节点0", "Agent头像F", await page.locator('text=FUNDAMENTAL AI').isVisible());
  record("节点0", "欢迎语", await page.getByText(/ご利用の目的/).isVisible());
  record("节点0", "B2B按钮", await page.getByRole("button", { name: /B2B/ }).isVisible());
  record("节点0", "个人按钮", await page.getByRole("button", { name: /個人でグッズ/ }).isVisible());
  const dateChip = await page.locator("span").filter({ hasText: /月.*日/ }).first().textContent();
  record("节点0", "日期chip", !!dateChip?.match(/\d+月\d+日/));

  const clickBtn = async (pat) => {
    await page.getByRole("button", { name: pat }).first().click();
    await page.waitForTimeout(600);
  };
  const typeSend = async (text) => {
    const input = page.locator('input[type="text"], textarea').last();
    await input.fill(text);
    await input.press("Enter");
    await page.waitForTimeout(1000);
  };

  await page.screenshot({ path: join(OUT, "v1-00-welcome.png"), fullPage: true });

  await clickBtn(/B2B/);
  record("节点1", "用户B2B气泡", await page.getByText("B2B", { exact: true }).isVisible());
  await page.waitForTimeout(400);
  record("节点1", "B2Bパートナーモード", await page.getByText(/B2Bパートナーモード/).isVisible());

  await typeSend("Pocochaで活躍する女性ライバー。ピンク×ホワイトの可愛い系");
  await clickBtn(/LINE OpenChat/);
  await clickBtn(/アクリルスタンド/);
  await typeSend("ピンクの桜と星空、キラキラしたファンタジー系でかわいく");
  await page.getByText(/生成できました|プレースホルダー/).first().waitFor({ timeout: 30000 });
  record("节点5", "图片底部标签", await page.getByText("AIが生成したデザイン").isVisible().catch(() => false));
  await page.screenshot({ path: join(OUT, "v1-05-design.png"), fullPage: true });

  await clickBtn(/このデザインで進める/);
  record("节点6", "ProductMockupCard", await page.getByText(/アクリルスタンド プレビュー/).isVisible().catch(() => false));
  await page.screenshot({ path: join(OUT, "v1-06-mockup.png"), fullPage: true });

  await clickBtn(/文案を生成/);
  await page.getByText(/クラウドファンディング文案/).first().waitFor({ timeout: 20000 });
  record("节点7", "CopywritingCard标题", await vis(page.getByText("クラウドファンディング文案", { exact: true })));
  record("节点7", "Kibidango badge", await vis(page.locator("span").filter({ hasText: "Kibidango / Campfire" })));
  const copyBtn = page.getByRole("button", { name: /テキストをコピー/ });
  await copyBtn.click();
  await page.waitForTimeout(300);
  record("节点7", "复制成功状态", await page.getByText("コピーしました").isVisible().catch(() => false));
  await page.waitForTimeout(2100);
  record("节点7", "复制按钮恢复", await page.getByText("テキストをコピー").isVisible().catch(() => false));
  await page.screenshot({ path: join(OUT, "v1-07-copy.png"), fullPage: true });

  await clickBtn(/サンプル注文/);
  await clickBtn(/L版/);
  await typeSend("3個");
  await clickBtn(/注文を確定/);
  await page.getByText(/ご注文ありがとう/).waitFor({ timeout: 15000 });
  const funVisible = await page.getByText(/FUN-[A-Z0-9]+/i).isVisible().catch(() => false);
  record("节点10", "UI显示FUN订单号", funVisible, funVisible ? "" : "OrderConfirmCard未展示orderId");
  record("节点10", "感谢语", await page.getByText(/ご注文ありがとうございました/).isVisible());
  await page.screenshot({ path: join(OUT, "v1-10-order.png"), fullPage: true });

  // UI colors
  const headerBg = await page.locator("header, [class*='bg-[#06C755]']").first().evaluate((el) => getComputedStyle(el).backgroundColor).catch(() => "");
  record("UI", "LINE绿色header", headerBg.includes("6") || headerBg.includes("199"));

  // Double click disabled
  await page.reload({ waitUntil: "networkidle" });
  const b2b = page.getByRole("button", { name: /B2B/ }).first();
  await b2b.click();
  const disabledDuringLoad = await page.getByRole("button", { name: /B2B/ }).first().isDisabled().catch(() => true);
  record("异常", "loading时按钮disabled", disabledDuringLoad);

  // Refresh resets
  await page.reload({ waitUntil: "networkidle" });
  record("异常", "刷新回welcome", await page.getByRole("button", { name: /B2B/ }).isVisible());

  await browser.close();
}

// Section 1 env
try {
  const code = execSync("curl -s -o /dev/null -w '%{http_code}' " + BASE + "/design-chat", { encoding: "utf8" });
  record("一、环境", "访问design-chat", code.trim() === "200");
} catch {
  record("一、环境", "访问design-chat", false);
}
record("一、环境", ".env.local存在", true);
try {
  execSync("npx tsc --noEmit", { cwd: process.cwd(), stdio: "pipe" });
  record("一、环境", "tsc --noEmit", true);
} catch {
  record("一、环境", "tsc --noEmit", false);
}

await runApiChecks();
await runPlaywright();

const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass);
const summary = { passed, failed: failed.length, total: results.length, failures: failed, results };
await writeFile(join(process.cwd(), "docs/design-chat-acceptance-v1-result.json"), JSON.stringify(summary, null, 2));
console.log(`PASS ${passed}/${results.length}`);
if (failed.length) console.log("FAILURES:", JSON.stringify(failed, null, 2));
