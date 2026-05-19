import { enqueueAigcGeneration, getAigcJob } from "@/lib/aigc-job-service";
import type { ProductType } from "./types";
import { falGenerate } from "./fal-client";

const PRODUCT_TO_SEED_ID: Record<ProductType, string> = {
  acrylic_standee: "p4",
  badge: "p1",
  phone_case: "p1",
  clear_file: "p1",
  tshirt: "p1",
};

const POLL_MS = 1500;
const TIMEOUT_MS = 90_000;

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/** Design Agent 用：优先走 AIGC 网关，失败则 FAL / placeholder */
export async function generateDesignImage(
  prompt: string,
  productType: ProductType,
  falKey: string,
): Promise<{ imageUrl: string; source: "aigc" | "fal" | "placeholder" }> {
  const product_id = PRODUCT_TO_SEED_ID[productType] ?? "p4";

  try {
    const job = await enqueueAigcGeneration({
      product_id,
      mode: "txt2img",
      prompt,
      negative_prompt: "low quality, blurry, watermark, text overlay",
      aspect_ratio: "3:4",
      candidate_count: 1,
      seed: null,
      strength: null,
      reference_asset_ids: [],
      references: null,
      composition_mode: null,
    });

    const started = Date.now();
    while (Date.now() - started < TIMEOUT_MS) {
      const current = await getAigcJob(job.job_id, { runLazyProcessor: true });
      if (!current) break;

      if (current.status === "failed") break;

      if (current.status === "ready" && current.candidates[0]?.url) {
        return { imageUrl: current.candidates[0].url, source: "aigc" };
      }

      await sleep(POLL_MS);
    }
  } catch {
    // fall through to FAL
  }

  try {
    const result = await falGenerate(prompt, falKey);
    return { imageUrl: result.imageUrl, source: falKey ? "fal" : "placeholder" };
  } catch {
    const seed = prompt.slice(0, 16).replace(/\W/g, "") || "demo";
    return {
      imageUrl: `https://picsum.photos/seed/${seed}/512/680`,
      source: "placeholder",
    };
  }
}
