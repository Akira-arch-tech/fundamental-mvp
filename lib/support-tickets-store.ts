import fs from "node:fs/promises";
import path from "node:path";
import type { SupportTicketRecord } from "@/lib/types";

const STORE_PATH = process.env.VERCEL ? "/tmp/.support-tickets-store.json" : path.join(process.cwd(), ".support-tickets-store.json");

function newSupportTicketId(): string {
  const hex = () => Math.random().toString(16).slice(2, 10);
  return `sup_${hex()}${hex()}`;
}

/** 买家端展示用：日语自动回复（内部后台可对照原文） */
function generateAnswer(question: string): string {
  const q = question.toLowerCase();
  if (q.includes("改") || q.includes("design") || q.includes("デザイン") || q.includes("差し替え")) {
    return "デザイン修正のご要望を記録しました。データ確認キューに回し、通常24時間以内にご案内します。";
  }
  if (
    q.includes("发货") ||
    q.includes("物流") ||
    q.includes("shipping") ||
    q.includes("発送") ||
    q.includes("配送")
  ) {
    return "物流のノードはご注文ページのタイムラインに反映されます。最新ステータスをそちらでご確認ください。";
  }
  if (q.includes("退款") || q.includes("refund") || q.includes("返金")) {
    return "返金は「特別対応のお申し出」から正式にご申請ください。審査は順次、担当よりご連絡します。";
  }
  return "お問い合わせを受け付けました。内容を確認のうえ、担当よりご返信します。お急ぎの場合は特別対応のお申し出もご利用ください。";
}

async function readStore(): Promise<Record<string, SupportTicketRecord>> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf-8");
    return JSON.parse(raw) as Record<string, SupportTicketRecord>;
  } catch {
    return {};
  }
}

async function writeStore(data: Record<string, SupportTicketRecord>) {
  await fs.writeFile(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export async function createSupportTicket(orderId: string, question: string): Promise<SupportTicketRecord> {
  const now = new Date().toISOString();
  const record: SupportTicketRecord = {
    support_ticket_id: newSupportTicketId(),
    order_id: orderId,
    question,
    answer: generateAnswer(question),
    status: "answered",
    created_at: now,
  };
  const store = await readStore();
  store[record.support_ticket_id] = record;
  await writeStore(store);
  return record;
}

export async function listSupportTicketsByOrder(orderId: string): Promise<SupportTicketRecord[]> {
  const store = await readStore();
  return Object.values(store)
    .filter((t) => t.order_id === orderId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}
