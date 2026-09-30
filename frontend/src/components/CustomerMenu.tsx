"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  ClipboardList,
  Heart,
  MapPin,
  Minus,
  Phone,
  Plus,
  Search,
  ShoppingCart,
  Smile,
} from "lucide-react";
import { formatMoney, isCustomerEditable, STATUS_LABELS } from "@/lib/utils";
import { TABLE_GEOFENCE_RADIUS_M } from "@/lib/geofence";
import { useTableGeofence } from "@/hooks/useTableGeofence";
import { ThemeToggle } from "@/components/ThemeToggle";

const FEEDBACK_URL = "https://www.google.com/search?q=BonPainer";
type ActiveOrderItem = {
  id: string;
  menuItemId: string | null;
  itemName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

type ActiveOrder = {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  items: ActiveOrderItem[];
};

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  available: boolean;
  categoryId: string;
  featured: boolean;
  popular: boolean;
  todaySpecial: boolean;
  options: string | null;
};

type ParsedOptions = {
  variants: { name: string; priceAdj: number }[];
  addOns: { name: string; price: number }[];
};

function parseOptions(raw: string | null): ParsedOptions {
  if (!raw) return { variants: [], addOns: [] };
  try {
    const parsed = JSON.parse(raw);
    return {
      variants: parsed.variants || [],
      addOns: parsed.addOns || [],
    };
  } catch {
    return { variants: [], addOns: [] };
  }
}

type Category = {
  id: string;
  name: string;
  items: MenuItem[];
};

type CartLine = {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  variant?: string;
  addOns?: { name: string; price: number }[];
  specialInstructions?: string;
};

type RestaurantInfo = {
  name: string;
  slug: string;
  logo: string | null;
  coverImage: string | null;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  googleMapsUrl: string | null;
  openingHours: Record<string, string>;
  socialLinks: Record<string, string>;
};

const CATEGORY_ICON: Record<string, string> = {
  All: "✦",
  "Chicken Karahi": "🍗",
  Handi: "🍲",
  Tandoor: "🫓",
  "Chicken Biryani": "🍚",
  "Chicken Kabab": "🍢",
  "Chicken B.B.Q": "🔥",
  "Chicken Rolls": "🌯",
  "Beef Biryani": "🍚",
  "Beef Kabab": "🍢",
  "Beef B.B.Q": "🔥",
  "Beef Roll": "🌯",
  "Beef Fry Kabab": "🍢",
  "Beverages & Sides": "🥤",
};

export function CustomerMenu({
  restaurant,
  categories: initialCategories,
  tableNumber,
  activeOrder: initialActiveOrder,
}: {
  restaurant: RestaurantInfo;
  categories: Category[];
  tableNumber: number;
  activeOrder: ActiveOrder | null;
}) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [categoriesBaseline, setCategoriesBaseline] = useState(initialCategories);
  const [activeCategory, setActiveCategory] = useState("all");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [search, setSearch] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [specialRequest, setSpecialRequest] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [activeOrder] = useState<ActiveOrder | null>(initialActiveOrder);
  const [detailItem, setDetailItem] = useState<MenuItem | null>(null);
  const [detailQty, setDetailQty] = useState(1);
  const [detailVariant, setDetailVariant] = useState<string>("");
  const [detailAddOns, setDetailAddOns] = useState<Set<string>>(new Set());
  const [detailInstructions, setDetailInstructions] = useState("");
  const [serviceBusy, setServiceBusy] = useState<"WAITER" | "BILL" | null>(null);

  const searchParams = useSearchParams();
  const editingOrderId = searchParams.get("orderId");
  const editMode = searchParams.get("mode") as "edit" | "add" | null;
  const isEditMode = !!editingOrderId;
  const geofence = useTableGeofence(restaurant.slug, tableNumber);

  // Keep customer menu in sync when server props change (CRM / shared DB).
  if (initialCategories !== categoriesBaseline) {
    setCategoriesBaseline(initialCategories);
    setCategories(initialCategories);
  }

  useEffect(() => {
    let cancelled = false;

    async function refreshMenu() {
      try {
        const res = await fetch(`/api/menu?slug=${encodeURIComponent(restaurant.slug)}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.categories)) {
          setCategories(data.categories);
        }
      } catch {
        // Ignore transient network errors while polling.
      }
    }

    refreshMenu();
    const id = setInterval(refreshMenu, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [restaurant.slug]);

  // Load existing order when editing/adding more items
  useEffect(() => {
    if (!editingOrderId) return;

    let cancelled = false;

    async function loadOrder() {
      try {
        const res = await fetch(`/api/orders/${editingOrderId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data.order) return;

        const order = data.order;
        setCart(
          order.items.map((item: { menuItemId: string; itemName: string; unitPrice: number; quantity: number }) => ({
            menuItemId: item.menuItemId,
            name: item.itemName,
            price: item.unitPrice,
            quantity: item.quantity,
          }))
        );
        setCustomerName(order.customerName || "");
        setCustomerEmail(order.customerEmail || "");
        setCustomerPhone(order.customerPhone || "");
        setSpecialRequest(order.specialRequest || "");

        if (editMode === "edit") {
          setShowCart(true);
        }
      } catch {
        // ignore
      }
    }

    loadOrder();
    return () => { cancelled = true; };
  }, [editingOrderId, editMode, tableNumber]);

  const cartCount = cart.reduce((s, l) => s + l.quantity, 0);
  const cartTotal = cart.reduce((s, l) => s + l.price * l.quantity, 0);

  const visibleItems = useMemo(() => {
    let items =
      activeCategory === "all"
        ? categories.flatMap((c) => c.items.filter((i) => i.available))
        : (categories.find((c) => c.id === activeCategory)?.items ?? []).filter((i) => i.available);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (i) => i.name.toLowerCase().includes(q) || (i.description?.toLowerCase().includes(q) ?? false)
      );
    }
    return items;
  }, [activeCategory, categories, search]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  async function sendTableRequest(type: "WAITER" | "BILL") {
    if (serviceBusy) return;
    setServiceBusy(type);
    try {
      const res = await fetch("/api/table-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantSlug: restaurant.slug,
          tableNumber,
          type,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        flash(
          type === "WAITER"
            ? "Could not send waiter request. Please try again."
            : "Could not send bill request. Please try again."
        );
        return;
      }
      flash(
        type === "WAITER"
          ? data.request?.message || "Waiter request sent successfully."
          : data.request?.message || "Bill request sent successfully."
      );
    } catch {
      flash(
        type === "WAITER"
          ? "Could not send waiter request. Please try again."
          : "Could not send bill request. Please try again."
      );
    } finally {
      setServiceBusy(null);
    }
  }

  function ItemCard({ item }: { item: MenuItem }) {
    const parsed = parseOptions(item.options);
    const hasOptions = parsed.variants.length > 0 || parsed.addOns.length > 0;

    return (
      <article className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)] transition hover:border-[var(--gold)]/40">
        <div className="relative h-40 bg-[var(--bg-elevated)]">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
          ) : null}
          <button
            type="button"
            onClick={() =>
              setFavorites((prev) => {
                const next = new Set(prev);
                if (next.has(item.id)) next.delete(item.id);
                else next.add(item.id);
                return next;
              })
            }
            className={`absolute right-2 top-2 rounded-full bg-[var(--overlay)] p-2 ${
              favorites.has(item.id) ? "text-red-400" : "text-white"
            }`}
          >
            <Heart className={`h-4 w-4 ${favorites.has(item.id) ? "fill-current" : ""}`} />
          </button>
          {item.todaySpecial && (
            <span className="absolute left-2 top-2 rounded-full bg-[var(--gold)] px-2 py-0.5 text-[10px] font-bold text-[var(--gold-bright)]">
              Special
            </span>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-semibold">{item.name}</h3>
          <p className="mt-1 line-clamp-2 text-xs text-[var(--text-muted)]">{item.description}</p>
          {hasOptions && (
            <p className="mt-1 text-[10px] text-[var(--gold)]">Customizable</p>
          )}
          <div className="mt-3 flex items-center justify-between">
            <span className="font-semibold text-[var(--gold-bright)]">{formatMoney(item.price)}</span>
            <button
              type="button"
              onClick={() => {
                if (hasOptions) {
                  setDetailItem(item);
                  setDetailQty(1);
                  setDetailVariant(parsed.variants[0]?.name || "");
                  setDetailAddOns(new Set());
                  setDetailInstructions("");
                } else {
                  addToCart(item);
                }
              }}
              className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--gold)] text-[var(--gold-bright)]"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </article>
    );
  }

  function addToCart(item: MenuItem, options?: { variant?: string; addOns?: { name: string; price: number }[]; specialInstructions?: string; qty?: number }) {
    const qty = options?.qty || 1;
    const addOns = options?.addOns || [];
    const variant = options?.variant || "";
    const instructions = options?.specialInstructions || "";

    const parsed = parseOptions(item.options);
    let unitPrice = item.price;
    if (variant) {
      const v = parsed.variants.find((v) => v.name === variant);
      if (v) unitPrice += v.priceAdj;
    }
    unitPrice += addOns.reduce((sum, a) => sum + a.price, 0);

    const key = `${item.id}|${variant}|${addOns.map((a) => a.name).sort().join(",")}`;

    setCart((prev) => {
      if (!options) {
        const existing = prev.find((l) => l.menuItemId === item.id && !l.variant && (!l.addOns || l.addOns.length === 0));
        if (existing) {
          return prev.map((l) =>
            l.menuItemId === item.id && !l.variant ? { ...l, quantity: l.quantity + 1 } : l
          );
        }
        return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }];
      }

      const existing = prev.find((l) => {
        const lKey = `${l.menuItemId}|${l.variant || ""}|${(l.addOns || []).map((a) => a.name).sort().join(",")}`;
        return lKey === key;
      });
      if (existing) {
        return prev.map((l) => {
          const lKey = `${l.menuItemId}|${l.variant || ""}|${(l.addOns || []).map((a) => a.name).sort().join(",")}`;
          return lKey === key ? { ...l, quantity: l.quantity + qty } : l;
        });
      }
      return [...prev, {
        menuItemId: item.id,
        name: item.name,
        price: unitPrice,
        quantity: qty,
        variant: variant || undefined,
        addOns: addOns.length > 0 ? addOns : undefined,
        specialInstructions: instructions || undefined,
      }];
    });
    flash("Added to cart");
  }

  function updateQty(menuItemId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) => (l.menuItemId === menuItemId ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0)
    );
  }

  async function placeOrder() {
    setError(null);
    if (!customerName.trim()) return setError("Please enter your name.");
    if (customerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
      return setError("Please enter a valid email address.");
    }

    if (!cart.length) return setError("Your cart is empty.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantSlug: restaurant.slug,
          tableNumber,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim() || null,
          customerPhone: customerPhone.trim() || null,
          specialRequest: specialRequest.trim() || null,
          items: cart.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not place order.");
        return;
      }
      router.push(`/r/${restaurant.slug}/t/${tableNumber}/order/${data.order.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const updateOrder = useCallback(async () => {
    setError(null);
    if (!customerName.trim()) return setError("Please enter your name.");
    if (customerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
      return setError("Please enter a valid email address.");
    }
    if (!cart.length) return setError("Your cart is empty.");
    if (!editingOrderId) return setError("No order to update.");

    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${editingOrderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantSlug: restaurant.slug,
          tableNumber,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim() || null,
          customerPhone: customerPhone.trim() || null,
          specialRequest: specialRequest.trim() || null,
          items: cart.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not update order.");
        return;
      }
      router.push(`/r/${restaurant.slug}/t/${tableNumber}/order/${editingOrderId}?updated=1`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [cart, customerName, customerEmail, customerPhone, specialRequest, editingOrderId, restaurant.slug, router, tableNumber]);

  function loadActiveOrderIntoCart(order: ActiveOrder) {
    setCart(
      order.items.map((item) => ({
        menuItemId: item.menuItemId || item.id,
        name: item.itemName,
        price: item.unitPrice,
        quantity: item.quantity,
      }))
    );
  }

  function handleSidebarEditOrder() {
    if (!activeOrder) return;
    loadActiveOrderIntoCart(activeOrder);
    setShowCart(true);
  }

  function handleSidebarAddMore() {
    if (!activeOrder) return;
    loadActiveOrderIntoCart(activeOrder);
    flash("Existing items loaded. Add more from the menu!");
  }

  const inputClass =
    "w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-dim)] focus:border-[var(--gold)]";

  if (geofence.locked) {
    const title =
      geofence.status === "requesting"
        ? "Checking your location…"
        : geofence.status === "denied"
          ? "Location required"
          : geofence.status === "unsupported"
            ? "GPS not available"
            : geofence.status === "error"
              ? "Location error"
              : "Menu closed";
    const detail =
      geofence.message ||
      (geofence.status === "requesting"
        ? "We save where you opened this link. Please allow location access."
        : `You moved more than ${TABLE_GEOFENCE_RADIUS_M}m from where you opened this menu. Come back to your table to continue.`);

    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4 text-[var(--text)]">
        <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-center shadow-[var(--shadow)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[var(--gold)]/40 bg-[var(--gold)]/10 text-[var(--gold)]">
            <MapPin className="h-6 w-6" />
          </div>
          <h1 className="font-display mt-4 text-2xl text-[var(--gold-bright)]">{title}</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">{detail}</p>
          {geofence.distanceM != null && geofence.status === "active" && (
            <p className="mt-3 text-xs text-[var(--text-dim)]">
              Distance from open spot: {Math.round(geofence.distanceM)}m
            </p>
          )}
          {(geofence.status === "denied" || geofence.status === "error") && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 w-full rounded-md bg-[var(--gold)] py-3 text-sm font-bold uppercase tracking-wider text-[var(--gold-bright)]"
            >
              Try again
            </button>
          )}
          {geofence.status === "requesting" && (
            <p className="mt-4 text-xs text-[var(--text-dim)]">Waiting for GPS…</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] lg:flex">
      {/* LEFT SIDEBAR */}
      <aside className="relative hidden w-[270px] shrink-0 flex-col overflow-hidden border-r border-[var(--border)] bg-[var(--bg-sidebar)] lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=1200&fit=crop)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[var(--bg)] via-[var(--bg)]/90 to-[var(--bg)]" />
        <div className="relative z-10 flex h-full flex-col px-5 py-6">
          <div className="flex flex-col items-center text-center">
            <Image
              src="/logo.png"
              alt="BonPainer"
              width={96}
              height={96}
              className="h-20 w-20 rounded-full object-cover shadow-[var(--shadow)]"
              priority
            />
            <h1 className="font-display mt-3 text-2xl text-[var(--gold-bright)]">{restaurant.name}</h1>
            <p className="mt-1 text-[10px] uppercase tracking-[0.35em] text-[var(--text-muted)]">Restaurant</p>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 border-b border-[var(--gold)]/20 pb-4">
            {[
              { icon: Phone, label: "Call Waiter", type: "WAITER" as const },
              { icon: ClipboardList, label: "Request Bill", type: "BILL" as const },
              { icon: Smile, label: "Feedback", type: null },
            ].map(({ icon: Icon, label, type }) => (
              <button
                key={label}
                type="button"
                disabled={type !== null && serviceBusy !== null}
                onClick={() =>
                  type
                    ? sendTableRequest(type)
                    : window.open(FEEDBACK_URL, "_blank", "noopener,noreferrer")
                }
                className="flex flex-col items-center gap-1 rounded-lg border border-[var(--border-strong)] bg-[var(--bg)]/50 py-3 text-[var(--gold)] transition hover:border-[var(--gold)]/60 disabled:opacity-60"
              >
                <Icon className="h-4 w-4" />
                <span className="text-[9px] leading-tight text-[var(--text-muted)]">
                  {type && serviceBusy === type ? "Sending…" : label}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-[var(--text-muted)]">
            Good Food <span className="text-[var(--gold)]">♥</span> Good Mood
          </p>

          <div className="mt-5 rounded-xl border border-[var(--gold)]/50 bg-[var(--bg)]/60 p-4 text-center">
            <p className="text-xs text-[var(--text-muted)]">Welcome to</p>
            <p className="font-display text-xl uppercase tracking-wide text-[var(--text)]">{restaurant.name}</p>
            <p className="mt-1 text-xs text-[var(--gold)]">Delicious food, great mood!</p>
            <div className="mx-auto mt-4 w-fit rounded-lg border border-[var(--gold)] px-6 py-2">
              <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)]">Table</p>
              <p className="font-display text-4xl text-[var(--gold-bright)]">{tableNumber}</p>
            </div>
            <p className="mt-3 text-xs text-[var(--text-muted)]">Thank you for dining with us</p>
          </div>

          {activeOrder && isCustomerEditable(activeOrder.status) && (
            <div className="mt-5 rounded-xl border border-[var(--gold)]/30 bg-[var(--gold)]/5 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--gold)]">
                  Active Order
                </p>
                <span className="rounded-full bg-[var(--gold)]/20 px-2 py-0.5 text-[10px] font-semibold text-[var(--gold-bright)]">
                  {STATUS_LABELS[activeOrder.status as keyof typeof STATUS_LABELS] ?? activeOrder.status}
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold text-[var(--gold-bright)]">{activeOrder.orderNumber}</p>

              <ul className="mt-3 space-y-1.5 max-h-40 overflow-y-auto">
                {activeOrder.items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-muted)]">
                      <span className="font-medium text-[var(--text)]">{item.quantity}×</span> {item.itemName}
                    </span>
                    <span className="shrink-0 text-[var(--gold-bright)]">{formatMoney(item.subtotal)}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex items-center justify-between border-t border-[var(--gold)]/20 pt-2 text-sm font-semibold">
                <span className="text-[var(--text-muted)]">Total</span>
                <span className="text-[var(--gold-bright)]">{formatMoney(activeOrder.total)}</span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleSidebarEditOrder}
                  className="rounded-lg border border-[var(--gold)]/50 bg-[var(--gold)]/10 px-3 py-2 text-[11px] font-semibold text-[var(--gold-bright)] transition hover:bg-[var(--gold)]/20"
                >
                  &#9998;&#65039; Edit Order
                </button>
                <button
                  type="button"
                  onClick={handleSidebarAddMore}
                  className="rounded-lg bg-[var(--gold)] px-3 py-2 text-[11px] font-bold text-[var(--gold-bright)] transition hover:opacity-90"
                >
                  &#10133; Add More
                </button>
              </div>
            </div>
          )}

        </div>
      </aside>

      {/* MAIN */}
      <div className="relative flex min-w-0 flex-1 flex-col bg-[var(--bg)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="BonPainer"
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover"
              priority
            />
            <div>
              <p className="font-display text-[var(--gold-bright)]">{restaurant.name}</p>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Table {tableNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button type="button" onClick={() => setShowCart(true)} className="relative text-[var(--gold)]">
              <ShoppingCart className="h-6 w-6" />
              {cartCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--gold)] text-[10px] font-bold text-[var(--bg)]">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 border-b border-[var(--border)] px-4 py-2 lg:hidden">
          {[
            { icon: Phone, label: "Call Waiter", type: "WAITER" as const },
            { icon: ClipboardList, label: "Request Bill", type: "BILL" as const },
            { icon: Smile, label: "Feedback", type: null },
          ].map(({ icon: Icon, label, type }) => (
            <button
              key={label}
              type="button"
              disabled={type !== null && serviceBusy !== null}
              onClick={() =>
                type
                  ? sendTableRequest(type)
                  : window.open(FEEDBACK_URL, "_blank", "noopener,noreferrer")
              }
              className="flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2 py-2 text-[var(--gold)] transition hover:border-[var(--gold)]/40 disabled:opacity-60"
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate text-[10px] font-medium text-[var(--text-muted)]">
                {type && serviceBusy === type ? "Sending…" : label}
              </span>
            </button>
          ))}
        </div>

        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg)]/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-dim)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for dishes..."
              className="w-full rounded-full border border-[var(--border)] bg-[var(--bg-card)] py-2.5 pl-10 pr-4 text-sm outline-none placeholder:text-[var(--text-dim)] focus:border-[var(--gold)]"
            />
          </div>
          <ThemeToggle className="hidden sm:inline-flex" />
          <button type="button" className="hidden rounded-full border border-[var(--border)] p-2.5 text-[var(--gold)] sm:block">
            <Bell className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setShowCart(true)}
            className="relative hidden rounded-full border border-[var(--border)] p-2.5 text-[var(--gold)] lg:block"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--gold)] px-1 text-[10px] font-bold text-[var(--bg)]">
                {cartCount}
              </span>
            )}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto px-4 pb-28 pt-4 sm:px-6">
          {/* CATEGORIES */}
          <div className="flex gap-3 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={`flex h-[84px] w-[84px] shrink-0 flex-col items-center justify-center rounded-xl border text-xs ${
                activeCategory === "all"
                  ? "border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold-bright)]"
                  : "border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-muted)]"
              }`}
            >
              <span className="text-lg text-[var(--gold)]">✦</span>
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`flex h-[84px] w-[84px] shrink-0 flex-col items-center justify-center rounded-xl border text-xs ${
                  activeCategory === cat.id
                    ? "border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold-bright)]"
                    : "border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-muted)]"
                }`}
              >
                <span className="text-lg">{CATEGORY_ICON[cat.name] ?? "🍽️"}</span>
                <span className="mt-1 line-clamp-1 px-1">{cat.name}</span>
              </button>
            ))}
          </div>

          {/* TODAY'S SPECIAL */}
          {visibleItems.some((i) => i.todaySpecial) && (
            <section className="mt-8">
              <div className="flex items-center gap-2">
                <span className="text-lg">⭐</span>
                <h2 className="font-display text-2xl text-[var(--gold-bright)]">Today&apos;s Special</h2>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {visibleItems.filter((i) => i.todaySpecial).map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          )}

          {/* FEATURED */}
          {visibleItems.some((i) => i.featured) && (
            <section className="mt-8">
              <h2 className="font-display text-2xl text-[var(--gold-bright)]">Featured</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {visibleItems.filter((i) => i.featured).map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          )}

          {/* POPULAR */}
          {visibleItems.some((i) => i.popular) && (
            <section className="mt-8">
              <h2 className="font-display text-2xl text-[var(--text)]">Popular Items</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {visibleItems.filter((i) => i.popular).map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          )}

          {/* RECOMMENDED */}
          <section className="mt-8">
            <h2 className="font-display text-2xl text-[var(--text)]">Recommended For You</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {visibleItems.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          </section>

          {/* POPULAR CATEGORIES */}
          <section className="mt-10">
            <h2 className="font-display text-2xl text-[var(--text)]">Popular Categories</h2>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {categories.map((cat) => {
                const cover = cat.items.find((i) => i.imageUrl)?.imageUrl;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 transition hover:border-[var(--gold)]/50"
                  >
                    <div className="mx-auto h-20 w-20 overflow-hidden rounded-full border border-[var(--gold)]/50">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover} alt={cat.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-[var(--bg-elevated)] text-2xl">
                          {CATEGORY_ICON[cat.name] ?? "🍽️"}
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-center text-sm font-medium">{cat.name}</p>
                    <p className="text-center text-xs text-[var(--text-muted)]">
                      {cat.items.filter((i) => i.available).length} Items
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        </main>

        {cartCount > 0 && !showCart && (
          <div className="fixed inset-x-0 bottom-0 z-30 p-4 lg:left-[270px]">
            <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 rounded-xl border border-[var(--gold)]/40 bg-[var(--bg-card)] px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="relative text-[var(--gold)]">
                  <ShoppingCart className="h-6 w-6" />
                  <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--gold)] text-[10px] font-bold text-[var(--gold-bright)]">
                    {cartCount}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium">{cartCount} Items</p>
                  <p className="text-sm font-semibold text-[var(--gold-bright)]">{formatMoney(cartTotal)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCart(true)}
                className="rounded-md bg-[var(--gold)] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[var(--gold-bright)]"
              >
                View Cart
              </button>
            </div>
          </div>
        )}

        {cartCount === 0 && !showCart && activeOrder && isCustomerEditable(activeOrder.status) && (
          <div className="fixed inset-x-0 bottom-0 z-30 p-4 lg:hidden">
            <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 rounded-xl border border-[var(--gold)]/40 bg-[var(--bg-card)] px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--gold)]/50 bg-[var(--gold)]/10 text-sm font-bold text-[var(--gold-bright)]">
                  {activeOrder.items.length}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-[var(--text-muted)]">{activeOrder.orderNumber}</p>
                  <p className="text-sm font-semibold text-[var(--gold-bright)]">{formatMoney(activeOrder.total)}</p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={handleSidebarEditOrder}
                  className="rounded-md border border-[var(--gold)]/50 bg-[var(--gold)]/10 px-3 py-2 text-[11px] font-semibold text-[var(--gold-bright)]"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleSidebarAddMore}
                  className="rounded-md bg-[var(--gold)] px-3 py-2 text-[11px] font-bold text-[var(--gold-bright)]"
                >
                  + Add
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CHECKOUT */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--overlay)] sm:items-center sm:p-4">
          <button type="button" className="absolute inset-0" aria-label="Close" onClick={() => setShowCart(false)} />
          <div className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--bg-elevated)] sm:rounded-2xl">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <h2 className="font-display text-2xl text-[var(--gold-bright)]">
                {isEditMode ? "Edit Order" : "Checkout"}
              </h2>
              <p className="text-sm text-[var(--text-muted)]">
                BonPainer · Table {tableNumber}
              </p>
              {isEditMode && (
                <p className="mt-1 text-xs text-[var(--gold)]">
                  {editMode === "add" ? "Adding more items to your order" : "Modify your order below"}
                </p>
              )}
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <ul className="space-y-3">
                {cart.map((line) => (
                  <li
                    key={line.menuItemId}
                    className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-3"
                  >
                    <div>
                      <p className="font-medium">{line.name}</p>
                      <p className="text-xs text-[var(--gold-bright)]">{formatMoney(line.price * line.quantity)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQty(line.menuItemId, -1)}
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--gold)]/50 text-[var(--gold)]"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-5 text-center text-sm font-semibold">{line.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQty(line.menuItemId, 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--gold)] text-[var(--gold-bright)]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between border-t border-[var(--border)] pt-3 font-semibold">
                <span>Total</span>
                <span className="text-[var(--gold-bright)]">{formatMoney(cartTotal)}</span>
              </div>
              <div className="space-y-3">
                <label className="block text-sm">
                  <span className="mb-1 block text-[var(--text-muted)]">Customer name *</span>
                  <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={inputClass} placeholder="Enter your full name" />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-[var(--text-muted)]">Email (optional)</span>
                  <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className={inputClass} placeholder="you@example.com" />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-[var(--text-muted)]">Phone (optional)</span>
                  <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className={inputClass} placeholder="e.g. +92 300 1234567" />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-[var(--text-muted)]">Order notes / special request</span>
                  <textarea value={specialRequest} onChange={(e) => setSpecialRequest(e.target.value)} rows={3} className={`${inputClass} resize-none`} placeholder="e.g. No onions, extra sauce, allergy note…" />
                </label>
              </div>
              {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
            </div>
            <div className="border-t border-[var(--border)] px-5 py-4">
              <button
                type="button"
                disabled={submitting || !cart.length}
                onClick={isEditMode ? updateOrder : placeOrder}
                className="w-full rounded-md bg-[var(--gold)] py-3 text-sm font-bold uppercase tracking-wider text-[var(--gold-bright)] disabled:opacity-50"
              >
                {submitting
                  ? isEditMode ? "Updating order…" : "Placing order…"
                  : isEditMode ? "Update Order" : "Place order"}
              </button>
              <button type="button" onClick={() => setShowCart(false)} className="mt-2 w-full py-2 text-sm text-[var(--text-muted)]">
                Continue browsing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOD DETAIL MODAL */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--overlay)] sm:items-center sm:p-4">
          <button type="button" className="absolute inset-0" onClick={() => setDetailItem(null)} />
          <div className="relative z-10 flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--bg-elevated)] sm:rounded-2xl">
            {/* Image */}
            <div className="relative h-48 shrink-0 bg-[var(--bg-card)]">
              {detailItem.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={detailItem.imageUrl} alt={detailItem.name} className="h-full w-full object-cover" />
              ) : null}
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg)]/60 text-[var(--text)]"
              >
                ✕
              </button>
              {detailItem.todaySpecial && (
                <span className="absolute left-3 top-3 rounded-full bg-[var(--gold)] px-3 py-1 text-xs font-bold text-[var(--gold-bright)]">
                  Today&apos;s Special
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <h3 className="font-display text-xl text-[var(--gold-bright)]">{detailItem.name}</h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{detailItem.description}</p>
              <p className="mt-2 text-lg font-semibold text-[var(--gold-bright)]">{formatMoney(detailItem.price)}</p>

              {(() => {
                const parsed = parseOptions(detailItem.options);
                return (
                  <>
                    {/* Variants */}
                    {parsed.variants.length > 0 && (
                      <div className="mt-4">
                        <p className="mb-2 text-sm font-semibold text-[var(--text)]">Choose Size</p>
                        <div className="flex flex-wrap gap-2">
                          {parsed.variants.map((v) => (
                            <button
                              key={v.name}
                              type="button"
                              onClick={() => setDetailVariant(v.name)}
                              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                                detailVariant === v.name
                                  ? "border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold-bright)]"
                                  : "border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-muted)]"
                              }`}
                            >
                              {v.name} {v.priceAdj > 0 && `(+${formatMoney(v.priceAdj)})`}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add-ons */}
                    {parsed.addOns.length > 0 && (
                      <div className="mt-4">
                        <p className="mb-2 text-sm font-semibold text-[var(--text)]">Add-ons</p>
                        <div className="space-y-2">
                          {parsed.addOns.map((a) => (
                            <label
                              key={a.name}
                              className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5"
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={detailAddOns.has(a.name)}
                                  onChange={(e) => {
                                    const next = new Set(detailAddOns);
                                    if (e.target.checked) next.add(a.name);
                                    else next.delete(a.name);
                                    setDetailAddOns(next);
                                  }}
                                  className="h-4 w-4 accent-[var(--gold)]"
                                />
                                <span className="text-sm text-[var(--text)]">{a.name}</span>
                              </div>
                              <span className="text-sm text-[var(--gold-bright)]">+{formatMoney(a.price)}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Special Instructions */}
              <div className="mt-4">
                <p className="mb-2 text-sm font-semibold text-[var(--text)]">Special Instructions</p>
                <textarea
                  value={detailInstructions}
                  onChange={(e) => setDetailInstructions(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-sidebar)] px-3 py-2.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-dim)] focus:border-[var(--gold)] resize-none"
                  placeholder="e.g. No onions, extra sauce..."
                />
              </div>

              {/* Quantity */}
              <div className="mt-4 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setDetailQty((q) => Math.max(1, q - 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--gold)]/50 text-[var(--gold)]"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-8 text-center text-lg font-bold text-[var(--text)]">{detailQty}</span>
                <button
                  type="button"
                  onClick={() => setDetailQty((q) => q + 1)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--gold)] text-[var(--gold-bright)]"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Dynamic Price */}
              {(() => {
                const parsed = parseOptions(detailItem.options);
                let unitPrice = detailItem.price;
                if (detailVariant) {
                  const v = parsed.variants.find((v) => v.name === detailVariant);
                  if (v) unitPrice += v.priceAdj;
                }
                const addOnTotal = parsed.addOns
                  .filter((a) => detailAddOns.has(a.name))
                  .reduce((sum, a) => sum + a.price, 0);
                unitPrice += addOnTotal;
                const lineTotal = unitPrice * detailQty;
                return (
                  <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3">
                    <div className="flex justify-between text-sm text-[var(--text-muted)]">
                      <span>Unit price</span>
                      <span>{formatMoney(unitPrice)}</span>
                    </div>
                    {addOnTotal > 0 && (
                      <div className="flex justify-between text-sm text-[var(--text-muted)]">
                        <span>Add-ons</span>
                        <span>+{formatMoney(addOnTotal)}</span>
                      </div>
                    )}
                    <div className="mt-1 flex justify-between border-t border-[var(--border)] pt-2 text-base font-semibold">
                      <span>Total ({detailQty}×)</span>
                      <span className="text-[var(--gold-bright)]">{formatMoney(lineTotal)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="border-t border-[var(--border)] px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  if (!detailItem) return;
                  const addOnList = Array.from(detailAddOns)
                    .map((name) => {
                      const parsed = parseOptions(detailItem.options);
                      const a = parsed.addOns.find((a) => a.name === name);
                      return a ? { name: a.name, price: a.price } : { name, price: 0 };
                    });
                  addToCart(detailItem, {
                    variant: detailVariant || undefined,
                    addOns: addOnList.length > 0 ? addOnList : undefined,
                    specialInstructions: detailInstructions || undefined,
                    qty: detailQty,
                  });
                  setDetailItem(null);
                }}
                className="w-full rounded-md bg-[var(--gold)] py-3 text-sm font-bold uppercase tracking-wider text-[var(--gold-bright)]"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-[var(--gold)]/40 bg-[var(--bg-card)] px-4 py-2 text-xs text-[var(--gold-bright)] shadow-lg lg:left-[calc(50%+135px)]">
          {toast}
        </div>
      )}
    </div>
  );
}
