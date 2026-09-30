const { PrismaClient } = require("@prisma/client");
const { PrismaNeon } = require("@prisma/adapter-neon");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString }),
});

async function main() {
  const restaurants = await prisma.restaurant.findMany({
    select: {
      name: true,
      slug: true,
      logo: true,
      _count: { select: { categories: true, menuItems: true, users: true, tables: true } },
    },
  });
  console.log("restaurants:", JSON.stringify(restaurants, null, 2));
  const users = await prisma.user.findMany({ select: { email: true, role: true, active: true } });
  console.log("users:", users);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
