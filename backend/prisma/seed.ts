import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed PostgreSQL");
}

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString }),
});

const BRAND_SLUG = "BonPainer";
const PIZZA_SLUG = "pizza-palace";
const BRAND_TABLES = 12;

async function main() {
  console.log("Seeding BonPainer demo data (insert-only, safe for shared databases)...");

  const passwordHash = await bcrypt.hash("password123", 10);

  const brand = await prisma.restaurant.upsert({
    where: { slug: BRAND_SLUG },
    update: {
      name: "BonPainer",
      logo: "/logo.png",
    },
    create: {
      name: "BonPainer",
      slug: BRAND_SLUG,
      logo: "/logo.png",
      coverImage:
        "https://images.unsplash.com/photo-1558030006-450675393462?w=1400&h=700&fit=crop",
      description: "Delicious food, great mood! Explore our chef's special dishes made just for you.",
      phone: "+92 300 1234567",
      whatsapp: "+923001234567",
      address: "12 Gourmet Avenue, City Center",
      googleMapsUrl: "https://maps.google.com",
      openingHours: JSON.stringify({
        mon: "11:00–23:00",
        tue: "11:00–23:00",
        wed: "11:00–23:00",
        thu: "11:00–23:00",
        fri: "11:00–00:00",
        sat: "11:00–00:00",
        sun: "12:00–22:00",
      }),
      socialLinks: JSON.stringify({
        instagram: "https://instagram.com",
        facebook: "https://facebook.com",
      }),
    },
  });

  // Auth looks up emails in lowercase — store lowercase to match.
  const adminEmail = "admin@bonpainer.com";
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { restaurantId: brand.id, active: true, passwordHash, name: "Admin", role: "ADMIN" },
    create: {
      email: adminEmail,
      passwordHash,
      name: "Admin",
      role: "ADMIN",
      restaurantId: brand.id,
    },
  });

  // Clean up legacy mixed-case admin email if present
  const legacyAdmin = await prisma.user.findUnique({ where: { email: "admin@BonPainer.com" } });
  if (legacyAdmin) {
    await prisma.user.delete({ where: { id: legacyAdmin.id } });
  }

  // 12 tables (demo highlights table 12)
  for (let n = 1; n <= BRAND_TABLES; n++) {
    const existing = await prisma.table.findFirst({
      where: { restaurantId: brand.id, tableNumber: n },
      select: { id: true },
    });
    if (existing) {
      await prisma.table.update({
        where: { id: existing.id },
        data: { active: true },
      });
      continue;
    }
    await prisma.table.create({
      data: {
        restaurantId: brand.id,
        tableNumber: n,
        uniqueCode: `BonPainer-t${n}-${Math.random().toString(36).slice(2, 8)}`,
        active: true,
      },
    });
  }

  const existingCategories = await prisma.menuCategory.count({
    where: { restaurantId: brand.id },
  });

  const requestedMenu = [
    {
      name: "Chicken Karahi",
      items: [
        "Chicken Peshawari Karahi",
        "Chicken Shinwari Karahi",
        "Chicken Brown Karahi",
        "Chicken Balochi Karahi",
        "Chicken White Karahi",
      ],
    },
    {
      name: "Handi",
      items: ["Chicken Mughlai Handi", "Chicken Paneer Reshmi"],
    },
    { name: "Tandoor", items: ["Farmaishi Chapati", "Paratha"] },
    {
      name: "Chicken Biryani",
      items: [
        "Chicken Biryani (Single)",
        "Chicken Biryani (Double)",
        "Tikka Biryani (Single)",
        "Tikka Biryani (Double)",
        "Sada Biryani",
      ],
    },
    {
      name: "Chicken Kabab",
      items: ["Chicken Turkish Kabab", "Chicken Gola Kabab", "Chicken Reshmi Kabab"],
    },
    {
      name: "Chicken B.B.Q",
      items: [
        "Chicken Tikka (Leg)",
        "Chicken Tikka (Chest)",
        "Behari Tikka (Leg)",
        "Behari Tikka (Chest)",
        "Malai Tikka (Leg)",
        "Malai Tikka (Chest)",
        "Special Boti",
        "Chicken Boti",
        "Chicken Behari Boti",
        "Chicken Malai Boti",
        "Chicken Afghani Boti",
      ],
    },
    {
      name: "Chicken Rolls",
      items: ["Chicken Chatni Roll", "Chicken Bihari Roll", "Chicken Malai Roll", "Chicken Kabab Roll"],
    },
    {
      name: "Beef Biryani",
      items: [
        "Beef Biryani (Single)",
        "Beef Biryani (Double)",
        "Beef White Biryani (Single)",
        "Beef White Biryani (Double)",
      ],
    },
    {
      name: "Beef Kabab",
      items: ["Beef Seekh Kabab", "Beef Behari Kabab", "Beef Gola Kabab"],
    },
    { name: "Beef B.B.Q", items: ["Beef Boti", "Beef Behari Boti", "Beef Afghani Boti"] },
    { name: "Beef Roll", items: ["Beef Chatni Roll", "Beef Bihari Roll", "Beef Kabab Roll"] },
    { name: "Beef Fry Kabab", items: ["Beef Fry Kabab"] },
    { name: "Beverages & Sides", items: ["Can", "Small Water", "Large Water", "Raita", "Salad"] },
  ];

  // Only seed menu when empty — never wipe existing production categories/items.
  if (existingCategories === 0) {
    for (const [sortOrder, categoryData] of requestedMenu.entries()) {
      const category = await prisma.menuCategory.create({
        data: { restaurantId: brand.id, name: categoryData.name, sortOrder },
      });
      await prisma.menuItem.createMany({
        data: categoryData.items.map((name) => ({
          restaurantId: brand.id,
          categoryId: category.id,
          name,
          price: 0,
          available: true,
        })),
      });
    }
    console.log(`Inserted BonPainer menu with ${requestedMenu.length} categories.`);
  } else {
    console.log(`BonPainer already has ${existingCategories} menu categories — left untouched.`);
  }

  // Keep a second restaurant for isolation testing
  const pizza = await prisma.restaurant.upsert({
    where: { slug: PIZZA_SLUG },
    update: {},
    create: {
      name: "Pizza Palace",
      slug: PIZZA_SLUG,
      description: "Wood-fired pizzas",
      phone: "+92 300 7654321",
      logo: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&h=200&fit=crop",
      coverImage:
        "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&h=600&fit=crop",
    },
  });
  await prisma.user.upsert({
    where: { email: "staff@pizzapalace.com" },
    update: { restaurantId: pizza.id, active: true, passwordHash },
    create: {
      email: "staff@pizzapalace.com",
      passwordHash,
      name: "Pizza Admin",
      restaurantId: pizza.id,
    },
  });
  const pizzaTable = await prisma.table.findFirst({
    where: { restaurantId: pizza.id, tableNumber: 1 },
    select: { id: true },
  });
  if (!pizzaTable) {
    await prisma.table.create({
      data: {
        restaurantId: pizza.id,
        tableNumber: 1,
        uniqueCode: "pizza-palace-t1-demo",
        active: true,
      },
    });
  }

  console.log("Done!");
  console.log("Customer menu: /r/BonPainer/t/12");
  console.log("Admin login: admin@bonpainer.com / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
