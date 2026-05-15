/**
 * AI sticker generation: fal-ai/flux/schnell → fal-ai/imageutils/rembg
 * Keyword parsing uses semantic slot extraction (color + style + subject),
 * not exhaustive enumeration — handles arbitrary combinations like「ピンク星」「青いハート」etc.
 */

const FAL_QUEUE_BASE = "https://queue.fal.run";
const FLUX_SCHNELL = "fal-ai/flux/schnell";
const RMBG_MODEL = "fal-ai/imageutils/rembg";

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

// ── Semantic slot dictionaries ────────────────────────────────────────────

/** Color words (JP/CN/EN) → English color name */
const COLOR_VOCAB: [RegExp, string][] = [
  [/ピンク|桃色|ももいろ|粉|粉色|pink/i, "pink"],
  [/赤|あか|紅|红|red/i, "red"],
  [/青|あお|蓝|蓝色|blue/i, "blue"],
  [/緑|みどり|绿|绿色|green/i, "green"],
  [/黄|きいろ|黄色|黄色い|黄|yellow/i, "yellow"],
  [/紫|むらさき|紫色|purple|violet/i, "purple"],
  [/オレンジ|橙|橙色|orange/i, "orange"],
  [/白|しろ|白色|白い|白|white/i, "white"],
  [/黒|くろ|黒色|黒い|黑|black/i, "black"],
  [/金|きん|ゴールド|金色|gold/i, "gold"],
  [/銀|ぎん|シルバー|银|silver/i, "silver"],
  [/水色|みずいろ|sky blue|空色/i, "sky blue"],
  [/虹|にじ|rainbow/i, "rainbow-colored"],
  [/茶|ちゃ|茶色|棕|brown/i, "brown"],
];

/** Style/feel modifiers → English style phrase */
const STYLE_VOCAB: [RegExp, string][] = [
  [/かわいい|可愛い|可愛|cute|kawaii/i, "kawaii cute"],
  [/キラキラ|きらきら|輝く|sparkl|glitter/i, "sparkling glittery"],
  [/シンプル|simple|シンプル/i, "simple minimal"],
  [/リアル|realistic|写実/i, "realistic"],
  [/ファンシー|fancy/i, "fancy"],
  [/レトロ|retro|昭和/i, "retro"],
  [/モダン|modern|現代/i, "modern"],
  [/大きい|おおきい|big|large/i, "large"],
  [/小さい|ちいさい|small|tiny/i, "small"],
  [/丸い|まるい|round/i, "round"],
];

/** Subject/object → English visual description */
const SUBJECT_VOCAB: [RegExp, string][] = [
  // Shapes
  [/星|ほし|スター|star/i, "five-pointed star shape"],
  [/ハート|心|こころ|heart/i, "heart shape"],
  [/丸|まる|サークル|circle/i, "circle shape"],
  [/三角|さんかく|triangle/i, "triangle shape"],
  [/四角|しかく|square/i, "square shape"],
  [/矢印|やじるし|arrow/i, "arrow"],
  [/王冠|おうかん|クラウン|crown/i, "crown"],
  [/ダイヤ|ダイヤモンド|diamond/i, "diamond shape"],
  // Nature & flowers
  [/桜|さくら|cherry blossom/i, "cherry blossom flower"],
  [/花|はな|flower/i, "flower"],
  [/月|つき|moon/i, "crescent moon"],
  [/太陽|たいよう|sun/i, "sun"],
  [/雪|ゆき|snowflake/i, "snowflake"],
  [/雲|くも|cloud/i, "cloud"],
  [/虹|にじ|rainbow/i, "rainbow arc"],
  [/葉|は|leaf/i, "leaf"],
  [/木|き|tree/i, "tree"],
  [/山|やま|mountain/i, "mountain"],
  [/波|なみ|wave/i, "wave"],
  [/炎|ほのお|火|fire|flame/i, "flame fire"],
  [/稲妻|いなずま|雷|lightning/i, "lightning bolt"],
  // Animals
  [/猫|ねこ|cat|neko/i, "cute cartoon cat face"],
  [/犬|いぬ|dog/i, "cute cartoon dog face"],
  [/うさぎ|兎|rabbit/i, "cute rabbit"],
  [/くま|クマ|熊|bear/i, "cute bear face"],
  [/パンダ|panda/i, "cute panda face"],
  [/ペンギン|penguin/i, "cute penguin"],
  [/鳥|とり|bird/i, "cute bird"],
  [/魚|さかな|fish/i, "cute fish"],
  [/蝶|ちょう|butterfly/i, "butterfly"],
  // Fan / culture
  [/推し|おし|oshi/i, "shining star with sparkles"],
  [/応援|おうえん|cheer/i, "cheerleading pompoms"],
  [/音符|おんぷ|musical note|music/i, "musical note"],
  [/マイク|mic|microphone/i, "microphone"],
  [/カメラ|camera/i, "camera"],
  [/フィルム|film/i, "film strip"],
  // Objects
  [/リボン|ribbon/i, "ribbon bow"],
  [/プレゼント|gift/i, "gift box"],
  [/ケーキ|cake/i, "birthday cake"],
  [/花火|はなび|fireworks/i, "fireworks burst"],
  [/バラ|rose/i, "rose flower"],
  [/チューリップ|tulip/i, "tulip flower"],
  [/いちご|苺|strawberry/i, "strawberry"],
  [/りんご|apple/i, "apple"],
  [/指輪|ring|リング/i, "ring"],
  [/ダンス|dance|踊り/i, "dancing figure"],
];

// ── Semantic slot extraction ───────────────────────────────────────────────

function extractSlot<T>(text: string, vocab: [RegExp, string][]): string | undefined {
  for (const [pattern, value] of vocab) {
    if (pattern.test(text)) return value;
  }
  return undefined;
}

function buildStickerPrompt(keyword: string): string {
  const color = extractSlot(keyword, COLOR_VOCAB);
  const style = extractSlot(keyword, STYLE_VOCAB);
  const subject = extractSlot(keyword, SUBJECT_VOCAB);

  let visualDesc: string;
  if (subject) {
    // Compose: [color] [style] [subject]
    const parts = [color, style, subject].filter(Boolean);
    visualDesc = parts.join(" ");
  } else {
    // Unknown subject — pass keyword as-is with color/style hints
    const parts = [color, style, `"${keyword}" icon`].filter(Boolean);
    visualDesc = parts.join(" ");
  }

  return (
    `A single sticker of ${visualDesc}, ` +
    `flat vector illustration style, bold black outline, ` +
    `solid white background, bright vibrant colors, ` +
    `simple clean design, centered, no text, no letters, no shadows`
  );
}

// ── fal.ai queue helper ───────────────────────────────────────────────────

async function falSubmitAndWait(
  model: string,
  payload: Record<string, unknown>,
  apiKey: string,
  timeoutMs = 60_000,
  pollIntervalMs = 1500
): Promise<Record<string, unknown>> {
  const submitRes = await fetch(`${FAL_QUEUE_BASE}/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const submitText = await submitRes.text();
  if (!submitRes.ok) {
    throw new Error(`${model} submit failed ${submitRes.status}: ${submitText.slice(0, 400)}`);
  }

  const { request_id, status_url } = JSON.parse(submitText) as {
    request_id: string;
    status_url?: string;
  };
  if (!request_id) throw new Error(`${model}: missing request_id`);

  const pollBase = status_url ?? `${FAL_QUEUE_BASE}/${model}/requests/${request_id}/status`;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const stRes = await fetch(`${pollBase}?logs=0`, {
      headers: { Authorization: `Key ${apiKey}` },
    });
    const st = JSON.parse(await stRes.text()) as {
      status: string;
      response_url?: string;
      error?: string;
    };

    if (st.status === "FAILED") throw new Error(`${model} failed: ${st.error ?? "unknown"}`);
    if (st.status === "COMPLETED") {
      const resUrl = st.response_url ?? `${FAL_QUEUE_BASE}/${model}/requests/${request_id}`;
      const resText = await (
        await fetch(resUrl, { headers: { Authorization: `Key ${apiKey}` } })
      ).text();
      return JSON.parse(resText) as Record<string, unknown>;
    }

    await sleep(pollIntervalMs);
  }

  throw new Error(`${model}: timeout after ${timeoutMs / 1000}s`);
}

// ── Public API ────────────────────────────────────────────────────────────

export interface StickerGenResult {
  imageUrl: string;
}

export async function generateSticker(
  keyword: string,
  apiKey: string
): Promise<StickerGenResult> {
  const prompt = buildStickerPrompt(keyword);

  const genResult = await falSubmitAndWait(
    FLUX_SCHNELL,
    {
      prompt,
      image_size: "square",
      num_inference_steps: 4,
      num_images: 1,
      enable_safety_checker: false,
    },
    apiKey,
    60_000,
    1500
  );

  type FalImage = { url: string };
  const images = (genResult.images ?? (genResult.data as Record<string, unknown>)?.images) as
    | FalImage[]
    | undefined;
  const rawUrl = images?.[0]?.url;
  if (!rawUrl) throw new Error("sticker gen: no image url from Flux");

  const rmbgResult = await falSubmitAndWait(
    RMBG_MODEL,
    { image_url: rawUrl },
    apiKey,
    60_000,
    1500
  );

  type RmbgImage = { url: string };
  const rmbgImage = (
    rmbgResult.image ?? (rmbgResult.data as Record<string, unknown>)?.image
  ) as RmbgImage | undefined;
  const finalUrl = rmbgImage?.url;
  if (!finalUrl) throw new Error("sticker gen: no image url from rmbg");

  return { imageUrl: finalUrl };
}
