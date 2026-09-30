import { NextResponse } from "next/server";
import { prisma } from "@backend/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug")?.trim();

  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: {
      id: true,
      categories: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          items: {
            where: { available: true },
            orderBy: { name: "asc" },
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              imageUrl: true,
              available: true,
              categoryId: true,
              featured: true,
              popular: true,
              todaySpecial: true,
              options: true,
            },
          },
        },
      },
    },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      categories: restaurant.categories,
      serverTime: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
