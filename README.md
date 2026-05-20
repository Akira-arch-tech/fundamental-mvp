# FUNDAMENTAL — Next.js 应用（双仓库共用同一代码基线）

本目录是 **可运行的 Web 应用**（Next.js 16）。与上层 `FUNDAMENTAL/` 文档仓（PRD 等）分离；推 Git 时只推本目录内容。

## 双仓库 / 双 Vercel（分开管理）

| | **fundamental-mvp** | **fundamental-agent** |
|---|---------------------|------------------------|
| **Git** | [github.com/Akira-arch-tech/fundamental-mvp](https://github.com/Akira-arch-tech/fundamental-mvp) | [github.com/Akira-arch-tech/fundamental-agent](https://github.com/Akira-arch-tech/fundamental-agent) |
| **用途** | 完整定制平台 + 主站 | FUNDAMENTAL AI Agent 独立开发与对外 Demo |
| **Vercel 项目** | `fundamental-mvp` | `fundamental-agent` |
| **线上** | https://www.fundamental-goods.com | https://fundamental-agent-eta.vercel.app |
| **Agent 演示** | 同代码路径 `/design-chat` | https://fundamental-agent-eta.vercel.app/design-chat?demo=1 |

**规则**：推 `fundamental-mvp` 只更新主站；推 `fundamental-agent` 只更新 Agent 站。两仓根目录均为本应用（含 `package.json`、`app/`、`vercel.json`）。

**勿用** `https://fundamental-agent.vercel.app`（全局短域名已被他人占用）。

### 本地 Git 远程（推荐）

```bash
git remote add agent https://github.com/Akira-arch-tech/fundamental-agent.git   # 仅需一次
git push origin <branch>      # → 更新 fundamental-mvp / 主站
git push agent <branch>:main  # → 更新 fundamental-agent / Agent 站（生产分支多为 main）
```

### Vercel CLI 关联（按目标项目二选一）

```bash
# 主站
npx vercel link -y -p fundamental-mvp --scope rickyisfighting-5716s-projects
npx vercel deploy --prod --yes

# Agent 站
npx vercel link -y -p fundamental-agent --scope rickyisfighting-5716s-projects
npx vercel deploy --prod --yes
```

`.vercel/` 不入 Git；每人本机 `link` 到当前要部署的项目即可。

若 Agent 站 Git 部署后全站 404、构建仅 `0ms`：Vercel 项目 Framework 须为 **Next.js**（勿选 Other）；本仓 `vercel.json` 已声明 `"framework": "nextjs"`。

---

## 产品能力摘要

FUNDAMENTAL 定制商品平台（W1–W13 / M3：对接队列、Webhook、重试与审计）。验收：`npm run verify:clickflow` + `npm run verify:mvp`。

- 根路径 `/`：日文营销落地页
- 买家店 demo：`/shop`（收藏、商品、定制、结账、订单履约）
- **AI Agent**：`/design-chat`（`?demo=1` 为 3 分钟自动演示）
- 后台：`/b/login` 起（订单、异常、对接、AIGC 工作台等）

## 文档（在上级 FUNDAMENTAL 目录）

- 总 PRD：`../PRD-FUNDAMENTAL-v0.1.md`
- Agent PRD：`docs/POCOCHA-DESIGN-AGENT-PRD-v0.1.md`
- 站点 URL 表：`docs/SITE-URLS-AND-NAV-v1.md`
- 环境变量：`.env.example`

## 开发

```bash
npm install
npm run dev
```

> `dev` 默认 Webpack（非 Turbopack），避免部分环境下 `next/font` 编译问题。

## 本地 Postgres（可选）

1. `docker compose up -d`（端口 **5433**）
2. `export DATABASE_URL=postgresql://fdm:fdm@127.0.0.1:5433/fdm`
3. `npm run db:push` → `npm run db:seed` → `npm run verify:with-db`

## 技术栈

Next.js 16 · TypeScript · Tailwind · PostgreSQL + Drizzle（可选）· Stripe · AIGC 网关
