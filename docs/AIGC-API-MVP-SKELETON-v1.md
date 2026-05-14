# AIGC 买家端 API — MVP 骨架（v1）

> **已过时**：当前实现与契约以 **[AIGC-API-MVP-SKELETON-v2.md](./AIGC-API-MVP-SKELETON-v2.md)** 为准（`queued`、参考图上传、多 `mode`、DB/Cron 等）。下文保留作历史对照。

内存任务存储 + 三个 HTTP 端点，供 `CustomizeEditor` 后续接 UI。**不调用真实模型**；候选图为 `picsum.photos` 占位。

> 实现代码（当前以 v2 为准）：`lib/aigc-types.ts`、`lib/aigc-job-service.ts`、`app/api/aigc/generations/*`

## 限制（必读）

| 项 | 说明 |
|----|------|
| 存储 | `globalThis` 内 `Map`；**Serverless 多实例 / 冷启动不共享**；仅 demo / 单测友好。生产换 **Redis + DB** 或队列。 |
| 状态 | 骨架创建后 **`ready` 立即返回**（无真实 `queued`→`processing` 延迟）；接模型后改 worker。 |
| 定制落库 | `POST .../confirm` **不写** `customizations`；前端拿到 `selected.url` 后自行并入 `POST /api/customizations` 的 `user_images`（或后续 asset 管线）。 |

## 端点

### 1. `POST /api/aigc/generations`

创建任务。

**Body（JSON）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `product_id` | string | 是 | 须为 `data/seed` 中存在的 `product_id` |
| `prompt` | string | 否 | 最长 2000 字符 |
| `reference_asset_count` | number | 否 | 0–8，占位；multipart 后续替换 |

**200 响应**

```json
{
  "job_id": "aigc_xxx",
  "status": "ready",
  "confirm_deadline_at": "2026-05-12T12:10:00.000Z",
  "candidate_count": 2,
  "requestId": "req_..."
}
```

**错误**：`422` 校验、`404` 商品不存在、`400` JSON 非法。响应头带 `X-Request-Id`。

---

### 2. `GET /api/aigc/generations/[jobId]`

轮询状态与候选列表。

**200 响应**（`ready` / `confirmed` 时带 `candidates`）

```json
{
  "job_id": "aigc_xxx",
  "product_id": "p1",
  "prompt": null,
  "reference_asset_count": 0,
  "status": "ready",
  "created_at": "...",
  "confirm_deadline_at": "...",
  "candidates": [
    { "index": 0, "url": "https://picsum.photos/seed/.../512/512", "width": 512, "height": 512 }
  ],
  "confirmed_index": null,
  "error": null,
  "requestId": "req_..."
}
```

超过 `confirm_deadline_at` 且未确认时，惰性更新为 **`expired`**，`candidates` 置空。

---

### 3. `POST /api/aigc/generations/[jobId]/confirm`

在确认窗内选定候选。

**Body（JSON）**

```json
{ "candidate_index": 0 }
```

**200 响应**

```json
{
  "job_id": "aigc_xxx",
  "status": "confirmed",
  "selected": { "index": 0, "url": "...", "width": 512, "height": 512 },
  "next_step_hint": "Call POST /api/customizations ...",
  "requestId": "req_..."
}
```

**错误**：`404` 无任务、`409` 已过期或已确认、`422` 状态不允许或 index 非法。

---

## 确认窗时长

与政策一致：**10 分钟**（`lib/aigc-job-service.ts` 内 `CONFIRM_WINDOW_MS`）。

## 本地 curl 示例

```bash
# 创建
curl -sS -X POST http://localhost:3000/api/aigc/generations \
  -H "Content-Type: application/json" \
  -d '{"product_id":"p1","prompt":"demo"}' | jq .

# 查询（替换 JOB_ID）
curl -sS "http://localhost:3000/api/aigc/generations/JOB_ID" | jq .

# 确认
curl -sS -X POST "http://localhost:3000/api/aigc/generations/JOB_ID/confirm" \
  -H "Content-Type: application/json" \
  -d '{"candidate_index":0}' | jq .
```

## 修订记录

- **v1**：首版骨架（内存 + 占位图 + 三路由）。
