import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      include: {
        branch: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        branch: true,
        credential: true,
        userRoles: {
          include: {
            role: true,
          },
        },
        scopes: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        branch: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  async findAuthUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        credential: true,
        branch: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  async findAuthUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        branch: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
  }
}
