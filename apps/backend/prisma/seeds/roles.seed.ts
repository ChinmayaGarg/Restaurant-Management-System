import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function seedRoles(restaurantId: string) {
  const roles = [
    { name: "Owner", description: "Full business control" },
    { name: "Manager", description: "Operational manager" },
    { name: "Server", description: "Front-of-house server" },
    { name: "Cashier", description: "Billing and payment operator" },
    { name: "Kitchen", description: "Kitchen staff" },
    { name: "Admin", description: "System and configuration admin" },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: {
        restaurantId_name: {
          restaurantId,
          name: role.name,
        },
      },
      update: {
        description: role.description,
      },
      create: {
        restaurantId,
        name: role.name,
        description: role.description,
      },
    });
  }

  console.log("Seeded default roles");
}
