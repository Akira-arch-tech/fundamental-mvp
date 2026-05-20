# 双仓库 + 双 Vercel 对照表 v1

> 更新：2026-05-20 · 仓库根 = 本 Next.js 应用（与 `fundamental-originalprint-clone` 目录内容一致）

## 一览

| 维度 | fundamental-mvp | fundamental-agent |
|------|-------------------|-------------------|
| GitHub | `Akira-arch-tech/fundamental-mvp` | `Akira-arch-tech/fundamental-agent` |
| Vercel Project | `fundamental-mvp` | `fundamental-agent` |
| Production URL | `https://www.fundamental-goods.com` | `https://fundamental-agent-eta.vercel.app` |
| 主责 | 完整平台、主站、商店全链路 | AI Agent（`/design-chat`）、Pococha 演示、Agent 功能迭代 |
| Git 生产分支 | `main`（以 Dashboard 为准） | `main` |

## 仓库根目录应包含

- `package.json`
- `app/`（含 `design-chat`）
- `vercel.json`（`framework: nextjs`）
- `next.config.mjs`
- 其余本应用源码（`components/`、`lib/`、`public/` 等）

**不要**把上级 `FUNDAMENTAL/` 里的 PRD-only 文件夹作为 Git 根推送。

## Vercel Dashboard 检查清单（fundamental-agent）

1. **Settings → Git** → Repository = `Akira-arch-tech/fundamental-agent`
2. **Root Directory** = `.`（空 = 仓库根）
3. **Framework Preset** = Next.js
4. **Production Branch** = `main`
5. **Domains** → Production = `fundamental-agent-eta.vercel.app`（勿依赖 `fundamental-agent.vercel.app`）

## 环境变量

两项目 **分别** 在 Vercel → Environment Variables 配置。Agent 演示可只配 Demo 所需项；主站保留完整生产密钥。

## 历史说明

`fundamental-agent` 仓库曾短暂存放 Python `fundamental-agent-mvp` 脚手架；现以 Next.js 全栈应用为唯一部署源。旧 Python 参考实现仍在本 monorepo 的 `../fundamental-agent-mvp/`（不部署到 Agent Vercel）。
