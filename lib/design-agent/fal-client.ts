const FAL_BASE = "https://queue.fal.run";
const DEFAULT_MODEL = "fal-ai/flux/dev";
const POLL_MS = 2000;
const TIMEOUT_MS = 120_000;

export interface FalResult {
  imageUrl: string;
  requestId: string;
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function extractImageUrl(payload: unknown): string | null {
  const o = payload as Record<string, unknown>;
  const root = (o.data ?? o) as Record<string, unknown>;
  const images = root.images as Array<{ url: string }> | undefined;
  if (Array.isArray(images) && images[0]?.url) return images[0].url;
  return null;
}

export async function falGenerate(
  prompt: string,
  apiKey: string,
  modelId = DEFAULT_MODEL,
): Promise<FalResult> {
  if (!apiKey) {
    // Graceful fallback for demo without key
    const seed = prompt.slice(0, 16).replace(/\W/g, "") || "demo";
    return {
      imageUrl: `https://picsum.photos/seed/${seed}/512/680`,
      requestId: "mock-" + Date.now().toString(36),
    };
  }

  const submitRes = await fetch(`${FAL_BASE}/${modelId}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      num_images: 1,
      image_size: "portrait_4_3",
      enable_safety_checker: false,
      guidance_scale: 3.5,
      num_inference_steps: 28,
    }),
  });

  if (!submitRes.ok) {
    const txt = await submitRes.text();
    throw new Error(`fal submit ${submitRes.status}: ${txt.slice(0, 200)}`);
  }

  const { request_id: requestId } = (await submitRes.json()) as { request_id: string };
  if (!requestId) throw new Error("fal: no request_id");

  const statusUrl = `${FAL_BASE}/${modelId}/requests/${requestId}/status?logs=0`;
  const started = Date.now();

  while (Date.now() - started < TIMEOUT_MS) {
    await sleep(POLL_MS);

    const stRes = await fetch(statusUrl, {
      headers: { Authorization: `Key ${apiKey}` },
    });
    const st = (await stRes.json()) as { status: string; error?: string };

    if (st.status === "FAILED") throw new Error(`fal failed: ${st.error ?? "unknown"}`);

    if (st.status === "COMPLETED") {
      const resRes = await fetch(`${FAL_BASE}/${modelId}/requests/${requestId}`, {
        headers: { Authorization: `Key ${apiKey}` },
      });
      const resJson = await resRes.json();
      const url = extractImageUrl(resJson);
      if (!url) throw new Error("fal: no image in result");
      return { imageUrl: url, requestId };
    }
  }

  throw new Error(`fal: timeout after ${TIMEOUT_MS}ms`);
}
