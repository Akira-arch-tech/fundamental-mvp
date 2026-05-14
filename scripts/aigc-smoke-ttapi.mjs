#!/usr/bin/env node
/**
 * 本地烟测：TTAPI Flux generate + fetch（不启动 Next）。
 * 用法：export TT_API_KEY=... && node scripts/aigc-smoke-ttapi.mjs
 * 可选：TTAPI_FLUX_MODE（默认 flux1-dev）
 */
const BASE = "https://api.ttapi.io";
const apiKey = process.env.TT_API_KEY?.trim();
const fluxMode = process.env.TTAPI_FLUX_MODE?.trim() || "flux1-dev";

if (!apiKey) {
  console.error("Missing TT_API_KEY");
  process.exit(1);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const genRes = await fetch(`${BASE}/flux/generate`, {
    method: "POST",
    headers: {
      "TT-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt: "smoke test simple red circle on white", mode: fluxMode }),
  });
  const genText = await genRes.text();
  if (!genRes.ok) {
    console.error("generate", genRes.status, genText.slice(0, 600));
    process.exit(1);
  }
  const genJson = JSON.parse(genText);
  const jobId = genJson.data?.job_id ?? genJson.data?.jobId;
  if (!jobId) {
    console.error("no job id", genText.slice(0, 500));
    process.exit(1);
  }
  console.log("jobId", jobId);

  const started = Date.now();
  while (Date.now() - started < 360000) {
    const url = `${BASE}/flux/fetch?jobId=${encodeURIComponent(jobId)}`;
    const res = await fetch(url, { headers: { "TT-API-KEY": apiKey } });
    const text = await res.text();
    if (!res.ok) {
      console.error("fetch", res.status, text.slice(0, 400));
      process.exit(1);
    }
    const json = JSON.parse(text);
    const st = (json.status ?? "").trim();
    if (st === "FAILED") {
      console.error("task failed", text.slice(0, 500));
      process.exit(1);
    }
    if (st === "SUCCESS" && json.data?.imageUrl) {
      console.log("OK imageUrl", json.data.imageUrl);
      process.exit(0);
    }
    await sleep(2000);
  }
  console.error("timeout");
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
