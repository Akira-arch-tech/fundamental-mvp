/**
 * 众筹文案生成器 — 使用 Claude API 生成日语众筹页面文案
 * 适用于 Kibidango / Campfire 平台
 */

export interface CopywritingParams {
  streamerStyle?: string;       // 主播风格描述
  productType: string;          // 商品类型
  designDescription?: string;   // 设计描述
  communityPlatforms?: string[]; // 社群平台
  targetAmount?: number;         // 众筹目标金额（日元）
}

function productLabel(type: string): string {
  const map: Record<string, string> = {
    acrylic_standee: "アクリルスタンド",
    tshirt: "Tシャツ",
    badge: "缶バッジ",
    phone_case: "スマホケース",
    clear_file: "クリアファイル",
  };
  return map[type] ?? "オリジナルグッズ";
}

export async function generateCrowdfundingCopy(
  params: CopywritingParams,
  anthropicApiKey: string,
): Promise<string> {
  const product = productLabel(params.productType);
  const platforms = params.communityPlatforms?.join("・") ?? "LINE / Discord";
  const amount = params.targetAmount ?? 200000;

  // No API key → return template mock
  if (!anthropicApiKey) {
    return generateMockCopy(params, product, platforms, amount);
  }

  const systemPrompt = `あなたはクラウドファンディングの日本語コピーライターです。
購入型クラウドファンディング（Kibidango / Campfire対応）の
プロジェクトページ用テキストを作成してください。
読みやすく、ファンの購買意欲を高める文章を書いてください。`;

  const userPrompt = `以下の情報をもとに、クラウドファンディングページ用の文案を日本語で作成してください。

【商品】${product}
【コンセプト】${params.streamerStyle ?? "AIが生み出すオリジナルアートデザイン"}
【デザイン】${params.designDescription ?? "AIによるオリジナルデザイン"}
【コミュニティ】${platforms}
【目標金額】¥${amount.toLocaleString()}

以下の形式で出力してください：

---
【タイトル】（30文字以内）

【キャッチコピー】（1文、インパクト重視）

【プロジェクト説明】（150〜200文字）

【リターン内容】
・アーリーバード（¥3,000〜）：
・スタンダード（¥5,000〜）：
・プレミアム（¥10,000〜）：

【発送予定】
---`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("Claude API error:", res.status, txt.slice(0, 200));
      return generateMockCopy(params, product, platforms, amount);
    }

    const json = (await res.json()) as {
      content: Array<{ type: string; text: string }>;
    };
    return json.content.find((c) => c.type === "text")?.text ?? generateMockCopy(params, product, platforms, amount);
  } catch (e) {
    console.error("copywriting-generator error:", e);
    return generateMockCopy(params, product, platforms, amount);
  }
}

function generateMockCopy(
  params: CopywritingParams,
  product: string,
  platforms: string,
  amount: number,
): string {
  return `---
【タイトル】
AIで生まれた、世界に1つの推しグッズ

【キャッチコピー】
AIが描く、あなただけのオリジナル${product}。推し活をもっと特別に。

【プロジェクト説明】
${params.streamerStyle ?? "配信者・クリエイター"}の世界観をAIデザインで${product}に。
従来のグッズ制作と違い、在庫リスク0のクラウドファンディング方式で、
ファンの皆さんの応援を集めてから制作します。
${platforms}コミュニティのみなさんと一緒に作る、特別な1点です。

【リターン内容】
・アーリーバード（¥3,000〜）：缶バッジ×3セット（限定30名）
・スタンダード（¥5,000〜）：${product}×1 + 缶バッジ×3
・プレミアム（¥10,000〜）：フルセット（${product}+缶バッジ+クリアファイル）

【発送予定】
プロジェクト終了後、約45日以内に発送予定。
目標金額：¥${amount.toLocaleString()}
---

※ このテキストはAI生成のテンプレートです。実際の公開前に内容をご確認ください。`;
}
