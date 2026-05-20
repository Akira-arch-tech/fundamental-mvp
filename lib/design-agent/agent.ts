import type { AgentState, SSEEvent, OrderData, ProductType } from "./types";
import { parseIntent, extractSize, extractQuantity } from "./intent";
import { buildAcrylicPrompt, buildTshirtPrompt } from "./prompt-builder";
import { generateDesignImage } from "./aigc-generate-client";
import { generateCrowdfundingCopy } from "./copywriting-generator";
import { buildCommunityPack, formatCommunityPackForChat } from "./community-kit";
import { createCheckoutPreview } from "./customization-bridge";
import {
  DEMO_CHECKOUT,
  DEMO_CROWDFUNDING_COPY,
  DEMO_DESIGN_IMAGE_URL,
} from "./demo-constants";

// ── 价格表 ────────────────────────────────────────────────────────────────
const ACRYLIC_PRICES: Record<string, number> = {
  "L版 (10cm)": 850,
  "LL版 (15cm)": 1200,
  "DX版 (20cm)": 1800,
};
const TSHIRT_PRICES: Record<string, number> = { S: 2800, M: 2800, L: 2800, XL: 3200, XXL: 3500 };
const BADGE_PRICES: Record<string, number> = { "44mm": 330, "57mm": 440, "75mm": 550 };
const PHONE_PRICES: Record<string, number> = { "iPhone": 2750, "Android": 2750 };
const CLEAR_FILE_PRICES: Record<string, number> = { "A4": 880 };

const PRODUCT_LABEL: Record<string, string> = {
  acrylic_standee: "アクリルスタンド",
  tshirt: "Tシャツ",
  badge: "缶バッジ",
  phone_case: "スマホケース",
  clear_file: "クリアファイル",
};

function getPriceMap(productType: string): Record<string, number> {
  const maps: Record<string, Record<string, number>> = {
    acrylic_standee: ACRYLIC_PRICES,
    tshirt: TSHIRT_PRICES,
    badge: BADGE_PRICES,
    phone_case: PHONE_PRICES,
    clear_file: CLEAR_FILE_PRICES,
  };
  return maps[productType] ?? ACRYLIC_PRICES;
}

function genOrderId(): string {
  return "FUN-" + Date.now().toString(36).toUpperCase().slice(-6);
}

function lookupPrice(priceMap: Record<string, number>, size: string): number {
  for (const [k, v] of Object.entries(priceMap)) {
    if (size.includes(k) || k.includes(size)) return v;
  }
  return Object.values(priceMap)[0] ?? 0;
}

function hasPocochaPlatform(platforms?: string[]): boolean {
  if (!platforms?.length) return false;
  return platforms.some((p) => /pococha|ポコチャ|直播/i.test(p));
}

async function emitB2BCommunityPack(
  state: AgentState,
  message: string,
): Promise<SSEEvent[]> {
  if (state.mode !== "b2b" || state.communityPackShown || !state.productType) return [];

  const pack = buildCommunityPack({
    streamerStyle: state.streamerStyle,
    productType: state.productType,
    communityPlatforms: state.communityPlatforms,
    designTheme: state.designPrompt ?? message,
  });

  const events: SSEEvent[] = [
    { type: "community_pack", data: pack },
    {
      type: "text",
      content: formatCommunityPackForChat(pack),
    },
    { type: "state", patch: { communityPackShown: true } },
  ];

  if (hasPocochaPlatform(state.communityPlatforms)) {
    events.push({
      type: "virtual_gift_hint",
      data: {
        mockUrl: "/pococha-virtual-gift",
        giftName: "推し限定バーチャルギフト（概念）",
      },
    });
    events.push({
      type: "text",
      content:
        "📺 ポコチャ連携（Phase 2）：アプリ内バーチャルギフトの概念プレビューは下のカードからご覧いただけます。\n※正式API連携は DeNA / ポコチャ との共同パイロット後に提供予定です。",
    });
  }

  return events;
}

function buildPrompt(message: string, productType: string, streamerStyle?: string): string {
  const base = streamerStyle ? `${streamerStyle}。${message}` : message;
  if (productType === "acrylic_standee") return buildAcrylicPrompt(base);
  if (productType === "tshirt") return buildTshirtPrompt(base);
  return `${base}, merchandise design, clean white background, high quality, Japanese fan goods style`;
}

// ── メインAgent ─────────────────────────────────────────────────────────────
export async function* runAgent(
  message: string,
  state: AgentState,
): AsyncGenerator<SSEEvent> {
  const falKey = process.env.FAL_KEY ?? "";
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? "";
  const intent = parseIntent(message, state);

  // ── WELCOME (greeting only — UI already shows intro) ─────────────────
  if (intent.type === "greeting" && state.step === "welcome") {
    yield {
      type: "text",
      content:
        "こんにちは！FUNDAMENTAL AIグッズ制作へようこそ🎉\n\nどちらのモードをご利用ですか？",
    };
    yield {
      type: "quick_replies",
      items: [
        { label: "🏢 B2B（事務所・団長向け）", value: "B2B" },
        { label: "🛒 個人注文", value: "個人注文" },
      ],
    };
    yield { type: "state", patch: { step: "mode_select" } };
    yield { type: "done" };
    return;
  }

  if (state.step === "welcome") {
    yield { type: "state", patch: { step: "mode_select" } };
    state = { ...state, step: "mode_select" };
  }

  // ── MODE SELECT ────────────────────────────────────────────────────────
  if (state.step === "mode_select") {
    const isB2B = message.includes("B2B") || message.includes("事務所") || message.includes("団長");
    if (isB2B) {
      yield { type: "state", patch: { step: "b2b_streamer", mode: "b2b" } };
      yield {
        type: "text",
        content:
          "FUNDAMENTAL DA — Pococha 応援パートナーへようこそ！🏢✨\n\nAIが推しの絆を、実物グッズと（将来）アプリ内ギフトの両方で形にします。\n\n担当ライバーのスタイルを教えてください。\n\n💡 例：「Pocochaで活躍する女性ライバー。ピンク×ホワイトの可愛い系。ファンは10代〜20代女性が中心」",
      };
    } else {
      yield { type: "state", patch: { step: "product_select", mode: "c2c" } };
      yield {
        type: "text",
        content: "個人注文モードですね！✨\n\nどんなグッズを作りたいですか？",
      };
      yield {
        type: "quick_replies",
        items: [
          { label: "🎴 アクリルスタンド", value: "アクリルスタンド" },
          { label: "🎖️ 缶バッジ", value: "缶バッジ" },
          { label: "📱 スマホケース", value: "スマホケース" },
          { label: "📄 クリアファイル", value: "クリアファイル" },
          { label: "👕 Tシャツ", value: "Tシャツ" },
        ],
      };
    }
    yield { type: "done" };
    return;
  }

  // ── B2B STREAMER INFO ──────────────────────────────────────────────────
  if (state.step === "b2b_streamer") {
    yield { type: "state", patch: { step: "b2b_community", streamerStyle: message } };
    yield {
      type: "text",
      content:
        "ありがとうございます！✨\n\nファンコミュニティはどのプラットフォームをメインに使っていますか？（複数OK）",
    };
    yield {
      type: "quick_replies",
      items: [
        { label: "💬 LINE OpenChat", value: "LINE OpenChat" },
        { label: "🎮 Discord", value: "Discord" },
        { label: "🐦 Twitter/X", value: "Twitter/X" },
        { label: "📺 Pococha直播間", value: "Pococha" },
      ],
    };
    yield { type: "done" };
    return;
  }

  // ── B2B COMMUNITY → PRODUCT SELECT ────────────────────────────────────
  if (state.step === "b2b_community") {
    const platforms = message.split(/[、,，\s]+/).filter(Boolean);
    yield {
      type: "state",
      patch: { step: "product_select", communityPlatforms: platforms },
    };
    yield {
      type: "text",
      content:
        `${platforms.join("・")}コミュニティですね！💪\n\nクラウドファンディングで展開するグッズの種類を選んでください：`,
    };
    yield {
      type: "quick_replies",
      items: [
        { label: "🎴 アクリルスタンド（おすすめ）", value: "アクリルスタンド" },
        { label: "🎖️ 缶バッジ（おすすめ）", value: "缶バッジ" },
        { label: "📱 スマホケース", value: "スマホケース" },
        { label: "📄 クリアファイル", value: "クリアファイル" },
        { label: "👕 Tシャツ", value: "Tシャツ" },
      ],
    };
    yield { type: "done" };
    return;
  }

  // ── PRODUCT SELECTION ──────────────────────────────────────────────────
  const productMap: Record<string, string> = {
    "アクリルスタンド": "acrylic_standee",
    "缶バッジ": "badge",
    "スマホケース": "phone_case",
    "クリアファイル": "clear_file",
    "Tシャツ": "tshirt",
  };
  const selectedProduct = Object.keys(productMap).find((k) => message.includes(k));

  if (selectedProduct && (state.step === "product_select" || intent.type === "select_acrylic")) {
    const productType = productMap[selectedProduct];
    yield { type: "state", patch: { productType: productType as never, step: "design_describe" } };
    yield {
      type: "text",
      content:
        `${selectedProduct}ですね！✨\n\nどんなデザインにしたいですか？\n${state.streamerStyle ? `配信者のイメージ（${state.streamerStyle.slice(0, 30)}…）をベースに` : ""}テーマ・色・雰囲気を教えてください。\n\n💡 例：「青い星空と月モチーフ、キラキラしたファンタジー系」`,
    };
    yield { type: "done" };
    return;
  }

  // C2C legacy product select
  if (intent.type === "select_acrylic") {
    yield { type: "state", patch: { productType: "acrylic_standee", step: "design_describe" } };
    yield {
      type: "text",
      content:
        "アクリルスタンドですね！✨\n\nどんなデザインにしたいですか？\nテーマ・色・雰囲気を教えてください。\n\n💡 例：「ホロライブのすいせい、青い星空テーマ、キラキラした感じで」",
    };
    yield { type: "done" };
    return;
  }
  if (intent.type === "select_tshirt") {
    yield { type: "state", patch: { productType: "tshirt", step: "design_describe" } };
    yield {
      type: "text",
      content:
        "Tシャツですね！👕\n\nデザインのテーマ・色・スタイルを教えてください。\n\n💡 例：「黒×ゴールドでミニマルなロゴデザイン、クールな感じで」",
    };
    yield { type: "done" };
    return;
  }

  // ── DESIGN DESCRIPTION → GENERATE ─────────────────────────────────────
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
          { label: "🎖️ 缶バッジ", value: "缶バッジ" },
          { label: "👕 Tシャツ", value: "Tシャツ" },
        ],
      };
      yield { type: "done" };
      return;
    }

    const prompt = buildPrompt(message, productType, state.streamerStyle);
    yield { type: "state", patch: { step: "generating", designPrompt: prompt } };
    yield {
      type: "text",
      content: state.demoMode
        ? "AIデザインを生成しています...✨\n（デモモード）"
        : "AIデザインを生成しています...✨\n少々お待ちください（約10〜20秒）",
    };
    yield { type: "generating" };

    let imageUrl: string;
    let sourceNote: string;
    if (state.demoMode) {
      await new Promise((r) => setTimeout(r, 900));
      imageUrl = DEMO_DESIGN_IMAGE_URL;
      sourceNote = "（デモモード・高品質サンプル）";
    } else {
      const result = await generateDesignImage(prompt, productType as ProductType, falKey);
      imageUrl = result.imageUrl;
      sourceNote =
        result.source === "aigc"
          ? "（FUNDAMENTAL AIGC ゲートウェイ）"
          : result.source === "fal"
            ? "（FAL）"
            : "（デモ用プレースホルダー）";
    }
    yield { type: "state", patch: { step: "design_review", designUrl: imageUrl } };
    yield { type: "image", url: imageUrl };
    yield {
      type: "text",
      content: `生成できました！🎨${sourceNote}\nいかがでしょうか？`,
    };
    yield {
      type: "quick_replies",
      items: [
        { label: "✅ このデザインで進める", value: "確認、このデザインで進めます" },
        { label: "🔄 デザインを調整する", value: "もう少し変えてください" },
      ],
    };
    yield { type: "done" };
    return;
  }

  // ── REFINE ─────────────────────────────────────────────────────────────
  if (intent.type === "refine") {
    yield { type: "state", patch: { step: "design_describe" } };
    yield {
      type: "text",
      content:
        "わかりました！🔄\n\nどのように変えますか？\n例：「もっと明るく」「花のモチーフを追加」「色を紫に」",
    };
    yield { type: "done" };
    return;
  }

  // ── CONFIRM DESIGN → MOCKUP ────────────────────────────────────────────
  if (intent.type === "confirm" && state.step === "design_review") {
    if (!state.designUrl || !state.productType) {
      yield { type: "text", content: "先にデザインを生成してください。" };
      yield { type: "done" };
      return;
    }

    const label = PRODUCT_LABEL[state.productType] ?? state.productType;
    yield { type: "state", patch: { step: "mockup_ready" } };
    yield { type: "text", content: `商品プレビューを作成しています...🎴` };
    yield { type: "mockup", data: { productType: state.productType, designUrl: state.designUrl } };

    // B2B mode → community kit + crowdfunding
    if (state.mode === "b2b") {
      for (const ev of await emitB2BCommunityPack(state, message)) {
        yield ev;
        if (ev.type === "state") {
          state = { ...state, ...ev.patch };
        }
      }

      yield {
        type: "text",
        content:
          `${label}のプレビューです！✨\n\n次に、クラウドファンディング（Kibidango / Campfire）用の\n日本語プロジェクト文案を自動生成しますか？`,
      };
      yield {
        type: "quick_replies",
        items: [
          { label: "📝 文案を生成する", value: "文案を生成してください" },
          { label: "⏭️ スキップして注文へ", value: "スキップ" },
        ],
      };
      yield { type: "state", patch: { step: "crowdfunding_copy" } };
    } else {
      // C2C mode → size selection
      yield {
        type: "text",
        content: `${label}のプレビューです！✨\n\nサイズをお選びください：`,
      };
      const priceMap = getPriceMap(state.productType);
      yield {
        type: "quick_replies",
        items: Object.entries(priceMap).map(([k, v]) => ({
          label: `${k}  ¥${v.toLocaleString()}`,
          value: k,
        })),
      };
      yield { type: "state", patch: { step: "size_selected" } };
    }
    yield { type: "done" };
    return;
  }

  // ── CROWDFUNDING COPY GENERATION ───────────────────────────────────────
  if (state.step === "crowdfunding_copy") {
    const skip = message.includes("スキップ") || message.includes("skip");
    const wantsSampleOrder = message.includes("サンプル");
    if (skip || wantsSampleOrder) {
      yield { type: "state", patch: { step: "size_selected" } };
      yield { type: "text", content: "わかりました！サイズをお選びください：" };
      const priceMap = getPriceMap(state.productType ?? "acrylic_standee");
      yield {
        type: "quick_replies",
        items: Object.entries(priceMap).map(([k, v]) => ({
          label: `${k}  ¥${v.toLocaleString()}`,
          value: k,
        })),
      };
      yield { type: "done" };
      return;
    }

    if (state.crowdfundingCopy) {
      yield {
        type: "text",
        content:
          "文案はすでに生成済みです。サンプル注文を続けるか、完了を選んでください。",
      };
      yield {
        type: "quick_replies",
        items: [
          { label: "✅ サンプル注文を作成", value: "サンプル注文" },
          { label: "🏁 完了", value: "完了" },
        ],
      };
      yield { type: "done" };
      return;
    }

    yield {
      type: "text",
      content: state.demoMode
        ? "クラウドファンディング文案を生成しています...📝\n（デモモード）"
        : "クラウドファンディング文案を生成しています...📝\n（Claude AIが日本語で作成します）",
    };
    yield { type: "generating" };

    const copy = state.demoMode
      ? DEMO_CROWDFUNDING_COPY
      : await generateCrowdfundingCopy(
          {
            streamerStyle: state.streamerStyle,
            productType: state.productType ?? "acrylic_standee",
            designDescription: state.designPrompt,
            communityPlatforms: state.communityPlatforms,
            targetAmount: 200000,
          },
          anthropicKey,
        );

    if (state.demoMode) {
      await new Promise((r) => setTimeout(r, 600));
    }

    yield { type: "state", patch: { crowdfundingCopy: copy } };
    yield { type: "copywriting", content: copy };

    if (state.designUrl && state.productType && !state.customizationId) {
      if (state.demoMode) {
        yield {
          type: "state",
          patch: { customizationId: DEMO_CHECKOUT.customization_id },
        };
        yield {
          type: "checkout_link",
          data: {
            customization_id: DEMO_CHECKOUT.customization_id,
            url: DEMO_CHECKOUT.url,
            label: DEMO_CHECKOUT.label,
          },
        };
        yield {
          type: "text",
          content:
            "チェックアウトプレビュー（デモ）を用意しました！🛒\n※実際の決済は事務所パイロット時に接続します。",
        };
      } else {
        try {
          const checkout = await createCheckoutPreview({
            productType: state.productType,
            designUrl: state.designUrl,
          });
          yield {
            type: "state",
            patch: { customizationId: checkout.customization_id },
          };
          yield {
            type: "checkout_link",
            data: {
              customization_id: checkout.customization_id,
              url: checkout.url,
              label: "チェックアウトプレビューを開く",
            },
          };
          yield {
            type: "text",
            content:
              "チェックアウトプレビューを用意しました！🛒\n下のボタンから、このデザインの決済画面を確認できます（customization_id 付き）。",
          };
        } catch {
          yield {
            type: "text",
            content:
              "※ チェックアウトプレビューの生成に失敗しました。サンプル注文フローは続行できます。",
          };
        }
      }
    }

    yield {
      type: "text",
      content:
        "文案が完成しました！📄✨\n上記のテキストをコピーして、KibidangoやCampfireのページ作成にお使いください。\n\n続けてサンプル注文も作成しますか？",
    };
    yield {
      type: "quick_replies",
      items: [
        { label: "✅ サンプル注文を作成", value: "サンプル注文" },
        { label: "🏁 完了", value: "完了" },
      ],
    };
    yield { type: "done" };
    return;
  }

  // ── SIZE SELECTION ─────────────────────────────────────────────────────
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

  // ── QUANTITY → ORDER SUMMARY ───────────────────────────────────────────
  if (
    intent.type === "set_quantity" ||
    (state.step === "size_selected" && extractQuantity(message))
  ) {
    const qty = intent.quantity ?? extractQuantity(message) ?? 1;
    const productType = state.productType ?? "acrylic_standee";
    const size = state.size ?? Object.keys(getPriceMap(productType))[0];
    const priceMap = getPriceMap(productType);
    const unitPrice = lookupPrice(priceMap, size);
    const totalPrice = unitPrice * qty;
    const label = PRODUCT_LABEL[productType] ?? productType;

    yield { type: "state", patch: { step: "order_confirm", quantity: qty } };
    yield {
      type: "text",
      content: [
        "ご注文内容をご確認ください：",
        "",
        `📦 商品：${label}`,
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

  // ── PLACE ORDER ────────────────────────────────────────────────────────
  if (intent.type === "confirm" && state.step === "order_confirm") {
    const productType = state.productType ?? "acrylic_standee";
    const size = state.size ?? Object.keys(getPriceMap(productType))[0];
    const qty = state.quantity ?? 1;
    const unitPrice = lookupPrice(getPriceMap(productType), size);

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

  // ── COMPLETE ───────────────────────────────────────────────────────────
  if (message.includes("完了") || message.includes("ありがとう")) {
    yield {
      type: "text",
      content:
        "ありがとうございました！🙏✨\nFUNDAMENTALをご利用いただき、ありがとうございます。\n\nご不明点はいつでもお問い合わせください。",
    };
    yield { type: "done" };
    return;
  }

  // ── FALLBACK ───────────────────────────────────────────────────────────
  yield {
    type: "text",
    content:
      "申し訳ありません、もう少し詳しく教えていただけますか？",
  };
  yield {
    type: "quick_replies",
    items: [
      { label: "🏢 B2Bパートナー", value: "B2B" },
      { label: "🛒 個人注文", value: "個人注文" },
    ],
  };
  yield { type: "done" };
}
