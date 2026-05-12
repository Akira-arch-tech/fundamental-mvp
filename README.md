# fundamental-custom-store

FUNDAMENTAL 的 **定制商品平台 workspace**（W1–W13 / **M3**：含 **对接队列（ERP/CRM）**、**Webhook 验签**、**重试与死信**、**告警与审计 CSV**；`npm run verify:clickflow` + `npm run verify:mvp`）。

## 文档

- 需求与字段：`../PRD-FUNDAMENTAL-v0.1.md`
- 执行拆解：`../FUNDAMENTAL-x-CustoMeow-集成实施清单-v0.1.md`
- 本仓库说明：`docs/WORKSPACE.md`
- MVP 产品需求（v0.2）：`docs/PRD-v0.2-MVP.md`
- CRM/ERP 技术契约（MVP）：`docs/TECH-CONTRACT-CRM-ERP.md`
- 产品验收手册（v1）：`docs/ACCEPTANCE-RUNBOOK-v1.md`
- 加购与编辑器方案：`docs/CUSTOM-EDITOR-AND-CART-PLAN-v1.md`
- 站点 URL 与全站 Tab 导航：`docs/SITE-URLS-AND-NAV-v1.md`

## 开发

```bash
npm install
npm run dev
```

> `dev` 使用默认 **Webpack**（未启用 `--turbopack`），避免与 `next/font/google` 组合在部分环境出现的编译错误。

根路径 `/` 为日文营销落地页；**买家店 demo** 统一挂在 **`/shop`**（例如 `/shop` → `/shop/favorite`、`/shop/products/...`、`/shop/checkout`）。

定制页 v1：`/shop/customize/[productId]` 支持上传图片、文本配色、预览、DPI 提示和 `POST /api/customizations` 保存；并可跳转 `/shop/checkout` 完成下单（`POST /api/orders`），最终进入 `/shop/orders/[id]` 查看履约时间线、工单/物流节点，以及客服入口与异常流程（改图/补发/退款）。

**W10**：顶栏「后台登录」进入 `/b/login`，会话写入 Cookie；订单页异常审核按钮与 `PATCH .../exceptions/{id}` 均以服务端会话角色为准，不再手工选角色。

**W11**：配置 `DATABASE_URL` 后订单与异常落 PostgreSQL；登录为邮箱密码 + `sessions` 表；`/b/orders`、`/b/exceptions` 为后台工作台。详见 `docs/WORKSPACE.md` 与根目录 `docker-compose.yml`、`.env.example`。

**W12–W13**：`/b/integrations` 查看对接任务与告警；`POST /api/integrations/erp/webhook`（`ERP_WEBHOOK_SECRET`）；`GET /api/backoffice/audit-export`（admin）。验收：`npm run verify:mvp`。

## Vercel：只关联 fundamental-mvp

线上生产与自定义域名（如 `www.fundamental-goods.com`）挂在 Vercel 项目 **`fundamental-mvp`**，不要用 CLI 在本目录「顺手」创建新项目（例如曾误建的 `fundamental-originalprint-clone`，应在 Dashboard 删除以免混淆）。

- **项目控制台**：https://vercel.com/rickyisfighting-5716s-projects/fundamental-mvp  
- **首次在本机关联 / 换电脑后**：在仓库根目录执行（需已 `vercel login`）：

```bash
rm -rf .vercel   # 若曾链到其他项目，先清掉再 link
npx vercel link -y -p fundamental-mvp --scope rickyisfighting-5716s-projects
```

- **手动推生产构建**：

```bash
npx vercel deploy --prod --yes
```

- **说明**：`.vercel/` 已在 `.gitignore` 中，每人本地各自 `link` 即可；与 GitHub `main` 的自动部署也应指向 **同一项目 fundamental-mvp**（在 Vercel → Project → Settings → Git 中确认）。

## 技术栈

- Next.js 15（App Router）
- TypeScript + Tailwind CSS
- PostgreSQL + Drizzle ORM（可选，`DATABASE_URL`）
- 商品图为远程占位（picsum.photos），见 `next.config.ts` 中 `images.remotePatterns`

## 下一步（生产化）

- 将工单 / 物流 / 客服与对接任务一并纳入 PostgreSQL；对接真实 CRM/ERP 沙箱
- 多租户、可观测平台（OpenTelemetry）、密钥托管
