# 买家店 AIGC 生图未出现在网页端 — 原因与方案（v1）

## 现象

政策页与 PRD 已描述 **AI 生图**（参考图、候选图、10 分钟确认等），但 **`/shop/customize/*`、购物车、结账** 等买家流程里看不到「一键生图 / 候选图确认」等能力。

## 根因（代码事实）

1. **买家定制编辑器未接生图链路**（~~已解决 MVP~~）  
   `components/CustomizeEditor.tsx` 现为 **图层编辑器** + **AIGC MVP 区块**（`POST /api/aigc/generations` → 轮询 → 确认 → 画布图层 → 既存 `POST /api/customizations`）。占位候选、Serverless 多实例不共享等限制仍见 `docs/AIGC-API-MVP-SKELETON-v1.md`。

2. **AIGC 相关能力集中在后台 / 运营侧**  
   - `components/InternalAiEditor.tsx`：iframe 外链「创作中心」+ **手工回写** task / URL，面向 **`/b/*` 内部运营**，不是买家店结账路径。  
   - `lib/product-ai-cover-store.ts` + `lib/catalog.ts`：用于 **商品封面** 等数据的合并展示，依赖后台登记或数据层，**未在定制页内嵌生图面板**。

3. **合并发布范围**  
   近期合并重点是 **路由 `/shop`、全站 Tab、部署与文档**；**未包含**「在 `CustomizeEditor` / 新 API 上实现 PRD §AIGC 全链路」的交付项，因此线上行为与政策文案存在 **产品能力 gap**，不是单点 bug。

## 解决方案（按优先级）

| 阶段 | 做什么 | 产出 |
|------|--------|------|
| **A. 短期对齐预期** | 在定制页顶部加 **说明条**：当前 demo 为「上传 + 编排」；AI 生图为 MVP 扩展；链至 **`/policies`** | **已落地**（`CustomizeEditor` 顶部提示） |
| **B. MVP 闭环** | 在 `CustomizeEditor` 增加区块：**参考图多选（件数占位）→ `POST /api/aigc/generations` → 轮询候选 → 确认窗内确认 → 并入画布与 `POST /api/customizations`** | **已落地**；契约见 `docs/AIGC-API-MVP-SKELETON-v1.md` |
| **C. 与后台统一** | 买家与后台共用 **同一公开 BFF 路径常量**（`lib/aigc-shared-constants.ts`）；后台仍走 `/api/backoffice/*`，`InternalAiEditor` 侧增加对齐说明 | **已落地（文档/常量层）**；真模型商对齐待后续 |

## 验收建议

- 定制页可见 **生成按钮**、**候选缩略图**、**倒计时或过期提示**、**确认选用** 后进入现有「保存 → 购物车 → 结账」链路。  
- E2E：`verify-clickflow.mjs` 已包含 **AIGC create → get → confirm** 断言；定制页 HTML 断言含 **「AI 画像」** 区块。

---

*文档版本 v1.2 · 与买家店 AIGC MVP 落地同步。*

## 修订记录

- **v1.1**：补充 B 方案 **HTTP API 骨架** 文档链接 `docs/AIGC-API-MVP-SKELETON-v1.md`。
- **v1.2**：A/B/C 方案 **MVP 已落地**（`CustomizeEditor`、`InternalAiEditor` 对齐说明、`verify-clickflow`、共享常量）。
