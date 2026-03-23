import { PrismaClient, RecordStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function seedUsers(branchId: string, restaurantId: string) {
  const passwordHash = await bcrypt.hash("Password@123", 10);

  const defaultUsers = [
    {
      firstName: "Owner",
      lastName: "User",
      email: "owner@demo.com",
      role: "Owner",
    },
    {
      firstName: "Manager",
      lastName: "User",
      email: "manager@demo.com",
      role: "Manager",
    },
    {
      firstName: "Server",
      lastName: "User",
      email: "server@demo.com",
      role: "Server",
    },
    {
      firstName: "Cashier",
      lastName: "User",
      email: "cashier@demo.com",
      role: "Cashier",
    },
    {
      firstName: "Kitchen",
      lastName: "User",
      email: "kitchen@demo.com",
      role: "Kitchen",
    },
    {
      firstName: "Admin",
      lastName: "User",
      email: "admin@demo.com",
      role: "Admin",
    },
  ];

  for (const entry of defaultUsers) {
    const user = await prisma.user.upsert({
      where: { email: entry.email },
      update: {},
      create: {
        branchId,
        firstName: entry.firstName,
        lastName: entry.lastName,
        email: entry.email,
        status: RecordStatus.ACTIVE,
      },
    });

    await prisma.credential.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        passwordHash,
      },
    });

    const role = await prisma.role.findUnique({
      where: {
        restaurantId_name: {
          restaurantId,
          name: entry.role,
        },
      },
    });

    if (role) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: role.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          roleId: role.id,
        },
      });
    }
  }

  console.log("Seeded default users");
}
