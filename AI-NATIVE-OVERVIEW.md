# FUNDAMENTAL — AI Native 仓库地图

> **用途**：给人与 coding agent 的**单一入口**。改功能前先扫一遍本节，避免改错层、改错真源文档。

## 0. 本机多个「FUNDAMENTAL」目录对照

同名文件夹有三处，**不是同一个 Git 仓库**，改代码 / 推部署前先看这一表。

| 路径 | 角色 | 技术栈 | Git 仓库 | 对外地址 |
| --- | --- | --- | --- | --- |
| **`…/国民级APP-原型/FUNDAMENTAL/`**（本仓库根） | **正式工程 + PRD 真源** | Next.js 演示仓 `fundamental-originalprint-clone/` + n8n 上下文根 | 应用子目录 → `Akira-arch-tech/fundamental-mvp` | Vercel Preview / 生产 `https://www.fundamental-goods.com/` |
| **`~/Documents/Claude/Projects/FUNDAMENTAL`** | **运营与 MVP 规划文档** | 仅 Markdown（3 个月计划、LINE 规则、POD 调研、SOP 等） | 无（或本地笔记，非 `fundamental-mvp`） | 无部署 |
| **`~/Projects/FUNDAMENTAL`** | **产品经理练手 Demo**（`PM-demo-presentation`） | Vite + React + Express 假 API | `Akira-arch-tech/PM-demo-presentation` | GitHub Pages `https://akira-arch-tech.github.io/PM-demo-presentation/` |

**分工记一句：**

- **要开发、验收、上线** → 只改本仓库下的 **`fundamental-originalprint-clone`**，推 **`fundamental-mvp`** 的 `preview` / 生产分支。
- **要写运营计划、合作话术** → 用 **`~/Documents/Claude/Projects/FUNDAMENTAL`** 文档；需要时可把结论回写到本仓库 PRD / `PROJECT-MEMORY.md`。
- **要快速演示「概念流程」**（中文 mock、无真实结账）→ 可用 **`~/Projects/FUNDAMENTAL`**；**不要**把它当成线上店或 PRD 工程真源。

**冲突说明：** 三者**不会**因 `git push` 互相覆盖；主要风险是**改错目录**或**对外发错链接**。产品叙事以本仓库 PRD + 演示仓为准；Pages Demo 仅作概念板。

## 0.1 Vercel 两个 Projects（必须分清）

> 团队：`rickyisfighting-5716s-projects`（Vercel）

| 项目 | 线上地址 | 主要作用 | 变更节奏 |
| --- | --- | --- | --- |
| `fundamental-mvp` | `https://www.fundamental-goods.com` | **主站/主业务**：完整平台、商店链路、生产相关能力 | 稳定优先，面向真实业务 |
| `fundamental-agent` | `https://fundamental-agent-eta.vercel.app` | **Agent 演示与独立迭代**：`/design-chat`、Pococha 方案演示 | 迭代更快，面向演示与探索 |

**一句话区分**：`fundamental-mvp` 负责"对外正式承接"；`fundamental-agent` 负责"AI Agent 场景快速验证与演示"。

### 未来代码工程提交要求（统一口径）

- **先判定目标站**：改动如果影响主站真实业务（下单/履约/线上入口）→ 提交到 `fundamental-mvp`；以 Agent 演示为主 → 提交到 `fundamental-agent`。
- **同一代码基线，双项目分发**：两个 Vercel 项目都来自同一套 Next.js 代码基线（本目录应用源码）；发布时按目标项目选择对应 Git 仓库/远端。
- **推送规则**：`git push origin <branch>` 用于 `fundamental-mvp`；`git push agent <branch>:main` 用于 `fundamental-agent`（以仓库默认分支与 Dashboard 设置为准）。
- **禁止混推**：一次发布只对一个目标项目负责；未确认目标前，不要同时触发两个项目生产部署。
- **提交前验收**：在 `fundamental-originalprint-clone` 内至少执行 `npm run lint && npm run build`；涉及流程改动再跑 `verify-clickflow` / `verify-mvp`。
- **域名校验**：`fundamental-agent` 对外域名以 `fundamental-agent-eta.vercel.app` 为准；不要使用 `fundamental-agent.vercel.app`。

**发布前 Checklist（复制到 PR 模板）**

```md
- [ ] 本次目标项目已确认：`fundamental-mvp` / `fundamental-agent`（二选一）
- [ ] 变更范围已自检：仅包含本次目标项目需要的功能与文件（无混推）
- [ ] 本地检查通过：`npm run lint && npm run build`
- [ ] 流程验证通过（如适用）：`npm run verify:clickflow` / `npm run verify:mvp`
- [ ] 部署目标与域名已核对（mvp=`www.fundamental-goods.com`；agent=`fundamental-agent-eta.vercel.app`）
- [ ] PR 描述已写清：影响范围、验证结果、回滚方案
```

## 附录：四阶段 × 三工具 一页纸

> 来源：Anthropic《Founder's Playbook — Building an AI-Native Startup》（2026）。
> 英文 PDF：[官方手册](https://cdn.prod.website-files.com/6889473510b50328dbb70ae6/69fe2a55b93bb0732b1fe33c_The-Founders-Playbook-05062026_v3%20(1).pdf) · 中文导读：[微信文章](https://mp.weixin.qq.com/s/PSnGB3ryAg_VlBkOtnhofw)

**角色转变（记一句）**：创始人从「自己干」→「指挥 Agent」——定方向、验假设、验收结果；研究 / 写代码 / 跑重复运营交给不同形态的 AI。

### 三工具速查（同一模型，不同工作空间）

| 工具 | 像什么岗位 | 什么时候用 | 在 Cursor / FUNDAMENTAL 里可对标 |
| --- | --- | --- | --- |
| **Chat** | 随叫随到的顾问 | 快问快答、改文案、头脑风暴、单次分析 | Cursor 对话、Claude.ai |
| **Cowork** | 运营 + 研究助理 | 多文件综合、写 PRD/备忘录、连 Gmail/日历/表格、**定时**跑任务 | n8n 工作流、MCP 连接器 |
| **Code** | 工程师 | 读代码库、Plan、写/测/改代码、Git、上线前安全扫 | **Cursor Agent**、`fundamental-originalprint-clone` |

### 主表：四阶段 × 三工具

| 阶段 | 本阶段要证明什么 | **Chat** | **Cowork** | **Code** | 过关信号（简化） |
| --- | --- | --- | --- | --- | --- |
| **① 想法** | 真问题 + 值得做 | 打磨问题陈述；**反方**压力测试；竞品/TAM 提纲 | 综合竞品评论、行业报告；访谈问题审核；每 5 次访谈正反清单；触达排期 | 仅做**轻量原型**给人试用（不是正式产品） | 能和用户说清楚「谁、多痛、竞品怎样」；有定性证据再进 MVP |
| **② MVP** | 有人真用 + 别堆债 | 范围文档；新功能是否「用户真需求」 | 用户反馈汇总、触达与会议安排 | **先**写架构/范围 → `CLAUDE.md`；再开发；**上线前安全审查**；指标框架 | 留存/付费/推荐有信号；代码有持久上下文 |
| **③ 发布** | 增长可重复 + 你不当瓶颈 | 指标反方解读；PM 轻量流程设计 | 运营审计（哪些可自动化）；迭代/周报/bug 路由 | 技术债审计与修复；安全/合规代码审查 | 渠道获客可算；运营不全靠你盯 |
| **④ 规模化** | 公司能脱离你日常运转 | 战略/董事会材料；瓶颈地图 | 日常运营自动化；合规文档维护 | 基础设施与集成加固；企业级安全 | 增长系统性；护城河（数据/集成/领域） |

### 每阶段 Agent 必做 3 件事（防踩坑）

| 阶段 | 必做 | 千万别 |
| --- | --- | --- |
| ① 想法 | 用 AI 做**反方**；访谈后再综合 | 把「能跑的原型」当「已验证」 |
| ② MVP | 写 `CLAUDE.md` + 范围文档；会话结束更新决策日志 | 无护栏地让 Code 一直加功能 |
| ③ 发布 | 技术债清单 + 运营自动化清单 | 把 Launch 热度当 PMF |
| ④ 规模化 | 把脑子里的流程写成可审计系统 | 该交出去的事仍全抓在自己手上 |

### 与 FUNDAMENTAL 演示仓的对照

| 手册阶段 | 本项目现状（2026-05） |
| --- | --- |
| ① 想法 | PRD v0.3.x、v1.0 执行存档、3 个月 MVP 计划（`~/Documents/Claude/Projects/FUNDAMENTAL`） |
| ② MVP | `fundamental-originalprint-clone`、AIGC API + worker、`verify-clickflow`、Vercel preview |
| ③ 发布 | `www.fundamental-goods.com`、Stripe/ERP 最小闭环、n8n 集成轨道；Pococha B2B Agent `/design-chat`、虚拟礼物 Mock `/pococha-virtual-gift`（见 `FUNDAMENTAL-Pococha-市场与产品规划-v2.0.md`） |
| ④ 规模化 | 未启动；方向见 POD/LINE 运营文档 |

**指挥 Agent 时默认读法**：改 PRD/竞品 → Chat 或 Cowork；改页面/API → Code（Cursor）+ 本文件 §2–§4；重复运营 → Cowork 或 n8n。每次开 Code 会话前：**先读** `AI-NATIVE-OVERVIEW.md` 与 clone 内 `CLAUDE.md`（若有）。

---

## 1. 仓库里有两条「轨道」

| 轨道 | 是什么 | 典型改动场景 |
| --- | --- | --- |
| **A. Web 应用** | `fundamental-originalprint-clone/`（Next.js：前台 B2B/B2C、后台、API Routes） | 页面、下单、AIGC 任务 API、集成 Worker |
| **B. n8n 自动化** | 仓库根为 **n8n-as-code 上下文根**（见根目录 `AGENTS.md`） | 工作流编排、与 n8n 实例同步 |

两条轨道**不互相替代**：订单与 AIGC 主链路在 Next；n8n 按你们实际接入的 workflow 目录为准（用 `npx --yes n8nac workspace status --json` 取 `workflowDir`，不要猜路径）。

## 2. 产品与设计真源（读文档顺序）

1. **`PRD-FUNDAMENTAL-v0.1.md`** — 产品需求真源（文内版本号 v0.3.x 为准）。
2. **`FUNDAMENTAL-AIGC调研及MVP产品PRD-claude/FUNDAMENTAL-AIGC调研及MVP产品方案-claude-v1.0.md`**（v1.0）— **AI Native 执行存档**：Pillar 1 产品叙事与 SKU/ToB 模板（第二章）、**店铺下单工程优先级（第四章 §4）**；与 PRD 冲突时以 PRD 或会议结论为准。
3. **`FUNDAMENTAL-AIGC最短完整链路MVP-v0.3.md`** — AIGC 最短闭环与供应商追溯。
4. **`FUNDAMENTAL-PRD执行方案与进度-v0.1.md`** — 执行范围与进度。
5. **`PROJECT-MEMORY.md`** — 上线记录与当前有效运营决策（随时间追加）。
6. **Agent / MVP 对外沟通与演示文档（2026-05-20 下午新增）** — 场景化导航：
   - **对外汇报必读（先读这 3 份）**
     - `FUNDAMENTAL-DeNA母公司AI战略与合作方式调研-v1.0.md`
     - `FUNDAMENTAL-DeNA-Pococha合作提案-一页纸-v0.1.md`
     - `FUNDAMENTAL-Pococha-市场与产品规划-v2.0.md`
   - **会议后跟进（会议后立刻对齐）**
     - `FUNDAMENTAL-Pococha-会议决议与执行确认-v0.1.md`
     - `FUNDAMENTAL-DeNA-China外联执行备忘-v0.1.md`
     - `FUNDAMENTAL-Agent-Demo加速方案-v0.1.md`
   - **Demo 录屏素材（录制/演示直接用）**
     - `FUNDAMENTAL-Demo录屏旁白稿-3分钟-日语-v0.1.md`
     - `FUNDAMENTAL-Demo录屏旁白稿-5分钟-日语-v0.1.md`

**`fundamental-agent-mvp/` 说明**：该目录是较早期的 Agent P1 接口样例与联调资料（FastAPI + OpenAPI + Postman/REST 示例），用于理解"最小可跑通接口链路"；当前线上店铺主链路仍以 `fundamental-originalprint-clone/` 为准。

**结账 URL 参数（正式）**：`customization_id`（snake_case）。兼容读取 `customizationId`（camelCase）仅作过渡。

**定制草稿持久化**：已配置 `DATABASE_URL` 时，定制记录写入 **PostgreSQL**（`customizations` 表）；无 DB 的本地验收仍可用 `.customizations-store.json`。

应用内补充说明：`fundamental-originalprint-clone/docs/`（如 `SITE-URLS-AND-NAV-v1.md`、`AIGC-API-MVP-SKELETON-v2.md`）。

## 3. Demo 视角：数据怎么流（AIGC 最小闭环）

1. **前台 / 后台 UI** 发起生成 → 调用 **`/app/api/aigc/**`** 下的 Route Handlers（Next 服务端）。
2. **任务状态** 落在 Drizzle schema / 仓库（见 `lib/aigc-*`、`lib/db/`）。
3. **异步拉结果**：`app/api/cron/aigc-worker/route.ts`（定时 Worker 逻辑与 PRD/执行文档对齐）。
4. **供应商实现**：`lib/aigc-providers/`、`lib/aigc-provider.ts`（抽象 + 具体厂商）。**未配置 `AIGC_PROVIDER` 时默认优先 TTAPI**（`TT_API_KEY`），其次 DashScope（`DASHSCOPE_API_KEY`）；见 [TTAPI 介绍](https://docs.ttapi.io/grids/cn/start/introduction)。

**产品经理记一句**：界面只负责「触发与展示」；真正调模型、落库、轮询，都在 **Next 后端（API + cron）** 这一层。

## 4. 改代码时优先打开的目录

| 领域 | 路径 |
| --- | --- |
| 页面与组件 | `fundamental-originalprint-clone/app/`、`components/` |
| HTTP API | `fundamental-originalprint-clone/app/api/` |
| AIGC 领域逻辑 | `fundamental-originalprint-clone/lib/aigc-*.ts`、`lib/aigc-providers/` |
| 集成 / ERP / CRM | `lib/integration/`、`app/api/integrations/`、`app/api/cron/integration-worker/` |
| 本地校验脚本 | `verify-clickflow.mjs`、`verify-mvp.mjs`、`package.json` 的 `check` |

## 5. Agent 安全边界（必须遵守）

- **不要手写** `n8nac-config.json`、n8n-manager 密钥目录；n8n 操作用 `npx --yes n8nac ...`（见 `AGENTS.md`）。
- **不要**在仓库里保存真实 API Key；用环境变量 / Vercel 环境配置。
- **不要**引入带 ` 2` 后缀的重复文件（历史误复制已清理）；应改原文件或显式新建有意义文件名。

## 6. 合并前自检（应用子目录内）

```bash
cd fundamental-originalprint-clone && npm run lint && npm run build
```

生产/预览环境首次启用定制落库：配置 `DATABASE_URL` 后执行 `npm run db:push`，或对已有库执行 [drizzle/add_customizations.sql](fundamental-originalprint-clone/drizzle/add_customizations.sql)（`IF NOT EXISTS`）。带库跑验收脚本前执行 **`npm run db:seed`**，再 **`npm run verify:with-db`**（或手动 `VERIFY_CLICKFLOW_WITH_DB=1 node verify-clickflow.mjs`）；详见 clone 内 `README`「本地 Postgres」节。

完整门禁见 `package.json` 的 `check`（含 `verify:clickflow` 与 `verify:mvp`）。

---

*本文件为 AI Native 重构的一部分：把「谁负责什么、真源在哪、数据怎么流」固定在仓库内，减少 agent 与协作者反复勘探成本。*
