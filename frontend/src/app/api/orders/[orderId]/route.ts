import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@backend/lib/prisma";
import { isCustomerEditable } from "@/lib/utils";

type RouteContext = { params: Promise<{ orderId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { orderId } = await params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        table: true,
        restaurant: { select: { name: true, slug: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Fetch order error:", error);
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}

const updateOrderSchema = z.object({
  restaurantSlug: z.string().min(1),
  tableNumber: z.coerce.number().int().positive(),
  customerName: z.string().trim().min(1).max(100),
  customerPhone: z.string().trim().max(30).optional().nullable(),
  customerEmail: z
    .string()
    .trim()
    .max(120)
    .optional()
    .nullable()
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
      message: "Invalid email",
    }),
  specialRequest: z.string().trim().max(500).optional().nullable(),
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1),
        quantity: z.number().int().positive().max(99),
      })
    )
    .min(1),
});

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { orderId } = await params;
    const body = await request.json();
    const parsed = updateOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid order data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      restaurantSlug,
      tableNumber,
      customerName,
      customerPhone,
      customerEmail,
      specialRequest,
      items,
    } = parsed.data;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, restaurant: true, table: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!isCustomerEditable(order.status)) {
      return NextResponse.json(
        { error: "This order can no longer be edited" },
        { status: 400 }
      );
    }

    if (order.restaurant.slug !== restaurantSlug) {
      return NextResponse.json(
        { error: "Order does not belong to this restaurant" },
        { status: 400 }
      );
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: restaurantSlug },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const table = await prisma.table.findUnique({
      where: {
        restaurantId_tableNumber: {
          restaurantId: restaurant.id,
          tableNumber,
        },
      },
    });

    if (!table || !table.active) {
      return NextResponse.json({ error: "Table not found or inactive" }, { status: 404 });
    }

    const menuItemIds = items.map((i) => i.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: menuItemIds },
        restaurantId: restaurant.id,
        available: true,
      },
    });

    if (menuItems.length !== menuItemIds.length) {
      return NextResponse.json(
        { error: "One or more items are unavailable or invalid" },
        { status: 400 }
      );
    }

    const menuById = new Map(menuItems.map((m) => [m.id, m]));
    let total = 0;
    const orderItemsData = items.map((item) => {
      const menuItem = menuById.get(item.menuItemId)!;
      const subtotal = menuItem.price * item.quantity;
      total += subtotal;
      return {
        menuItemId: menuItem.id,
        itemName: menuItem.name,
        quantity: item.quantity,
        unitPrice: menuItem.price,
        subtotal,
      };
    });

    const updatedOrder = await prisma.$transaction(async (tx) => {
      await tx.orderItem.deleteMany({ where: { orderId: order.id } });

      await tx.orderItem.createMany({
        data: orderItemsData.map((item) => ({ ...item, orderId: order.id })),
      });

      return tx.order.update({
        where: { id: order.id },
        data: {
          tableId: table.id,
          customerName,
          customerPhone: customerPhone || null,
          customerEmail: customerEmail || null,
          specialRequest: specialRequest?.trim() || null,
          total,
        },
        include: {
          items: true,
          table: true,
          restaurant: { select: { name: true, slug: true } },
        },
      });
    });

    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
    console.error("Update order error:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
