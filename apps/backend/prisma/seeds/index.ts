import { PrismaClient } from "@prisma/client";
import { seedPermissions } from "./permissions.seed";
import { seedRestaurant } from "./restaurants.seed";
import { seedRoles } from "./roles.seed";
import { seedRolePermissions } from "./role-permissions.seed";
import { seedUsers } from "./users.seed";
import { seedTables } from "./tables.seed";
import { seedMenu } from "./menu.seed";
import { seedSettings } from "./settings.seed";

const prisma = new PrismaClient();

async function main() {
  await seedPermissions();

  const { restaurant, branch } = await seedRestaurant();

  await seedRoles(restaurant.id);
  await seedRolePermissions(restaurant.id);
  await seedUsers(branch.id, restaurant.id);
  await seedTables(branch.id);
  await seedMenu(branch.id);
  await seedSettings(branch.id);

  console.log("All seeds completed");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
