import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@backend/lib/prisma";

const requestSchema = z.object({
  restaurantSlug: z.string().min(1),
  tableNumber: z.coerce.number().int().positive(),
  type: z.enum(["WAITER", "BILL"]),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { restaurantSlug, tableNumber, type } = parsed.data;

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

    const message =
      type === "WAITER"
        ? `Table No. ${table.tableNumber} needs a waiter.`
        : `Table No. ${table.tableNumber} needs the bill.`;

    const tableRequest = await prisma.tableRequest.create({
      data: {
        restaurantId: restaurant.id,
        tableId: table.id,
        type,
        message,
        status: "PENDING",
      },
      include: {
        table: { select: { tableNumber: true } },
      },
    });

    return NextResponse.json(
      {
        request: {
          id: tableRequest.id,
          type: tableRequest.type,
          message: tableRequest.message,
          status: tableRequest.status,
          tableNumber: tableRequest.table.tableNumber,
          createdAt: tableRequest.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Table request error:", error);
    return NextResponse.json({ error: "Failed to send request" }, { status: 500 });
  }
}
