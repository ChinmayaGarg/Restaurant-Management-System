import { PrismaClient } from "@prisma/client";
import { ROLE_DEFAULTS } from "../../../../packages/permissions/role-defaults";

const prisma = new PrismaClient();

export async function seedRolePermissions(restaurantId: string) {
  const roles = await prisma.role.findMany({
    where: { restaurantId },
  });

  const permissions = await prisma.permission.findMany();

  const permissionMap = new Map(permissions.map((p) => [p.key, p.id]));
  const roleMap = new Map(roles.map((r) => [r.name, r.id]));

  for (const [roleName, permissionKeys] of Object.entries(ROLE_DEFAULTS)) {
    const roleId = roleMap.get(roleName);
    if (!roleId) continue;

    for (const permissionKey of permissionKeys) {
      const permissionId = permissionMap.get(permissionKey);
      if (!permissionId) continue;

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId,
            permissionId,
          },
        },
        update: {},
        create: {
          roleId,
          permissionId,
        },
      });
    }
  }

  console.log("Seeded role-permission mappings");
}
