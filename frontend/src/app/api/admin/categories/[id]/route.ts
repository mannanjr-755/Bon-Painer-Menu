import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@backend/lib/prisma";
import { requireStaff } from "@backend/lib/session";

type RouteContext = { params: Promise<{ id: string }> };

const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateCategorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.menuCategory.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    if (existing.restaurantId !== session.user.restaurantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const category = await prisma.menuCategory.update({
      where: { id },
      data: parsed.data,
      include: { _count: { select: { items: true } } },
    });

    return NextResponse.json({
      category: {
        id: category.id,
        name: category.name,
        sortOrder: category.sortOrder,
        itemCount: category._count.items,
      },
    });
  } catch (error) {
    console.error("Update category error:", error);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const existing = await prisma.menuCategory.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    if (existing.restaurantId !== session.user.restaurantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const itemCount = await prisma.menuItem.count({ where: { categoryId: id } });
    if (itemCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete category with menu items. Move or remove items first." },
        { status: 400 }
      );
    }

    await prisma.menuCategory.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete category error:", error);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
