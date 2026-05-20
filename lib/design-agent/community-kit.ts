import type { ProductType } from "./types";

export interface CommunityPack {
  lineOa: [string, string, string];
  discordVotePost: string;
  pocochaLiveScript: string;
  twitterHint: string;
}

const PRODUCT_LABEL_JA: Record<ProductType, string> = {
  acrylic_standee: "アクリルスタンド",
  tshirt: "Tシャツ",
  badge: "缶バッジ",
  phone_case: "スマホケース",
  clear_file: "クリアファイル",
};

/** B2B 私域运营素材包（LINE / Discord / Pococha 直播 / Twitter） */
export function buildCommunityPack(params: {
  streamerStyle?: string;
  productType: ProductType;
  communityPlatforms?: string[];
  designTheme?: string;
}): CommunityPack {
  const product = PRODUCT_LABEL_JA[params.productType] ?? "オリジナルグッズ";
  const style = params.streamerStyle?.slice(0, 80) ?? "配信者";
  const theme = params.designTheme?.slice(0, 60) ?? "新デザイン";
  const platforms = params.communityPlatforms?.length
    ? params.communityPlatforms.join("・")
    : "LINE・Discord";

  const lineOa: [string, string, string] = [
    `【開始】🎉 ${style}さんの${product}クラファンがスタート！\nデザインはファンの声を反映した「${theme}」テーマです。\n▶ プロジェクトページはこちら（リンクを挿入）\n#推し活 #ポコチャ`,
    `【途中】📣 残り○日！目標の○○%達成中\n人気は「${product}」セットです。Discordで投票いただいた皆さんありがとうございます！\n▶ 応援はこちら`,
    `【ラストスパート】🔥 あと24時間！\nライブでも紹介します。見逃し厳禁です！\n▶ 最後の応援はこちら`,
  ];

  const discordVotePost = [
    `📊 **デザイン投票のお願い**`,
    ``,
    `${style}さんの${product}、次のクラファン用デザインを決めましょう！`,
    ``,
    `**テーマ**: ${theme}`,
    ``,
    `リアクションで投票してください：`,
    `👍 A案　❤️ B案　🔥 C案`,
    ``,
    `※投票は48時間で締め切ります。`,
  ].join("\n");

  const pocochaLiveScript = [
    `【ポコチャ配信・30秒口播稿】`,
    ``,
    `みんな聞いて〜！`,
    `今回の${product}、ファンのみんなと一緒に作ったんだよ！`,
    `テーマは「${theme}」！`,
    `クラファンは説明欄のリンクから応援してね。`,
    `あと○日で終わっちゃうから、見てくれた子はぜひチェックして〜！`,
    `応援ありがとう！`,
  ].join("\n");

  const twitterHint = [
    `【X/Twitter 投稿例】`,
    ``,
    `${style} の新グッズ「${product}」クラファン開始🎉`,
    `テーマ：${theme}`,
    `支援はこちら▶（リンク）`,
    `#推し活 #ポコチャ #クラファン`,
    `※${platforms} と連動して投稿すると効果的です`,
  ].join("\n");

  return { lineOa, discordVotePost, pocochaLiveScript, twitterHint };
}

/** 一键复制用：纯文本、无 Markdown */
export function formatCommunityPackPlainText(pack: CommunityPack): string {
  return [
    "=== FUNDAMENTAL コミュニティ運営キット ===",
    "",
    "[LINE OA · 開始]",
    pack.lineOa[0],
    "",
    "[LINE OA · 途中]",
    pack.lineOa[1],
    "",
    "[LINE OA · ラスト]",
    pack.lineOa[2],
    "",
    "[Discord 投票]",
    pack.discordVotePost,
    "",
    "[ポコチャ配信 口播稿]",
    pack.pocochaLiveScript,
    "",
    "[X 投稿]",
    pack.twitterHint,
  ].join("\n");
}

export function formatCommunityPackForChat(pack: CommunityPack): string {
  return [
    "📦 **コミュニティ運営キット** を用意しました！",
    "",
    "━━ LINE OA（3通）━━",
    pack.lineOa[0],
    "---",
    pack.lineOa[1],
    "---",
    pack.lineOa[2],
    "",
    "━━ Discord 投票投稿 ━━",
    pack.discordVotePost,
    "",
    "━━ ポコチャ配信 口播稿 ━━",
    pack.pocochaLiveScript,
    "",
    "━━ X 投稿ヒント ━━",
    pack.twitterHint,
  ].join("\n");
}
