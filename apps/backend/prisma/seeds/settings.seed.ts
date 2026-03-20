import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function seedSettings(branchId: string) {
  await prisma.moduleConfig.upsert({
    where: { branchId },
    update: {},
    create: {
      branchId,
      qrEnabled: true,
      buttonEnabled: false,
      selfOrderEnabled: true,
      selfPaymentEnabled: false,
    },
  });

  await prisma.taxConfig.createMany({
    data: [
      {
        branchId,
        name: "GST/HST",
        rate: "15.00",
        isActive: true,
      },
    ],
    skipDuplicates: true,
  });

  console.log("Seeded settings");
}
