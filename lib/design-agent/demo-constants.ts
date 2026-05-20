/** 对外 Demo 用预置素材（不依赖 AIGC Key / DB） */

/** 固定高质量占位图（樱花幻想系，与示例文案一致） */
export const DEMO_DESIGN_IMAGE_URL =
  "https://picsum.photos/seed/fundamental-pococha-sakura/512/680";

export const DEMO_STREAMER_STYLE =
  "Pocochaで活躍する女性ライバー。ピンク×ホワイトの可愛い系。ファンは10代〜20代女性が中心";

export const DEMO_DESIGN_THEME = "ピンクの桜と星空、キラキラしたファンタジー系でかわいく";

export const DEMO_CROWDFUNDING_COPY = `【タイトル】
推しの絆を形にする｜限定アクリルスタンドクラファン

【キャッチコピー】
ファンの声をデザインに。ポコチャで輝く「あの子」の世界観を、手元に。

【プロジェクト説明】
いつも配信を見てくれるファンの皆さんへ。
今回、ファンの皆さんの投票とコメントを反映したオリジナルデザインで、
限定アクリルスタンドのクラウドファンディングを実施します。

・初期費用0円（達成後生産）
・在庫リスクなし
・AIデザイン × コミュニティ運営でスピード感ある推し活を

【リターン内容】
・早期支援：アクリルスタンド L版 + サンクスカード
・通常：アクリルスタンド L版
・セット：アクリルスタンド + 缶バッジ2個

【発送予定】
クラファン終了後、約4〜6週間でお届け予定です。

#推し活 #ポコチャ #クラファン #FUNDAMENTAL`;

export const DEMO_CHECKOUT = {
  customization_id: "demo-preview-cust",
  url: "/checkout?customization_id=demo-preview-cust",
  label: "チェックアウトプレビューを開く（デモ）",
};

/** 自动演示：用户消息序列与每步间隔（ms） */
export const DEMO_AUTO_SCRIPT: { message: string; pauseMs: number }[] = [
  { message: "B2B", pauseMs: 1200 },
  { message: DEMO_STREAMER_STYLE, pauseMs: 1000 },
  { message: "LINE OpenChat、Discord、Pococha", pauseMs: 1000 },
  { message: "アクリルスタンド", pauseMs: 800 },
  { message: DEMO_DESIGN_THEME, pauseMs: 1500 },
  { message: "確認、このデザインで進めます", pauseMs: 2000 },
  { message: "文案を生成してください", pauseMs: 2500 },
];
