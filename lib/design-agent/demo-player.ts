import type { AgentState, SSEEvent } from "./types";
import { DEMO_SAKURA_IMAGE_URL, DEMO_COPYWRITING } from "./demo-content";

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function* playDemoSSE(
  message: string,
  state: AgentState,
): AsyncGenerator<SSEEvent> {
  await delay(300);

  switch (state.step) {
    case "welcome":
    case "mode_select": {
      yield { type: "state", patch: { step: "b2b_streamer", mode: "b2b" } };
      await delay(80);
      yield { type: "text", content: "B2Bパートナーモードへようこそ！🏢✨" };
      await delay(80);
      yield {
        type: "text",
        content:
          "\n\n担当している配信者・クリエイターのスタイルを教えてください。\n\n💡 例：「Pocochaで活躍する女性ライバー。ピンク×ホワイトの可愛い系。ファンは10代〜20代女性が中心」",
      };
      yield { type: "done" };
      break;
    }
    case "b2b_streamer": {
      yield {
        type: "state",
        patch: {
          step: "b2b_community",
          streamerStyle:
            "Pocochaで活躍する女性ライバー。桜×ピンク×ホワイト、ふわふわ可愛い系。ファンは10代〜20代女性が中心",
        },
      };
      await delay(80);
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
      break;
    }
    case "b2b_community": {
      yield {
        type: "state",
        patch: { step: "product_select", communityPlatforms: ["LINE OpenChat"] },
      };
      await delay(80);
      yield {
        type: "text",
        content:
          "LINE OpenChatコミュニティですね！💪\n\nクラウドファンディングで展開するグッズの種類を選んでください：",
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
      yield { type: "done" };
      break;
    }
    case "product_select": {
      yield {
        type: "state",
        patch: { productType: "acrylic_standee", step: "design_describe" },
      };
      await delay(80);
      yield {
        type: "text",
        content:
          "アクリルスタンドですね！✨\n\n配信者のイメージ（Pocochaで活躍する女性ライバー。桜×ピンク…）をベースにテーマ・色・雰囲気を教えてください。\n\n💡 例：「桜の花びらと星空、キラキラしたファンタジー×ガーリー系」",
      };
      yield { type: "done" };
      break;
    }
    case "design_describe": {
      yield {
        type: "state",
        patch: {
          step: "generating",
          designPrompt:
            "桜の花びらと星空、キラキラしたファンタジー×ガーリー系、アクリルスタンド向けデザイン",
        },
      };
      await delay(80);
      yield {
        type: "text",
        content: "AIデザインを生成しています...✨\n少々お待ちください（約10〜20秒）",
      };
      yield { type: "generating" };
      await delay(2000);
      yield {
        type: "state",
        patch: { step: "design_review", designUrl: DEMO_SAKURA_IMAGE_URL },
      };
      yield { type: "image", url: DEMO_SAKURA_IMAGE_URL };
      await delay(80);
      yield { type: "text", content: "生成できました！🎨\nいかがでしょうか？" };
      yield {
        type: "quick_replies",
        items: [
          { label: "✅ このデザインで進める", value: "確認、このデザインで進めます" },
          { label: "🔄 デザインを調整する", value: "もう少し変えてください" },
        ],
      };
      yield { type: "done" };
      break;
    }
    case "design_review": {
      yield { type: "state", patch: { step: "mockup_ready" } };
      await delay(80);
      yield { type: "text", content: "商品プレビューを作成しています...🎴" };
      yield {
        type: "mockup",
        data: { productType: "acrylic_standee", designUrl: DEMO_SAKURA_IMAGE_URL },
      };
      await delay(80);
      yield {
        type: "text",
        content:
          "アクリルスタンドのプレビューです！✨\n\n次に、クラウドファンディング（Kibidango / Campfire）用の\n日本語プロジェクト文案を自動生成しますか？",
      };
      yield {
        type: "quick_replies",
        items: [
          { label: "📝 文案を生成する", value: "文案を生成してください" },
          { label: "⏭️ スキップして注文へ", value: "スキップ" },
        ],
      };
      yield { type: "state", patch: { step: "crowdfunding_copy" } };
      yield { type: "done" };
      break;
    }
    case "crowdfunding_copy": {
      await delay(80);
      yield {
        type: "text",
        content:
          "クラウドファンディング文案を生成しています...📝\n（Claude AIが日本語で作成します）",
      };
      yield { type: "generating" };
      await delay(1200);
      yield { type: "state", patch: { crowdfundingCopy: DEMO_COPYWRITING } };
      yield { type: "copywriting", content: DEMO_COPYWRITING };
      await delay(80);
      yield {
        type: "text",
        content:
          "文案が完成しました！📄✨\n上記のテキストをコピーして、KibidangoやCampfireのページ作成にお使いください。\n\n続けてデモを完了しますか？",
      };
      yield {
        type: "quick_replies",
        items: [
          { label: "✅ デモを完了する", value: "デモ完了" },
          { label: "🏁 完了", value: "完了" },
        ],
      };
      yield { type: "done" };
      break;
    }
    default: {
      yield { type: "state", patch: { step: "order_complete" } };
      yield { type: "text", content: "__DEMO_COMPLETE__" };
      yield { type: "done" };
      break;
    }
  }

  // suppress unused variable warning for message
  void message;
}
