import Link from "next/link";
import { notFound } from "next/navigation";
import { products } from "@/data/seed";
import { CustomerOrderSupportPanel } from "@/components/CustomerOrderSupportPanel";
import { getOrder } from "@/lib/orders-store";
import { listExceptionRequestsByOrder } from "@/lib/exception-requests-store";
import { listShipmentEventsByOrder } from "@/lib/shipment-events-store";
import { listSupportTicketsByOrder } from "@/lib/support-tickets-store";
import { storePath } from "@/lib/storefront-constants";
import { getWorkorder } from "@/lib/workorders-store";

/** 买家可见的订单状态（日语） */
function orderStatusLabelJp(status: string): string {
  const map: Record<string, string> = {
    created: "ご注文を承りました",
    reviewing: "データ確認中",
    in_production: "製作中",
    shipped: "発送済み",
    delivered: "お届け完了",
    closed: "完了",
  };
  return map[status] ?? status;
}

/** 工場進捗は簡易表示のみ（詳細は社内管理画面） */
function workorderStatusJp(status: string): string {
  const map: Record<string, string> = {
    queued: "受付・割当待ち",
    printing: "印刷中",
    packed: "梱包済み",
    shipped: "出荷処理中",
  };
  return map[status] ?? status;
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  const product = products.find((p) => p.product_id === order.product_id);
  const workorder = await getWorkorder(order.workorder_id);
  const shipmentEvents = await listShipmentEventsByOrder(order.order_id);
  const supportTickets = await listSupportTicketsByOrder(order.order_id);
  const exceptionRequests = await listExceptionRequestsByOrder(order.order_id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">ご注文の進捗</h1>
          <p className="mt-1 text-sm text-zinc-500">
            注文番号：<span className="font-mono tracking-tight">{order.order_no}</span>
          </p>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-zinc-600">
            ご入金確認後、データチェック → 製造ライン割当 → 印刷・加工 → 梱包 →
            発送の順で進みます。各ステップが完了すると、下のタイムラインに反映されます。
          </p>
        </div>
        <Link href={storePath("/products")} className="text-sm text-[#e85c22] hover:underline">
          商品一覧へ戻る →
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-zinc-800">ステータス</h2>
          <p className="mt-1 text-xs text-zinc-500">現在：{orderStatusLabelJp(order.status)}</p>
          <ol className="mt-4 space-y-3 border-l border-zinc-200 pl-4">
            <li className="relative">
              <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#e85c22]" />
              <p className="text-sm font-semibold text-zinc-800">ご注文を受け付けました</p>
              <p className="text-xs text-zinc-500">
                {new Date(order.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
              </p>
            </li>
            <li className="relative">
              <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-zinc-300" />
              <p className="text-sm font-semibold text-zinc-800">
                製造ステータス：{workorderStatusJp(workorder?.status ?? "queued")}
              </p>
              <p className="text-xs text-zinc-500">
                提携工場での進行状況です。詳細な社内指示は運営管理画面で確認します。
              </p>
            </li>
            {shipmentEvents.map((e) => (
              <li key={e.shipment_event_id} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-zinc-400" />
                <p className="text-sm font-semibold text-zinc-800">{e.event_label}</p>
                <p className="text-xs text-zinc-500">
                  {new Date(e.occurred_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })} ·{" "}
                  {e.location}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold text-zinc-800">ご注文内容</h2>
            <div className="mt-2 space-y-1 text-sm text-zinc-600">
              <p>商品：{product?.title ?? order.product_id}</p>
              <p>数量：{order.qty}</p>
              <p>お支払い合計：¥{order.total_amount.toLocaleString("ja-JP")}</p>
              <p>お届け先：{order.recipient_name}</p>
            </div>
          </div>

          <CustomerOrderSupportPanel
            orderId={order.order_id}
            supportTickets={supportTickets}
            exceptionRequests={exceptionRequests}
          />
        </aside>
      </div>
    </div>
  );
}
