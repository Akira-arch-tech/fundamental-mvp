/**
 * fal.ai 4x upscaler: fal-ai/aura-sr (fast) or fal-ai/clarity-upscaler (quality)
 */

const FAL_QUEUE_BASE = "https://queue.fal.run";
const UPSCALE_MODEL = "fal-ai/aura-sr";

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export interface UpscaleResult {
  imageUrl: string;
}

export async function upscaleImage(imageUrl: string, apiKey: string): Promise<UpscaleResult> {
  const submitRes = await fetch(`${FAL_QUEUE_BASE}/${UPSCALE_MODEL}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ image_url: imageUrl, upscaling_factor: 4 }),
  });

  const submitText = await submitRes.text();
  if (!submitRes.ok) {
    throw new Error(`upscale submit failed ${submitRes.status}: ${submitText.slice(0, 400)}`);
  }

  const { request_id, status_url } = JSON.parse(submitText) as {
    request_id: string;
    status_url?: string;
  };
  if (!request_id) throw new Error("upscale: missing request_id");

  const pollBase = status_url ?? `${FAL_QUEUE_BASE}/${UPSCALE_MODEL}/requests/${request_id}/status`;
  const maxWait = 90_000;
  const started = Date.now();

  while (Date.now() - started < maxWait) {
    const stRes = await fetch(`${pollBase}?logs=0`, {
      headers: { Authorization: `Key ${apiKey}` },
    });
    const stJson = JSON.parse(await stRes.text()) as { status: string; response_url?: string; error?: string };

    if (stJson.status === "FAILED") {
      throw new Error(`upscale failed: ${stJson.error ?? "unknown"}`);
    }
    if (stJson.status === "COMPLETED") {
      const resUrl = stJson.response_url ?? `${FAL_QUEUE_BASE}/${UPSCALE_MODEL}/requests/${request_id}`;
      const resJson = JSON.parse(await (await fetch(resUrl, { headers: { Authorization: `Key ${apiKey}` } })).text()) as {
        image?: { url: string };
        output?: { image?: { url: string } };
        data?: { image?: { url: string } };
      };
      const url = resJson.image?.url ?? resJson.output?.image?.url ?? resJson.data?.image?.url;
      if (!url) throw new Error("upscale: no image url in response");
      return { imageUrl: url };
    }

    await sleep(2000);
  }

  throw new Error("upscale: timeout after 90s");
}
