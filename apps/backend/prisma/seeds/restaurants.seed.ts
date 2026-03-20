import { PrismaClient, RecordStatus } from "@prisma/client";

const prisma = new PrismaClient();

export async function seedRestaurant() {
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: "demo-restaurant" },
    update: {},
    create: {
      name: "Demo Restaurant",
      slug: "demo-restaurant",
      timezone: "America/Halifax",
      currency: "CAD",
      status: RecordStatus.ACTIVE,
    },
  });

  const branch = await prisma.branch.upsert({
    where: {
      id: "demo-branch-1",
    },
    update: {},
    create: {
      id: "demo-branch-1",
      restaurantId: restaurant.id,
      name: "Main Branch",
      address: "123 Example Street",
      phone: "+1-902-000-0000",
      status: RecordStatus.ACTIVE,
    },
  });

  const sections = ["Main Hall", "Patio", "VIP"];

  for (let i = 0; i < sections.length; i++) {
    await prisma.section.upsert({
      where: {
        branchId_name: {
          branchId: branch.id,
          name: sections[i],
        },
      },
      update: {},
      create: {
        branchId: branch.id,
        name: sections[i],
        displayOrder: i + 1,
      },
    });
  }

  return { restaurant, branch };
}
