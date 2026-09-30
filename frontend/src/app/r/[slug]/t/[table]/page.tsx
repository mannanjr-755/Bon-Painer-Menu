import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { connection } from "next/server";
import type { MenuCategory, MenuItem, OrderItem } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { parseJsonObject } from "@/lib/utils";
import { CustomerMenu } from "@/components/CustomerMenu";

type Props = {
  params: Promise<{ slug: string; table: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  await connection();
  const restaurant =
    (await prisma?.restaurant?.findUnique({ where: { slug } })) ??
    (slug === "BonPainer" ? await prisma?.restaurant?.findFirst() : null);
  return {
    title: "Menu",
    description: restaurant?.description ?? "Digital restaurant menu",
  };
}

export default async function TableMenuPage({ params }: Props) {
  // Always read latest menu from the shared DB (CRM writes here too).
  await connection();

  const { slug, table } = await params;
  const tableNumber = Number(table);

  if (!Number.isInteger(tableNumber) || tableNumber < 1) {
    notFound();
  }

  const restaurant =
    (await prisma?.restaurant?.findUnique({
      where: { slug },
      include: {
        categories: {
          orderBy: { sortOrder: "asc" },
          include: {
            items: {
              where: { available: true },
              orderBy: { name: "asc" },
            },
          },
        },
        tables: {
          where: { tableNumber, active: true },
        },
      },
    })) ??
    (slug === "BonPainer"
      ? await prisma.restaurant.findFirst({
          include: {
            categories: {
              orderBy: { sortOrder: "asc" },
              include: {
                items: {
                  where: { available: true },
                  orderBy: { name: "asc" },
                },
              },
            },
            tables: {
              where: { tableNumber, active: true },
            },
          },
        })
      : null);

  if (!restaurant || restaurant.tables.length === 0) {
    notFound();
  }

  const activeOrder = await prisma.order.findFirst({
    where: {
      restaurantId: restaurant.id,
      table: { tableNumber, active: true },
      status: { in: ["NEW", "ACCEPTED"] },
    },
    include: {
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const serializedActiveOrder = activeOrder
    ? {
        id: activeOrder.id,
        orderNumber: activeOrder.orderNumber,
        status: activeOrder.status,
        total: activeOrder.total,
        createdAt: activeOrder.createdAt.toISOString(),
        items: activeOrder.items.map((item: OrderItem) => ({
          id: item.id,
          menuItemId: item.menuItemId,
          itemName: item.itemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
        })),
      }
    : null;

  return (
    <Suspense>
      <CustomerMenu
        restaurant={{
          name: slug === "BonPainer" ? "BonPainer" : restaurant.name,
          slug: restaurant.slug,
          logo: restaurant.logo,
          coverImage: restaurant.coverImage,
          description: restaurant.description,
          phone: restaurant.phone,
          whatsapp: restaurant.whatsapp,
          address: restaurant.address,
          googleMapsUrl: restaurant.googleMapsUrl,
          openingHours: parseJsonObject(restaurant.openingHours),
          socialLinks: parseJsonObject(restaurant.socialLinks),
        }}
        categories={restaurant.categories.map((c: MenuCategory & { items: MenuItem[] }) => ({
          id: c.id,
          name: c.name,
          items: c.items.map((i: MenuItem) => ({
            id: i.id,
            name: i.name,
            description: i.description,
            price: i.price,
            imageUrl: i.imageUrl,
            available: i.available,
            categoryId: i.categoryId,
            featured: i.featured,
            popular: i.popular,
            todaySpecial: i.todaySpecial,
            options: i.options,
          })),
        }))}
        tableNumber={tableNumber}
        activeOrder={serializedActiveOrder}
      />
    </Suspense>
  );
}
