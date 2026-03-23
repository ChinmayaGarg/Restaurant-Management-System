import { Injectable } from "@nestjs/common";
// import { PrismaService } from "../../../database/prisma.service";
import { PrismaService } from "../../../database/prisma.service";

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserPermissionKeys(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) return [];

    const permissionKeys = new Set<string>();

    for (const userRole of user.userRoles) {
      for (const rolePermission of userRole.role.rolePermissions) {
        permissionKeys.add(rolePermission.permission.key);
      }
    }

    return Array.from(permissionKeys);
  }
}
