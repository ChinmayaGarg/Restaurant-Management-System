import { PrismaClient } from "@prisma/client";
import { PERMISSIONS } from "../../../../packages/permissions/permission-keys";
// import { PERMISSIONS } from "@restaurant-platform/permissions";
const prisma = new PrismaClient();

function getModuleFromKey(key: string): string {
  return key.split(".")[0] ?? "general";
}

export async function seedPermissions() {
  const values = Object.values(PERMISSIONS);

  for (const key of values) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: {
        key,
        module: getModuleFromKey(key),
        description: key,
      },
    });
  }

  console.log(`Seeded ${values.length} permissions`);
}
