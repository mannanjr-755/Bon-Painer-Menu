export const ORDER_STATUSES = [
  "NEW",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "COMPLETED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: "New",
  ACCEPTED: "Accepted",
  PREPARING: "Preparing",
  READY: "Ready",
  COMPLETED: "Completed",
};

/** Statuses a customer may still modify via the normal ordering flow */
export const EDITABLE_CUSTOMER_STATUSES: readonly OrderStatus[] = ["NEW", "ACCEPTED"];

/** Orders older than this are treated as stale when matching an active session */
export const ACTIVE_SESSION_WINDOW_MS = 6 * 60 * 60 * 1000;

export function isCustomerEditable(status: string): boolean {
  return EDITABLE_CUSTOMER_STATUSES.includes(status as OrderStatus);
}

/** Next allowed status in the flow, or null if already completed */
export function nextStatus(current: string): OrderStatus | null {
  const index = ORDER_STATUSES.indexOf(current as OrderStatus);
  if (index < 0 || index >= ORDER_STATUSES.length - 1) return null;
  return ORDER_STATUSES[index + 1];
}

export function formatMoney(amount: number): string {
  return `Rs. ${new Intl.NumberFormat("en-PK").format(Math.round(amount))}`;
}

export function parseJsonObject(value: string | null | undefined): Record<string, string> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    /* ignore */
  }
  return {};
}
