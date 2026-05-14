import Link from "next/link";
import { notFound } from "next/navigation";
import { products } from "@/data/seed";
import { FulfillmentActions } from "@/components/FulfillmentActions";
import { InternalOrderOperationsPanel } from "@/components/InternalOrderOperationsPanel";
import { orderStatusZh, workorderStatusZh } from "@/lib/backoffice-ui-labels";
import { getOrder } from "@/lib/orders-store";
import { listExceptionRequestsByOrder } from "@/lib/exception-requests-store";
import { explainPricing, getPricingTemplate } from "@/lib/pricing-template";
import { listShipmentEventsByOrder } from "@/lib/shipment-events-store";
import { listSupportTicketsByOrder } from "@/lib/support-tickets-store";
import { storePath } from "@/lib/storefront-constants";
import { getWorkorder } from "@/lib/workorders-store";

const panelCard =
  "rounded-2xl border border-amber-100 bg-white p-4 shadow-sm shadow-amber-950/5 sm:p-5";

/** 内部运营：订单全链路（中文）— 与买家日语订单页分离 */
export default async function InternalOrderOpsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  const product = products.find((p) => p.product_id === order.product_id);
  const pricingTemplate = await getPricingTemplate();
  const pricingExplain = explainPricing(product?.price_from ?? order.unit_price, order.qty, pricingTemplate);
  const workorder = await getWorkorder(order.workorder_id);
  const shipmentEvents = await listShipmentEventsByOrder(order.order_id);
  const supportTickets = await listSupportTicketsByOrder(order.order_id);
  const exceptionRequests = await listExceptionRequestsByOrder(order.order_id);

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 via-white to-amber-50/50 p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-900/75">内部 · 订单运营</p>
            <h1 className="mt-0.5 text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">订单履约与异常</h1>
            <p className="mt-1 text-sm text-zinc-600">
              订单号 <span className="font-mono font-medium text-zinc-800">{order.order_no}</span>
              <span className="mx-1.5 text-zinc-300">·</span>
              内部 ID <span className="font-mono text-xs text-zinc-500">{order.order_id}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link
              href="/b/orders"
              className="rounded-full border border-amber-200/90 bg-white px-3 py-1.5 font-medium text-[#c2410c] shadow-sm transition hover:border-amber-300"
            >
              ← 订单工作台
            </Link>
            <Link
              href={storePath(`/orders/${order.order_id}`)}
              className="rounded-full border border-zinc-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900"
            >
              对照买家日语页
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <section className="space-y-5">
          <div className={panelCard}>
            <h2 className="text-sm font-bold text-zinc-900">交易链路 · 状态时间线</h2>
            <p className="mt-1 text-xs leading-relaxed text-zinc-600">
              下单 → 入队生产（ERP 建单）→ 工厂节点 → 发货回调；异常审批后写 CRM 并下发 ERP 指令。
            </p>
            <ol className="mt-4 space-y-4 border-l-2 border-amber-100 pl-4">
              <li className="relative">
                <span className="absolute -left-[23px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#e85c22] ring-2 ring-white" />
                <p className="text-sm font-semibold text-zinc-900">订单创建</p>
                <p className="text-xs text-zinc-600">
                  {new Date(order.created_at).toLocaleString("zh-CN")} · 当前：
                  <span className="ml-1 font-medium text-amber-950">{orderStatusZh(order.status)}</span>
                </p>
              </li>
              <li className="relative">
                <span className="absolute -left-[23px] top-1.5 h-2.5 w-2.5 rounded-full bg-amber-300 ring-2 ring-white" />
                <p className="text-sm font-semibold text-zinc-900">
                  ERP 生产工单：{workorderStatusZh(workorder?.status ?? "queued")}
                </p>
                <p className="text-xs text-zinc-600">
                  工厂：{workorder?.factory_name ?? "—"} ·{" "}
                  <span className="font-mono text-[11px]">{order.workorder_id}</span>
                </p>
                <a
                  href={`/api/workorders/${order.workorder_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-xs font-medium text-[#c2410c] underline-offset-2 hover:underline"
                >
                  打开工单 JSON（调试）
                </a>
              </li>
              {shipmentEvents.map((e) => (
                <li key={e.shipment_event_id} className="relative">
                  <span className="absolute -left-[23px] top-1.5 h-2.5 w-2.5 rounded-full bg-zinc-300 ring-2 ring-white" />
                  <p className="text-sm font-semibold text-zinc-900">{e.event_label}</p>
                  <p className="text-xs text-zinc-600">
                    {new Date(e.occurred_at).toLocaleString("zh-CN")} · {e.location}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          <FulfillmentActions variant="internal" orderId={order.order_id} />
        </section>

        <aside className="space-y-5">
          <div className={panelCard}>
            <h2 className="text-sm font-bold text-zinc-900">订单摘要</h2>
            <dl className="mt-3 grid gap-2 text-sm text-zinc-700">
              <div className="flex justify-between gap-4 border-b border-amber-50/80 py-1.5">
                <dt className="text-zinc-500">商品</dt>
                <dd className="text-right font-medium text-zinc-900">{product?.title ?? order.product_id}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-amber-50/80 py-1.5">
                <dt className="text-zinc-500">数量</dt>
                <dd className="tabular-nums">{order.qty}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-amber-50/80 py-1.5">
                <dt className="text-zinc-500">金额</dt>
                <dd className="tabular-nums font-medium">¥{order.total_amount.toLocaleString("zh-CN")}</dd>
              </div>
              <div className="rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2 text-xs">
                <p className="font-semibold text-zinc-800">定价明细（运营）</p>
                <p className="mt-1 text-zinc-700">
                  基础单价 ¥{pricingExplain.base_unit_price.toLocaleString("zh-CN")}
                  {pricingExplain.markup_percent !== 0
                    ? ` → 加价 ${pricingExplain.markup_percent}% 后 ¥${pricingExplain.marked_unit_price.toLocaleString("zh-CN")}`
                    : ""}
                  {pricingExplain.discount_percent > 0
                    ? ` → 阶梯折扣 ${pricingExplain.discount_percent}%（≥${pricingExplain.matched_tier_min_qty} 件）`
                    : " → 阶梯折扣 0%"}
                </p>
                <p className="mt-1 text-zinc-700">
                  实收单价 ¥{order.unit_price.toLocaleString("zh-CN")} × {order.qty} 件
                  {order.shipping_fee > 0
                    ? ` + 运费 ¥${order.shipping_fee.toLocaleString("zh-CN")}`
                    : " + 运费 ¥0（包邮）"}
                </p>
                <p className="mt-1 font-medium text-zinc-900">
                  实收总计：¥{order.total_amount.toLocaleString("zh-CN")}
                </p>
              </div>
              <div className="flex justify-between gap-4 py-1.5">
                <dt className="text-zinc-500">收件人</dt>
                <dd>{order.recipient_name}</dd>
              </div>
            </dl>
            {order.note?.trim() ? (
              <div className="mt-3 border-t border-amber-50 pt-3">
                <p className="text-xs font-semibold text-zinc-800">订单备注（含 AI 回写等）</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-zinc-700">
                  {order.note}
                </p>
              </div>
            ) : null}
            <div className="mt-4 border-t border-amber-50 pt-3">
              <p className="text-xs font-semibold text-zinc-800">印前包（PRD §8.3 / G4）</p>
              <p className="mt-1 text-xs text-zinc-600">
                下载 JSON：订单、商品、定制图层摘要（不含完整用户图）。需已登录后台。
              </p>
              <a
                href={`/api/backoffice/orders/${order.order_id}/prepress-metadata`}
                className="mt-2 inline-flex text-xs font-medium text-[#c2410c] underline-offset-2 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                下载 prepress-metadata.json →
              </a>
              <a
                href={`/api/backoffice/orders/${order.order_id}/prepress-bundle`}
                className="mt-2 ml-4 inline-flex text-xs font-medium text-[#c2410c] underline-offset-2 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                印前 bundle 清单（JSON）→
              </a>
            </div>
          </div>

          <InternalOrderOperationsPanel
            orderId={order.order_id}
            supportTickets={supportTickets}
            exceptionRequests={exceptionRequests}
          />
        </aside>
      </div>
    </div>
  );
}
