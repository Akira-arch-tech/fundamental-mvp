# Design Chat — B2B 全流程验收测试单

**环境**：`npm run dev` → http://localhost:3000/design-chat  
**Mock 条件**：无有效 `FAL_KEY` 时图片走 picsum 占位；无 `ANTHROPIC_API_KEY` 时众筹文案走模板  
**测试日期**：2026-05-19  
**测试人**：Agent 自动化（`node scripts/b2b-design-chat-acceptance.mjs`）+ Playwright 截图  
**结论**：**12/12 节点通过**

| # | 节点 | 操作 / 输入 | 预期结果 | 实际结果 | 通过 |
|---|------|-------------|----------|----------|------|
| N1 | 欢迎 | 打开 `/design-chat` | 显示欢迎语 + B2B / 个人快捷回复 | 首屏 LINE 风 UI，B2B / 个人按钮可见 | ✅ |
| N2 | 模式选择 | 点击「B2B」 | 进入 B2B 模式，询问主播风格 | `step=b2b_streamer`，日文引导文案 | ✅ |
| N3 | 主播风格 | 输入 Pococha 示例风格 | 进入社群平台选择 | `step=b2b_community`，LINE/Discord 等快捷回复 | ✅ |
| N4 | 社群平台 | 选择 LINE OpenChat | 进入商品类型选择 | `step=product_select`，アクリルスタンド等选项 | ✅ |
| N5 | 商品类型 | 选择アクリルスタンド | 询问设计描述 | `step=design_describe` | ✅ |
| N6 | 设计描述 | 输入星空主题 | 生成中 → picsum 图 + 确认按钮 | `image` 事件 URL 含 `picsum.photos` | ✅ |
| N7 | 确认设计 | 确认进下一步 | mockup + 文案生成/跳过 | `mockup` 事件 + 文案快捷回复 | ✅ |
| N8 | 众筹文案 | 「文案を生成」 | 模板文案卡片 | `copywriting` 含「テンプレート」 | ✅ |
| N9 | 样本订单 | 「サンプル注文」 | 尺寸选择 | L/LL/DX 快捷回复 | ✅ |
| N10 | 尺寸 | L版 (10cm) | 询问数量 | 数量提示文案 | ✅ |
| N11 | 数量 | 2個 | 订单摘要 | 合計 ¥1,700 等摘要 | ✅ |
| N12 | 下单 | 注文確定 | 订单号卡片 | `order` 事件 `FUN-*` | ✅ |

## 截图清单

| 截图 | 路径 | 说明 |
|------|------|------|
| S1 | `docs/acceptance-screenshots/b2b-01-welcome.png` | 欢迎 + 模式选择 |
| S2 | `docs/acceptance-screenshots/b2b-02-design-image.png` | 生成图（picsum 占位） |
| S3 | `docs/acceptance-screenshots/b2b-03-mockup-copy.png` | Mockup + 众筹文案模板 |
| S4 | `docs/acceptance-screenshots/b2b-04-order-complete.png` | 订单确认 FUN- 单号 |

## 本次代码修复（验收中发现）

1. **`welcome` 步不再拦截 B2B 首条消息** — 客户端已展示欢迎语，服务端直接进入 `mode_select` 逻辑。  
2. **FAL 失败时回退 picsum** — `.env.local` 含无效 `FAL_KEY` 时仍可演示。  
3. **文案生成后「サンプル注文」** — 不再重复触发生成，正确进入尺寸选择。

## 复现命令

```bash
cd fundamental-originalprint-clone
npm run dev
# 另开终端
node scripts/b2b-design-chat-acceptance.mjs
```
