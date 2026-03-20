import { PrismaClient, TableStatus } from "@prisma/client";

const prisma = new PrismaClient();

export async function seedTables(branchId: string) {
  const sections = await prisma.section.findMany({
    where: { branchId },
    orderBy: { displayOrder: "asc" },
  });

  for (const section of sections) {
    for (let i = 1; i <= 5; i++) {
      const code = `${section.name.replace(/\s+/g, "-").toUpperCase()}-${i}`;

      await prisma.diningTable.upsert({
        where: {
          branchId_tableCode: {
            branchId,
            tableCode: code,
          },
        },
        update: {},
        create: {
          branchId,
          sectionId: section.id,
          tableCode: code,
          displayName: `Table ${i}`,
          capacity: 4,
          status: TableStatus.AVAILABLE,
        },
      });
    }
  }

  console.log("Seeded dining tables");
}
