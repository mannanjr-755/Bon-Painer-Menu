import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@backend/lib/prisma";
import { requireStaff } from "@backend/lib/session";

const createItemSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional().nullable(),
  price: z.number().positive(),
  imageUrl: z.string().trim().max(500).optional().nullable(),
  categoryId: z.string().min(1),
  available: z.boolean().optional(),
  featured: z.boolean().optional(),
  popular: z.boolean().optional(),
  todaySpecial: z.boolean().optional(),
  options: z.string().optional().nullable(),
});

export async function GET() {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await prisma.menuItem.findMany({
      where: { restaurantId: session.user.restaurantId },
      orderBy: { name: "asc" },
      include: { category: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Fetch items error:", error);
    return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const restaurantId = session.user.restaurantId;
    const { categoryId, ...itemData } = parsed.data;

    const category = await prisma.menuCategory.findUnique({ where: { id: categoryId } });

    if (!category || category.restaurantId !== restaurantId) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    const item = await prisma.menuItem.create({
      data: {
        restaurantId,
        categoryId,
        name: itemData.name,
        description: itemData.description ?? null,
        price: itemData.price,
        imageUrl: itemData.imageUrl ?? null,
        available: itemData.available ?? true,
        featured: itemData.featured ?? false,
        popular: itemData.popular ?? false,
        todaySpecial: itemData.todaySpecial ?? false,
        options: itemData.options ?? null,
      },
      include: { category: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("Create item error:", error);
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
  }
}
