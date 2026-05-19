# POCOCHA Design Agent PRD v0.1

> **产品名**：FUNDAMENTAL DA — Pococha 応援パートナー  
> **入口**：`/design-chat`  
> **版本**：v0.1 · 2026-05-19

---

## 1. 目标用户

| 角色 | 说明 |
|------|------|
| **主用户** | Pococha 系ライバー事務所的周边负责人（B2B） |
| **次用户** | 个人粉丝（C2C，保留现有流程） |

---

## 2. 目标与成功标准

| 目标 | 验收 |
|------|------|
| 15 分钟内走完 B2B 演示 | 事务所负责人无需培训即可完成 |
| 体现 AI Native | 生图走 `/api/aigc` 网关（非仅 placeholder） |
| 体现私域运营 | 输出 Community Kit（LINE/Discord/直播稿） |
| 可接结账 | 众筹文案后生成 `customization_id` 预览链 |
| Phase 2 叙事 | 含 Pococha 平台时引导 Virtual Gift Mock |

---

## 3. B2B 流程（状态机）

```
welcome → mode_select → b2b_streamer → b2b_community → product_select
  → design_describe → generating → design_review → mockup_ready
  → [community_pack] → crowdfunding_copy → [checkout_link] → size_selected → order_confirm → order_complete
```

| Step | 用户动作 | Agent 输出 |
|------|----------|------------|
| b2b_streamer | 描述主播风格 | Pococha 示例引导 |
| b2b_community | 选 LINE/Discord/Pococha 等 | 记录 `communityPlatforms` |
| product_select | 选商品 | 默认推荐 アクキー/缶バッジ |
| design_describe | 描述设计 | AIGC 生成 |
| design_review | 确认/调整 | 候选图 |
| mockup_ready | 确认设计 | Mockup + **community_pack** |
| crowdfunding_copy | 生成/跳过文案 | 日文众筹文 + **checkout_link**（可选） |
| order_* | 样品单 | 订单卡 |

---

## 4. SSE 事件

| type | 说明 |
|------|------|
| `text` | 文本气泡 |
| `image` | 生成图 URL |
| `mockup` | 商品预览 |
| `community_pack` | 私域运营素材包 |
| `copywriting` | 众筹文案 |
| `checkout_link` | `{ customization_id, url, label }` |
| `virtual_gift_hint` | Phase 2 Mock 链接与说明 |
| `order` | 样品订单 |
| `state` | 状态 patch |
| `done` | 流结束 |

---

## 5. Community Kit 结构

```ts
interface CommunityPack {
  lineOa: [string, string, string]; // 开始/中途/冲刺
  discordVotePost: string;
  pocochaLiveScript: string; // 30秒口播
  twitterHint?: string;
}
```

---

## 6. AIGC

- 优先：`enqueueAigcGeneration` + `getAigcJob({ runLazyProcessor: true })`  
- Fallback：`falGenerate` → picsum placeholder  
- 商品映射：`acrylic_standee` → `p4`；其他 → `p1`

---

## 7. 非目标（MVP）

- Pococha OAuth / 真实礼物 API  
- n8n 自动发帖  
- 多事务所租户后台

---

## 8. 相关文件

- `lib/design-agent/agent.ts`
- `lib/design-agent/community-kit.ts`
- `lib/design-agent/aigc-generate-client.ts`
- `lib/design-agent/customization-bridge.ts`
- `components/design-chat/*`
