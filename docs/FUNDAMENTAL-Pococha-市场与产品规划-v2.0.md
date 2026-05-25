# FUNDAMENTAL × Pococha/DeNA — 市场与产品规划 v2.0

版本：v2.0 · 日期：2026-05-19  
前置：FUNDAMENTAL-日本POD市场规划-GTM策略-v1.0.md · FUNDAMENTAL-DeNA母公司AI战略与合作方式调研-v1.0.md · 会议决议

---

## 1. 定位

**一句话（中文）**  
日本唯一将 AIGC 定制生图 与 兴趣群组私域运营 内嵌于 B2B 应援 POD 的服务商，首发场景为 Pococha 系ライバー事務所。

**一句话（日文·对外）**  
AIデザイン × コミュニティ運営で、推し活グッズの新しいかたちをつくる。  
AI が推しの絆を、実物とアプリ内ギフトの両方で形にする。

---

## 2. 两大核心壁垒

### 2.1 AI Native（技术）

|  | 传统 POD | FUNDAMENTAL |
|--|---------|------------|
| 设计 | 事务所自备设计稿，设计师 ¥3–10万/套，2–4 周 | 描述风格 → 分钟级 T2I/I2I/Multi-ref → 选图 → 印前 |
| 改稿 | 慢、成本高 | 改稿秒级、设计费内嵌于服务包 |

工程真源：`fundamental-originalprint-clone` 生图网关（`/api/aigc/*`）+ FUNDAMENTAL DA（`/design-chat`）。

### 2.2 兴趣群组私域（流量）

| 平台 | 角色 |
|------|------|
| LINE OpenChat | 养信任、测品味、设计投票 |
| LINE OA | 众筹上线/冲刺推送 |
| Discord | 深度粉、投票 bot、设计讨论 |
| X/Twitter | 公域引流、晒单传播 |
| Pococha 直播间 | 高情绪场景即时转化 |

组合效果：Discord 投票 → LINE 通知 → 直播口播 → Twitter 晒单 → 下一轮拉新（竞品无法复制）。

---

## 3. MVP 切入点（已确认）

**唯一首选：Pococha 系ライバー事務所 × Discord + LINE 双层社群**

| 痛点 | FUNDAMENTAL 解法 |
|------|----------------|
| 设计师贵 | AIGC 免额外设计费 |
| 不会卖 | 四平台运营 SOP + 素材包（Community Kit） |
| 怕库存 | 众筹零库存 POD |
| 不知粉丝喜好 | Discord 投票 + LINE 问卷，先问再产 |

---

## 4. 产品线：实体 + 虚拟（分 Phase）

| Phase | 产品 | 交付 | 收入依赖 |
|-------|------|------|---------|
| P1 | 实体应援 POD | 可演示 Agent 全流程 + 真实样品单 | 是 |
| P2 | Pococha 应用内虚拟礼物 | Mock UI + 素材包规范 + 对接假设 | 否（合作筹码） |

> **P2 不假装已接入**；对外表述为「DeNA / Pococha 联合试点意向」。

---

## 5. 产品：FUNDAMENTAL DA — Pococha 応援パートナー

### 5.1 Agent 六模块

1. **Intake** — 主播风格、粉丝层、社群平台
2. **Design** — 商品选型 → AIGC → 确认/迭代
3. **Community Kit** — LINE×3、Discord 投票帖、直播 30 秒稿
4. **Commerce** — 众筹文案 + `customization_id` 结账预览
5. **Virtual Gift Pack（P2）** — 礼物图标规范 + Mock 页引导
6. **Handoff** — 印前包 / 工单（对齐 PRD G3–G4）

### 5.2 演示入口

| URL | 用途 |
|-----|------|
| `/design-chat` | B2B 15 分钟可走完的日语对话流 |
| `/pococha-virtual-gift` | Phase 2 虚拟礼物 Mock（无真实 API） |

PRD 详见：`fundamental-originalprint-clone/docs/POCOCHA-DESIGN-AGENT-PRD-v0.1.md`。

---

## 6. DeNA 合作策略

### 6.1 为什么契合

- DeNA AI-ALL-IN + Pococha 絆 叙事 → FUNDAMENTAL 补「粉丝应援商品化」闭环
- For & With Startups：DeNA as Customer 沙盒、Go to Market（直播社区）、Boost Guides 合规维度

### 6.2 双通道

| 通道 | 动作 |
|------|------|
| DeNA China | 中文破冰 → 转介日本 Pococha 事业部 |
| Delight Ventures / Pococha 本部 | 试点 + Phase 2 虚拟礼物联合设计 |

- 提案：`FUNDAMENTAL-DeNA-Pococha合作提案-一页纸-v0.1.md`
- 外联备忘：`FUNDAMENTAL-DeNA-China外联执行备忘-v0.1.md`

### 6.3 数据合规（对接 Boost Guides）

- 生成图 10 分钟确认窗口；发货后删除（PRD v0.3.2）
- 仅用户自有/授权素材；可审计 AIGC 调用日志
- 用户数据最小化；不做 Pococha 用户数据回传（除非 signed DPA）

---

## 7. GTM 时间线（3 个月）

| 阶段 | 时间 | 动作 |
|------|------|------|
| 0 | Week 1–2 | Demo 就绪 + DeNA China 联系 + 人脉内推 1 家事务所 |
| 1 | Month 1 | 签约并启动联合众筹 ≥¥200,000 |
| 2 | Month 2 | 履约 + Case Study |
| 3 | Month 3 | 携数据二次接触 DeNA（虚拟礼物 Phase 2） |

获客渠道优先级：人脉内推 > Twitter DM > Kibidango > SUZURI 数据背书。

---

## 8. 风险

| 风险 | 缓解 |
|------|------|
| Pococha 礼物 API 不可得 | P1 收入不依赖 P2 |
| DeNA 决策链长 | 沙盒试点 + 小预算可验证 |
| 演示穿帮 | Agent 生图走 AIGC 网关，非仅 placeholder |
| IP 风险 | 主播授权 MOU + 禁未授权素材 |

---

## 9. 文档与代码索引

| 类型 | 路径 |
|------|------|
| 会议决议 | `FUNDAMENTAL-Pococha-会议决议与执行确认-v0.1.md` |
| 日本 GTM v1 | `FUNDAMENTAL-日本POD市场规划-GTM策略-v1.0.md` |
| DeNA 调研 | `FUNDAMENTAL-DeNA母公司AI战略与合作方式调研-v1.0.md` |
| Agent PRD | `fundamental-originalprint-clone/docs/POCOCHA-DESIGN-AGENT-PRD-v0.1.md` |
| 虚拟礼物假设 | `fundamental-originalprint-clone/docs/POCOCHA-VIRTUAL-GIFT-对接假设-v0.1.md` |
| B2B 验收 | `fundamental-originalprint-clone/docs/FUNDAMENTAL-AI-Agent-B2B验收测试单-v1.0-实测.md` |
