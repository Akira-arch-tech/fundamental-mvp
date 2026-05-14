/**
 * fal.ai background removal: fal-ai/imageutils/rembg
 * Input: image URL or base64 data URL
 * Output: transparent PNG URL
 */

const FAL_QUEUE_BASE = "https://queue.fal.run";
const RMBG_MODEL = "fal-ai/imageutils/rembg";

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export interface RmbgResult {
  imageUrl: string;
}

export async function removeBackground(imageUrl: string, apiKey: string): Promise<RmbgResult> {
  const submitRes = await fetch(`${FAL_QUEUE_BASE}/${RMBG_MODEL}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ image_url: imageUrl }),
  });

  const submitText = await submitRes.text();
  if (!submitRes.ok) {
    throw new Error(`rmbg submit failed ${submitRes.status}: ${submitText.slice(0, 400)}`);
  }

  const { request_id, status_url } = JSON.parse(submitText) as {
    request_id: string;
    status_url?: string;
    response_url?: string;
  };

  if (!request_id) throw new Error(`rmbg: missing request_id`);

  const pollBase = status_url ?? `${FAL_QUEUE_BASE}/${RMBG_MODEL}/requests/${request_id}/status`;
  const maxWait = 60_000;
  const started = Date.now();

  while (Date.now() - started < maxWait) {
    const stRes = await fetch(`${pollBase}?logs=0`, {
      headers: { Authorization: `Key ${apiKey}` },
    });
    const stJson = JSON.parse(await stRes.text()) as { status: string; response_url?: string; error?: string };

    if (stJson.status === "FAILED") {
      throw new Error(`rmbg failed: ${stJson.error ?? "unknown"}`);
    }
    if (stJson.status === "COMPLETED") {
      const resUrl = stJson.response_url ?? `${FAL_QUEUE_BASE}/${RMBG_MODEL}/requests/${request_id}`;
      const resJson = JSON.parse(await (await fetch(resUrl, { headers: { Authorization: `Key ${apiKey}` } })).text()) as {
        image?: { url: string };
        data?: { image?: { url: string } };
      };
      const url = resJson.image?.url ?? resJson.data?.image?.url;
      if (!url) throw new Error("rmbg: no image url in response");
      return { imageUrl: url };
    }

    await sleep(1500);
  }

  throw new Error("rmbg: timeout after 60s");
}
