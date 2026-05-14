#!/usr/bin/env node
/**
 * 本地烟测：直连 DashScope multimodal-generation（不启动 Next）。
 * 用法：export DASHSCOPE_API_KEY=... && node scripts/aigc-smoke-dashscope.mjs
 */
const key = process.env.DASHSCOPE_API_KEY?.trim();
const region = (process.env.DASHSCOPE_REGION || "intl").trim().toLowerCase();
const model = (process.env.DASHSCOPE_T2I_MODEL || "qwen-image-plus").trim();
const url =
  region === "cn"
    ? "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"
    : "https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";

if (!key) {
  console.error("Missing DASHSCOPE_API_KEY");
  process.exit(1);
}

async function main() {
  const body = {
    model,
    input: {
      messages: [{ role: "user", content: [{ text: "minimal flat blue square icon smoke test" }] }],
    },
    parameters: { size: "512*512", n: 1, watermark: false },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error("dashscope", res.status, text.slice(0, 800));
    process.exit(1);
  }
  console.log("ok", text.slice(0, 400));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
