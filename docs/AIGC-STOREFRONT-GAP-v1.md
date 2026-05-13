# 买家店 AIGC 生图未出现在网页端 — 原因与方案（v1）

## 现象

政策页与 PRD 已描述 **AI 生图**（参考图、候选图、10 分钟确认等），但 **`/shop/customize/*`、购物车、结账** 等买家流程里看不到「一键生图 / 候选图确认」等能力。

## 根因（代码事实）

1. **买家定制编辑器未接生图链路**  
   `components/CustomizeEditor.tsx` 当前是 **图层编辑器**（本地上传、文字/配色、预览、`POST /api/customizations` 保存），**没有**调用任何「文生图 / 图生图」API，也没有「生成 → 候选 → 确认」状态机 UI。  
   在仓库内对 `CustomizeEditor` 检索 `generate`、`生图`、模型商相关接口均为 **无匹配**。

2. **AIGC 相关能力集中在后台 / 运营侧**  
   - `components/InternalAiEditor.tsx`：iframe 外链「创作中心」+ **手工回写** task / URL，面向 **`/b/*` 内部运营**，不是买家店结账路径。  
   - `lib/product-ai-cover-store.ts` + `lib/catalog.ts`：用于 **商品封面** 等数据的合并展示，依赖后台登记或数据层，**未在定制页内嵌生图面板**。

3. **合并发布范围**  
   近期合并重点是 **路由 `/shop`、全站 Tab、部署与文档**；**未包含**「在 `CustomizeEditor` / 新 API 上实现 PRD §AIGC 全链路」的交付项，因此线上行为与政策文案存在 **产品能力 gap**，不是单点 bug。

## 解决方案（按优先级）

| 阶段 | 做什么 | 产出 |
|------|--------|------|
| **A. 短期对齐预期** | 在定制页顶部加 **说明条**：当前 demo 为「上传 + 编排」；AI 生图在路线图 / 或跳转政策 `/policies` | 减少「政策写了但页上没有」的落差 |
| **B. MVP 闭环** | 在 `CustomizeEditor` 增加区块：**参考图多选 → 调用自建 `POST /api/.../generate`（或 BFF）→ 轮询/展示候选 → 10 分钟内确认 → 写入 customization** | 与 PRD / 政策一致的最小 UI；**API 骨架已见** `docs/AIGC-API-MVP-SKELETON-v1.md`（`/api/aigc/generations`） |
| **C. 与后台统一** | 复用 `InternalAiEditor` 同一模型商或同一 BFF，买家仅暴露简化参数；订单/发货仍走现有 `customization_id` | 工程复用、权限隔离（买家 vs `fdm_session` 后台） |

## 验收建议

- 定制页可见 **生成按钮**、**候选缩略图**、**倒计时或过期提示**、**确认选用** 后进入现有「保存 → 购物车 → 结账」链路。  
- E2E：可在 `verify-clickflow.mjs` 或 Playwright 中增加「mock 生图 API」的断言。

---

*文档版本 v1 · 与代码审查同步；实现排期由产品拍板。*

## 修订记录

- **v1.1**：补充 B 方案 **HTTP API 骨架** 文档链接 `docs/AIGC-API-MVP-SKELETON-v1.md`。
