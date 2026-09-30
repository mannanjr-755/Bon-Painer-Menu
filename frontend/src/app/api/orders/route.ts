import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@backend/lib/prisma";
import { generateOrderNumber } from "@backend/lib/orders";

const placeOrderSchema = z.object({
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

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const parsed = placeOrderSchema.safeParse(body);

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

    const orderNumber = await generateOrderNumber(restaurant.id, restaurant.slug);

    const order = await prisma.order.create({
      data: {
        restaurantId: restaurant.id,
        tableId: table.id,
        orderNumber,
        customerName,
        customerPhone: customerPhone || null,
        customerEmail: customerEmail || null,
        specialRequest: specialRequest?.trim() || null,
        status: "NEW",
        total,
        items: { create: orderItemsData },
      },
      include: {
        items: true,
        table: true,
        restaurant: { select: { name: true, slug: true } },
      },
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error("Place order error:", error);
    return NextResponse.json({ error: "Failed to place order" }, { status: 500 });
  }
}
