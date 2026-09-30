import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@backend/lib/prisma";
import { requireStaff } from "@backend/lib/session";

const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const categories = await prisma.menuCategory.findMany({
      where: { restaurantId: session.user.restaurantId },
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { items: true } } },
    });

    return NextResponse.json({
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        sortOrder: c.sortOrder,
        itemCount: c._count.items,
      })),
    });
  } catch (error) {
    console.error("Fetch categories error:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createCategorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const restaurantId = session.user.restaurantId;

    const category = await prisma.menuCategory.create({
      data: {
        restaurantId,
        name: parsed.data.name,
        sortOrder: parsed.data.sortOrder ?? 0,
      },
      include: { _count: { select: { items: true } } },
    });

    return NextResponse.json(
      {
        category: {
          id: category.id,
          name: category.name,
          sortOrder: category.sortOrder,
          itemCount: category._count.items,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create category error:", error);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
