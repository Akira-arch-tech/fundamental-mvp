#!/usr/bin/env node
/**
 * 本地烟测：直连 fal Queue（不启动 Next）。
 * 用法：export FAL_KEY=... && node scripts/aigc-smoke-fal.mjs
 * 可选：FAL_MODEL_ID（默认 fal-ai/flux/schnell）
 */
const FAL_QUEUE_BASE = "https://queue.fal.run";
const key = process.env.FAL_KEY?.trim();
const modelId = process.env.FAL_MODEL_ID?.trim() || "fal-ai/flux/schnell";

if (!key) {
  console.error("Missing FAL_KEY");
  process.exit(1);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const submitRes = await fetch(`${FAL_QUEUE_BASE}/${modelId}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt: "smoke test minimalist icon flat vector blue square", num_images: 1 }),
  });
  const submitText = await submitRes.text();
  if (!submitRes.ok) {
    console.error("submit", submitRes.status, submitText.slice(0, 600));
    process.exit(1);
  }
  const submitJson = JSON.parse(submitText);
  const requestId = submitJson.request_id;
  if (!requestId) {
    console.error("no request_id", submitText);
    process.exit(1);
  }
  console.log("request_id", requestId);

  const pollBase = submitJson.status_url ?? `${FAL_QUEUE_BASE}/${modelId}/requests/${requestId}/status`;
  const pollUrl = new URL(pollBase);
  pollUrl.searchParams.set("logs", "0");

  const started = Date.now();
  while (Date.now() - started < 300000) {
    const stRes = await fetch(pollUrl.toString(), { headers: { Authorization: `Key ${key}` } });
    const stText = await stRes.text();
    if (!stRes.ok) {
      console.error("status", stRes.status, stText.slice(0, 400));
      process.exit(1);
    }
    const st = JSON.parse(stText);
    if (st.status === "COMPLETED") {
      const resUrl = st.response_url ?? `${FAL_QUEUE_BASE}/${modelId}/requests/${requestId}`;
      const resRes = await fetch(resUrl, { headers: { Authorization: `Key ${key}` } });
      const resText = await resRes.text();
      if (!resRes.ok) {
        console.error("result", resRes.status, resText.slice(0, 400));
        process.exit(1);
      }
      const data = JSON.parse(resText);
      const imgs = data.images ?? data.data?.images;
      console.log("OK images", JSON.stringify(imgs?.slice?.(0, 1) ?? imgs, null, 2));
      process.exit(0);
    }
    if (st.status === "FAILED" || st.error) {
      console.error("FAILED", stText.slice(0, 500));
      process.exit(1);
    }
    await sleep(1500);
  }
  console.error("timeout");
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
