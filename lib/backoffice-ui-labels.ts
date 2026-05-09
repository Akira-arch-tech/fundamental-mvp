/** 管理后台：枚举值 → 中文展示（仅 UI，不改变 API 存值） */

export function orderStatusZh(status: string): string {
  const m: Record<string, string> = {
    created: "已下单",
    reviewing: "审图中",
    in_production: "生产中",
    shipped: "已发货",
    delivered: "已送达",
    closed: "已关闭",
  };
  return m[status] ?? status;
}

/** 订单状态 · 列表徽章底色（与异常/任务风格一致） */
export function orderStatusBadgeClass(status: string): string {
  if (status === "created") return "bg-sky-50 text-sky-900 ring-1 ring-sky-200";
  if (status === "reviewing") return "bg-violet-50 text-violet-900 ring-1 ring-violet-200";
  if (status === "in_production") return "bg-amber-50 text-amber-950 ring-1 ring-amber-200";
  if (status === "shipped") return "bg-indigo-50 text-indigo-900 ring-1 ring-indigo-200";
  if (status === "delivered") return "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200";
  if (status === "closed") return "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200";
  return "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200";
}

export function exceptionStatusZh(status: string): string {
  const m: Record<string, string> = {
    submitted: "已提交",
    processing: "处理中",
    approved: "已通过",
    rejected: "已拒绝",
  };
  return m[status] ?? status;
}

export function exceptionStatusBadgeClass(status: string): string {
  if (status === "submitted") return "bg-sky-50 text-sky-800 ring-1 ring-sky-200";
  if (status === "processing") return "bg-amber-50 text-amber-900 ring-1 ring-amber-200";
  if (status === "approved") return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200";
  if (status === "rejected") return "bg-red-50 text-red-800 ring-1 ring-red-200";
  return "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200";
}

export function exceptionTypeZh(type: string): string {
  const m: Record<string, string> = {
    redesign: "改图",
    reship: "补发",
    refund: "退款",
  };
  return m[type] ?? type;
}

export function operatorRoleZh(role: string): string {
  const m: Record<string, string> = {
    customer_service: "客服",
    ops: "运营",
    admin: "管理员",
    system: "系统",
  };
  return m[role] ?? role;
}

export function jobStatusZh(status: string): string {
  const m: Record<string, string> = {
    pending: "待处理",
    processing: "处理中",
    success: "成功",
    failed: "失败",
    dead_letter: "死信",
  };
  return m[status] ?? status;
}

export function jobStatusBadgeClass(status: string): string {
  if (status === "success") return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200";
  if (status === "pending" || status === "processing") return "bg-amber-50 text-amber-900 ring-1 ring-amber-200";
  if (status === "failed") return "bg-orange-50 text-orange-900 ring-1 ring-orange-200";
  if (status === "dead_letter") return "bg-red-50 text-red-800 ring-1 ring-red-200";
  return "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200";
}

export function targetSystemZh(s: string): string {
  if (s === "erp") return "ERP";
  if (s === "crm") return "CRM";
  return s.toUpperCase();
}

/** 对接任务 event_type → 简短中文 */
export function integrationEventZh(eventType: string): string {
  const map: Record<string, string> = {
    "erp.order_created": "ERP · 建单",
    "crm.exception_updated": "CRM · 异常同步",
    "erp.exception_instruction": "ERP · 异常指令",
  };
  return map[eventType] ?? eventType;
}

export function workorderStatusZh(status: string): string {
  const m: Record<string, string> = {
    queued: "待排产",
    printing: "印刷中",
    packed: "已打包",
    shipped: "已交运",
  };
  return m[status] ?? status;
}

export function alertLevelZh(level: string): string {
  const m: Record<string, string> = {
    info: "信息",
    warn: "警告",
    warning: "警告",
    error: "错误",
  };
  return m[level.toLowerCase()] ?? level;
}

export function alertLevelBadgeClass(level: string): string {
  const l = level.toLowerCase();
  if (l === "error") return "bg-red-50 text-red-900 ring-1 ring-red-200";
  if (l === "warn" || l === "warning") return "bg-amber-50 text-amber-950 ring-1 ring-amber-200";
  return "bg-sky-50 text-sky-900 ring-1 ring-sky-200";
}
