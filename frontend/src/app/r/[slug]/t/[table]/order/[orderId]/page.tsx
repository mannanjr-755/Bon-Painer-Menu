import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import type { OrderItem } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { formatMoney, isCustomerEditable, STATUS_LABELS, type OrderStatus } from "@/lib/utils";

type Props = {
  params: Promise<{ slug: string; table: string; orderId: string }>;
  searchParams: Promise<{ updated?: string }>;
};

export default async function OrderConfirmationPage({ params, searchParams }: Props) {
  const { slug, table, orderId } = await params;
  const { updated } = await searchParams;

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      restaurant: { slug },
    },
    include: {
      items: true,
      table: true,
      restaurant: true,
    },
  });

  if (!order || String(order.table.tableNumber) !== table) {
    notFound();
  }

  const status = order.status as OrderStatus;

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-10 text-[var(--text)]">
      <div className="mx-auto max-w-md">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-2xl">
          {updated === "1" && (
            <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center text-sm font-medium text-emerald-300">
              Your order has been updated successfully
            </div>
          )}
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">
            Order confirmed
          </p>
          <h1 className="font-display mt-2 text-3xl text-[var(--gold-bright)]">{order.orderNumber}</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {order.restaurant.name} · Table {order.table.tableNumber}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
              <p className="text-xs text-[var(--text-dim)]">Customer</p>
              <p className="font-medium">{order.customerName}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
              <p className="text-xs text-[var(--text-dim)]">Status</p>
              <p className="font-medium text-[var(--gold-bright)]">{STATUS_LABELS[status] ?? order.status}</p>
            </div>
            {order.customerEmail && (
              <div className="col-span-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
                <p className="text-xs text-[var(--text-dim)]">Email</p>
                <p className="font-medium">{order.customerEmail}</p>
              </div>
            )}
            {order.specialRequest && (
              <div className="col-span-2 rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/10 p-3">
                <p className="text-xs text-[var(--gold)]">Special request</p>
                <p className="font-medium">{order.specialRequest}</p>
              </div>
            )}
            <div className="col-span-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
              <p className="text-xs text-[var(--text-dim)]">{updated === "1" ? "Last updated" : "Placed at"}</p>
              <p className="font-medium">{format(order.updatedAt, "PPp")}</p>
            </div>
          </div>

          <ul className="mt-6 space-y-3 border-t border-[var(--border)] pt-4">
            {order.items.map((item: OrderItem) => (
              <li key={item.id} className="flex justify-between gap-3 text-sm">
                <span>
                  <span className="font-medium text-[var(--gold-bright)]">{item.quantity}×</span> {item.itemName}
                </span>
                <span className="shrink-0 text-[var(--gold-bright)]">{formatMoney(item.subtotal)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex justify-between border-t border-[var(--border)] pt-4 text-base font-semibold">
            <span>Total</span>
            <span className="text-[var(--gold-bright)]">{formatMoney(order.total)}</span>
          </div>
        </div>

        {isCustomerEditable(order.status) && (
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Link
              href={`/r/${slug}/t/${table}?orderId=${orderId}&mode=edit`}
              className="flex items-center justify-center gap-2 rounded-xl border border-[var(--gold)]/50 bg-[var(--gold)]/10 px-4 py-3 text-sm font-semibold text-[var(--gold-bright)] transition hover:bg-[var(--gold)]/20"
            >
              <span className="text-lg">&#9998;&#65039;</span> Edit Order
            </Link>
            <Link
              href={`/r/${slug}/t/${table}?orderId=${orderId}&mode=add`}
              className="flex items-center justify-center gap-2 rounded-xl border border-[var(--gold)] bg-[var(--gold)] px-4 py-3 text-sm font-bold text-[var(--gold-bright)] transition hover:opacity-90"
            >
              <span className="text-lg">&#10133;</span> Add More Items
            </Link>
          </div>
        )}

        <Link
          href={`/r/${slug}/t/${table}`}
          className="mt-6 block text-center text-sm font-medium text-[var(--gold)] underline-offset-2 hover:underline"
        >
          Back to menu
        </Link>
        <p className="mt-4 text-center text-[10px] text-[var(--text-dim)]">{order.restaurant.name}</p>
      </div>
    </div>
  );
}
