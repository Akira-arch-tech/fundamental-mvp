import type { AgentState, SSEEvent, OrderData } from "./types";
import { parseIntent, extractSize, extractQuantity } from "./intent";
import { buildAcrylicPrompt, buildTshirtPrompt } from "./prompt-builder";
import { falGenerate } from "./fal-client";

const ACRYLIC_PRICES: Record<string, number> = {
  "L版 (10cm)": 850,
  "LL版 (15cm)": 1200,
  "DX版 (20cm)": 1800,
};

const TSHIRT_PRICES: Record<string, number> = {
  S: 2800,
  M: 2800,
  L: 2800,
  XL: 3200,
  XXL: 3500,
};

function genOrderId(): string {
  return "FUN-" + Date.now().toString(36).toUpperCase().slice(-6);
}

function lookupPrice(priceMap: Record<string, number>, size: string): number {
  for (const [k, v] of Object.entries(priceMap)) {
    if (size.includes(k) || k.includes(size)) return v;
  }
  return Object.values(priceMap)[0] ?? 0;
}

export async function* runAgent(
  message: string,
  state: AgentState,
): AsyncGenerator<SSEEvent> {
  const falKey = process.env.FAL_KEY ?? "";
  const intent = parseIntent(message, state);

  // ── WELCOME / GREETING ──────────────────────────────────────────────────
  if (state.step === "welcome" || intent.type === "greeting") {
    yield { type: "text", content: "こんにちは！FUNDAMENTALへようこそ🎉\n\nどんなグッズを作りたいですか？" };
    yield {
      type: "quick_replies",
      items: [
        { label: "🎴 アクリルスタンド", value: "アクリルスタンド" },
        { label: "👕 Tシャツ", value: "Tシャツ" },
      ],
    };
    yield { type: "state", patch: { step: "product_select" } };
    yield { type: "done" };
    return;
  }

  // ── PRODUCT SELECTION ──────────────────────────────────────────────────
  if (intent.type === "select_acrylic") {
    yield { type: "state", patch: { productType: "acrylic_standee", step: "design_describe" } };
    yield {
      type: "text",
      content:
        "アクリルスタンドですね！✨\n\nどんなデザインにしたいですか？\n推しのテーマ、好きな色、イメージなどを自由に教えてください。\n\n💡 例：「ホロライブのすいせい、青い星空テーマ、キラキラした感じで」",
    };
    yield { type: "done" };
    return;
  }

  if (intent.type === "select_tshirt") {
    yield { type: "state", patch: { productType: "tshirt", step: "design_describe" } };
    yield {
      type: "text",
      content:
        "Tシャツですね！👕\n\nどんなデザインにしたいですか？\nブランドイメージ、色、テーマを教えてください。\n\n💡 例：「黒×ゴールドでミニマルなロゴデザイン、クールな感じで」",
    };
    yield { type: "done" };
    return;
  }

  // ── DESIGN DESCRIPTION → GENERATE ────────────────────────────────────
  if (
    intent.type === "describe_design" ||
    (state.step === "design_describe" && intent.type !== "confirm" && intent.type !== "refine")
  ) {
    const productType = state.productType;
    if (!productType) {
      yield { type: "text", content: "まずグッズの種類を選んでください！" };
      yield {
        type: "quick_replies",
        items: [
          { label: "🎴 アクリルスタンド", value: "アクリルスタンド" },
          { label: "👕 Tシャツ", value: "Tシャツ" },
        ],
      };
      yield { type: "done" };
      return;
    }

    const prompt =
      productType === "acrylic_standee"
        ? buildAcrylicPrompt(message)
        : buildTshirtPrompt(message);

    yield { type: "state", patch: { step: "generating", designPrompt: prompt } };
    yield {
      type: "text",
      content: "デザインを生成しています...✨\n少々お待ちください（約10〜20秒）",
    };
    yield { type: "generating" };

    try {
      const result = await falGenerate(prompt, falKey);
      yield { type: "state", patch: { step: "design_review", designUrl: result.imageUrl } };
      yield { type: "image", url: result.imageUrl };
      yield { type: "text", content: "生成できました！🎨\nいかがでしょうか？" };
      yield {
        type: "quick_replies",
        items: [
          { label: "✅ このデザインで進める", value: "確認、このデザインで進めます" },
          { label: "🔄 デザインを調整する", value: "もう少し変えてください" },
        ],
      };
    } catch {
      yield {
        type: "error",
        message: "画像の生成に失敗しました。もう一度お試しください。",
      };
    }

    yield { type: "done" };
    return;
  }

  // ── REFINE ────────────────────────────────────────────────────────────
  if (intent.type === "refine") {
    yield { type: "state", patch: { step: "design_describe" } };
    yield {
      type: "text",
      content:
        "わかりました！どのように変えますか？🔄\n\n変えたいポイントを教えてください。\n例：「もっと明るく」「花のモチーフを追加」「色を紫に」",
    };
    yield { type: "done" };
    return;
  }

  // ── CONFIRM DESIGN → MOCKUP ───────────────────────────────────────────
  if (intent.type === "confirm" && state.step === "design_review") {
    if (!state.designUrl || !state.productType) {
      yield { type: "text", content: "先にデザインを生成してください。" };
      yield { type: "done" };
      return;
    }

    yield { type: "state", patch: { step: "mockup_ready" } };
    yield { type: "text", content: "商品プレビューを作成しています...🎴" };
    yield {
      type: "mockup",
      data: { productType: state.productType, designUrl: state.designUrl },
    };

    if (state.productType === "acrylic_standee") {
      yield {
        type: "text",
        content: "アクリルスタンドのプレビューです！✨\n\nサイズをお選びください：",
      };
      yield {
        type: "quick_replies",
        items: [
          { label: "🔹 L版 (10cm)  ¥850", value: "L版" },
          { label: "🔷 LL版 (15cm) ¥1,200", value: "LL版" },
          { label: "💠 DX版 (20cm) ¥1,800", value: "DX版" },
        ],
      };
    } else {
      yield {
        type: "text",
        content: "Tシャツのプレビューです！👕\n\nサイズをお選びください：",
      };
      yield {
        type: "quick_replies",
        items: [
          { label: "S", value: "S" },
          { label: "M", value: "M" },
          { label: "L", value: "L" },
          { label: "XL", value: "XL" },
          { label: "XXL", value: "XXL" },
        ],
      };
    }

    yield { type: "done" };
    return;
  }

  // ── SIZE SELECTION ────────────────────────────────────────────────────
  if (intent.type === "select_size" || (state.step === "mockup_ready" && extractSize(message))) {
    const size = intent.size ?? extractSize(message);
    if (!size) {
      yield { type: "text", content: "サイズを選んでください。" };
      yield { type: "done" };
      return;
    }
    yield { type: "state", patch: { step: "size_selected", size } };
    yield {
      type: "text",
      content: `${size}ですね！✅\n\n数量はいくつご希望ですか？\n（例：2個、5枚）`,
    };
    yield { type: "done" };
    return;
  }

  // ── QUANTITY → ORDER SUMMARY ──────────────────────────────────────────
  if (intent.type === "set_quantity" || (state.step === "size_selected" && extractQuantity(message))) {
    const qty = intent.quantity ?? extractQuantity(message) ?? 1;
    const productType = state.productType!;
    const size = state.size ?? (productType === "acrylic_standee" ? "L版 (10cm)" : "M");
    const priceMap = productType === "acrylic_standee" ? ACRYLIC_PRICES : TSHIRT_PRICES;
    const unitPrice = lookupPrice(priceMap, size);
    const totalPrice = unitPrice * qty;
    const productLabel = productType === "acrylic_standee" ? "アクリルスタンド" : "Tシャツ";

    yield { type: "state", patch: { step: "order_confirm", quantity: qty } };
    yield {
      type: "text",
      content: [
        "ご注文内容をご確認ください：",
        "",
        `📦 商品：${productLabel}`,
        `📐 サイズ：${size}`,
        `🔢 数量：${qty}個`,
        `💴 単価：¥${unitPrice.toLocaleString()}`,
        `💰 合計：¥${totalPrice.toLocaleString()}`,
        "",
        "⏰ 発送予定：7〜10営業日",
      ].join("\n"),
    };
    yield {
      type: "quick_replies",
      items: [
        { label: "✅ 注文を確定する", value: "注文を確定します" },
        { label: "📝 内容を変更する", value: "変更したいです" },
      ],
    };
    yield { type: "done" };
    return;
  }

  // ── PLACE ORDER ───────────────────────────────────────────────────────
  if (intent.type === "confirm" && state.step === "order_confirm") {
    const productType = state.productType ?? "acrylic_standee";
    const size = state.size ?? (productType === "acrylic_standee" ? "L版 (10cm)" : "M");
    const qty = state.quantity ?? 1;
    const priceMap = productType === "acrylic_standee" ? ACRYLIC_PRICES : TSHIRT_PRICES;
    const unitPrice = lookupPrice(priceMap, size);

    const orderData: OrderData = {
      orderId: genOrderId(),
      productType,
      size,
      quantity: qty,
      unitPrice,
      totalPrice: unitPrice * qty,
      estimatedDays: "7〜10営業日",
    };

    yield { type: "state", patch: { step: "order_complete" } };
    yield { type: "order", data: orderData };
    yield {
      type: "text",
      content:
        "ご注文ありがとうございました！🎉\n\n製作を開始します。進捗状況はLINEまたはメールでお知らせします。\nまた何かあればいつでもご相談ください！",
    };
    yield { type: "done" };
    return;
  }

  // ── FALLBACK ──────────────────────────────────────────────────────────
  yield {
    type: "text",
    content:
      "申し訳ありません、もう少し詳しく教えていただけますか？\nどんなグッズを作りたいか教えてください。",
  };
  yield {
    type: "quick_replies",
    items: [
      { label: "🎴 アクリルスタンド", value: "アクリルスタンド" },
      { label: "👕 Tシャツ", value: "Tシャツ" },
    ],
  };
  yield { type: "done" };
}
