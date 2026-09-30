import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@backend/lib/prisma";
import { requireStaff } from "@backend/lib/session";

type RouteContext = { params: Promise<{ id: string }> };

const updateItemSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  price: z.number().positive().optional(),
  imageUrl: z.string().trim().max(500).optional().nullable(),
  categoryId: z.string().min(1).optional(),
  available: z.boolean().optional(),
  featured: z.boolean().optional(),
  popular: z.boolean().optional(),
  todaySpecial: z.boolean().optional(),
  options: z.string().optional().nullable(),
});

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.menuItem.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (existing.restaurantId !== session.user.restaurantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { categoryId, ...updateData } = parsed.data;

    if (categoryId) {
      const category = await prisma.menuCategory.findUnique({ where: { id: categoryId } });
      if (!category || category.restaurantId !== session.user.restaurantId) {
        return NextResponse.json({ error: "Invalid category" }, { status: 400 });
      }
    }

    const item = await prisma.menuItem.update({
      where: { id },
      data: {
        ...updateData,
        ...(categoryId ? { categoryId } : {}),
      },
      include: { category: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Update item error:", error);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const existing = await prisma.menuItem.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (existing.restaurantId !== session.user.restaurantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.menuItem.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete item error:", error);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
