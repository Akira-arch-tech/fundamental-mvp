# AIGC 买家端 API — MVP 骨架（v2）

**相对 v1 的变化**：任务创建后默认 **`queued`**（不再同步 `ready`）；支持 **Postgres 持久化**（配置 `DATABASE_URL`）+ **Cron worker** 拾取队列；**参考图两步上传**（`multipart` → `asset_id` → `generations`）；`mode` 区分 **文生图 / 图生图 / 多参考**；`GET` 可带 **`warnings`**（模型降级说明）。实现入口：`lib/aigc-types.ts`、`lib/aigc-job-service.ts`、`lib/aigc-provider.ts`、`lib/aigc-provider-contract.ts`、`lib/aigc-providers/*`、`app/api/aigc/*`。

> 历史契约见 [AIGC-API-MVP-SKELETON-v1.md](./AIGC-API-MVP-SKELETON-v1.md)（已过时，仅作对照）。

## 限制与运行模式

| 项 | 说明 |
|----|------|
| **无 `DATABASE_URL`** | 任务在进程内 **内存 Map**；**GET 带懒执行**：轮询同一实例时会将 `queued` 推进到 `ready`。**多实例不共享**。 |
| **有 `DATABASE_URL`** | 任务写入表 **`aigc_generation_jobs`**；`GET` 与 **`GET /api/cron/aigc-worker`**（Vercel Cron，鉴权同 integration cron）调用 `runAigcWorkerBatch` 处理 `queued`。本地需 `npm run db:push` 同步 schema。 |
| **模型** | `AIGC_PROVIDER`：`mock`（默认）/ `fal` / `ttapi`。fal 使用 [Queue API](https://docs.fal.ai/model-endpoints/queue)；TTAPI 使用 Flux `generate`+`fetch`。密钥见下文 **环境变量**；**勿提交密钥到 git**。 |
| **参考图存储** | 未配置 `BLOB_READ_WRITE_TOKEN` 时为 **进程内 Map**（多实例不共享）。配置后写入 **Vercel Blob** 并返回公开 URL，worker 以 HTTPS 引用像素。 |
| **定制落库** | `POST .../confirm` **仍不写** `customizations`；前端用 `selected.url` 并入 `POST /api/customizations` 的 `user_images`（与 v1 一致）。 |

## Mock provider 与验收（`verify-clickflow`）

- **默认**：不设置 `AIGC_PROVIDER` 或设为 `mock`，全链路 **Mock** + picsum，**CI 必须保持此状态**，避免扣费。
- **本地 / 预发真模型**：设置 `AIGC_PROVIDER=fal` 或 `ttapi` 及对应密钥后，worker 会调用外部 API（产生费用）。
- **烟测脚本**（不经过 Next UI）：`npm run smoke:aigc:fal`（需 `FAL_KEY`）、`npm run smoke:aigc:ttapi`（需 `TT_API_KEY`）。
- **`verify-clickflow`**：仍只断言 mock 链路；不读取 fal/TTAPI。

## 端点总览

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/aigc/reference-assets` | `multipart/form-data`，字段 **`files`**（多文件） |
| POST | `/api/aigc/generations` | JSON 创建任务，返回 **`queued`** |
| GET | `/api/aigc/generations/[jobId]` | 轮询状态；`queued`/`processing` 时 `candidates` 通常为空 |
| POST | `/api/aigc/generations/[jobId]/confirm` | `candidate_index` 选定候选 |

共享路径常量：`lib/aigc-shared-constants.ts`（`AIGC_GENERATIONS_API_PATH`、`AIGC_REFERENCE_ASSETS_API_PATH`、张数/候选数上下限）。

## 环境变量（真模型 + Blob + 多实例）

| 变量 | 必填 | 说明 |
|------|------|------|
| `DATABASE_URL` | **生产强烈建议** | 有则任务入 Postgres，多实例 + 冷启动不丢 `queued` 任务。部署后执行 `npm run db:push`。 |
| `CRON_SECRET` 或 `INTEGRATION_WORKER_KEY` | **生产 Cron 建议** | `GET /api/cron/aigc-worker` 与 integration-worker 相同鉴权：`Authorization: Bearer <值>`。Vercel Cron 会带 `CRON_SECRET`。 |
| `AIGC_PROVIDER` | 否 | `mock`（默认）/ `fal` / `ttapi`。未设置等同 mock。 |
| `FAL_KEY` | fal 时必填 | fal Dashboard API Key；请求头 `Authorization: Key …`。 |
| `FAL_MODEL_ID` | 否 | 默认 `fal-ai/flux/schnell`；更换模型时改此变量。 |
| `TT_API_KEY` | ttapi 时必填 | TTAPI 控制台密钥；请求头 `TT-API-KEY`（代码里用 env 名 `TT_API_KEY` 避免 shell 特殊字符）。 |
| `TTAPI_FLUX_MODE` | 否 | Flux 模型枚举，默认 `flux1-dev`。 |
| `TTAPI_FLUX_SIZE` | 否 | 若 TTAPI 要求可设，如 `1024x1024`（见 TTAPI Flux 文档）。 |
| `BLOB_READ_WRITE_TOKEN` | 生产参考图建议 | 设置后 `POST /api/aigc/reference-assets` 写入 Vercel Blob；未设置则仍为进程内存（多实例不共享）。 |

**多实例可靠**：`DATABASE_URL` + Cron 拾取 `aigc-worker` 为主；单实例开发可无 DB 依赖 GET 懒处理完成 mock/短任务。

---

### 1. `POST /api/aigc/reference-assets`

**Content-Type**：`multipart/form-data`  
**字段**：`files` — 可重复，多文件；超过 `AIGC_MAX_REFERENCE_ASSET_COUNT`（默认 8）时截断。

**200 响应**

```json
{
  "assets": [
    { "asset_id": "ref_xxx", "expires_at": "2026-05-12T12:00:00.000Z", "name": "photo.jpg" }
  ],
  "requestId": "req_..."
}
```

**错误**：`422`（非 multipart / 无文件）、`400`（读流失败等）。

---

### 2. `POST /api/aigc/generations`

**Body（JSON）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `product_id` | string | 是 | `data/seed` 中存在的 `product_id` |
| `mode` | `"txt2img"` \| `"img2img"` \| `"multi_ref"` | 否 | 缺省规则：有 `references` → `multi_ref`；仅有 `reference_asset_ids` → `img2img`；否则 `txt2img` |
| `prompt` | string | **txt2img 必填** | 最长 2000 |
| `negative_prompt` | string | 否 | 最长 2000 |
| `aspect_ratio` | string | 否 | 透传 provider（mock 忽略） |
| `candidate_count` | number | 否 | 默认 2；范围 `AIGC_MIN_CANDIDATE_COUNT`–`AIGC_MAX_CANDIDATE_COUNT`（1–4） |
| `seed` | string | 否 | 最长 64 |
| `strength` | number | 否 | 0–1，图生图强度（mock 记录） |
| `reference_asset_ids` | string[] | **img2img 必填** | 须先经 `reference-assets` 注册；有序；最多 8 |
| `references` | `{ asset_id, role }[]` | **multi_ref 必填** | `role` ∈ `subject` \| `style` \| `layout` \| `other`；`asset_id` 须出现在 `reference_asset_ids`（可只传 `references`，服务端会补全 ids） |
| `composition_mode` | string | 否 | `blend` \| `collage_guided` \| `controlnet_stack`（产品与模型能力表对齐；mock 仅记录） |
| `reference_asset_count` | number | 否 | **已废弃**：占位兼容，优先 `reference_asset_ids` |

**200 响应**（创建成功；**非**最终就绪）

```json
{
  "job_id": "aigc_xxx",
  "status": "queued",
  "confirm_deadline_at": "2026-05-12T12:02:00.000Z",
  "candidate_count": 2,
  "mode": "txt2img",
  "warnings": ["任务已排队；候选生成完成后将刷新确认截止时间。"],
  "requestId": "req_..."
}
```

`confirm_deadline_at` 在任务 **`ready`** 时会按「首张候选可用」策略刷新（见实现 `aigc-job-service`）。

**错误**：`422` 校验、`404` 商品不存在、`400` JSON 非法。

---

### 3. `GET /api/aigc/generations/[jobId]`

轮询状态与候选。服务端会尝试推进 **`queued` → `processing` → `ready`**（视存储与 worker）。

**200 响应**（字段节选）

| 字段 | 说明 |
|------|------|
| `status` | `queued` \| `processing` \| `ready` \| `failed` \| `expired` \| `confirmed` |
| `mode` | 与创建时一致 |
| `candidates` | `ready` / `confirmed` 前有 URL；排队中为空 |
| `warnings` | 例如 mock 提示、多参考降级说明（与 `lib/aigc-provider` 一致） |
| `error` | `failed` 时人类可读消息（若实现返回结构化 `error_code`，以代码为准） |

超过确认时限未确认 → **`expired`**，`candidates` 清空（与政策一致）。

---

### 4. `POST /api/aigc/generations/[jobId]/confirm`

**Body**：`{ "candidate_index": 0 }`（与 v1 相同）

**200**：`status: "confirmed"`，`selected` 含选用候选的 `url`（短期 URL 时，前端应尽快写入 customization）。

---

## Cron 与鉴权

- **`GET /api/cron/aigc-worker`**：`Authorization: Bearer <CRON_SECRET>` 或 **`<INTEGRATION_WORKER_KEY>`**（与 `integration-worker` 相同策略）。
- Vercel 在 `vercel.json` 中可配置 schedule；未配置 Cron 时，**单实例 + GET 轮询**仍可完成 demo 队列消费。

## 本地 curl 示例

```bash
# 文生图：创建（queued）
curl -sS -X POST http://localhost:3000/api/aigc/generations \
  -H "Content-Type: application/json" \
  -d '{"product_id":"p1","prompt":"demo","mode":"txt2img","candidate_count":2}' | jq .

# 轮询至 ready
JOB_ID=aigc_xxx
curl -sS "http://localhost:3000/api/aigc/generations/$JOB_ID" | jq .

# 确认
curl -sS -X POST "http://localhost:3000/api/aigc/generations/$JOB_ID/confirm" \
  -H "Content-Type: application/json" \
  -d '{"candidate_index":0}' | jq .
```

## 修订记录

- **v2.1**：`AIGC_PROVIDER`（fal / ttapi）、Vercel Blob 参考图、烟测脚本、生产 Cron/DB 说明。
- **v2**：queued 状态机、DB/Cron、reference-assets、`mode` / `references` / `warnings`、与 `verify-clickflow` 对齐。
