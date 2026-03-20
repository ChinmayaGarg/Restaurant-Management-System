import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function seedMenu(branchId: string) {
  const categories = [
    {
      name: "Starters",
      items: [
        { name: "Garlic Bread", price: "6.99" },
        { name: "Soup of the Day", price: "5.99" },
      ],
    },
    {
      name: "Mains",
      items: [
        { name: "Grilled Chicken", price: "16.99" },
        { name: "Veg Pasta", price: "14.49" },
      ],
    },
    {
      name: "Drinks",
      items: [
        { name: "Coke", price: "2.99" },
        { name: "Orange Juice", price: "3.99" },
      ],
    },
  ];

  for (let c = 0; c < categories.length; c++) {
    const category = await prisma.menuCategory.upsert({
      where: {
        branchId_name: {
          branchId,
          name: categories[c].name,
        },
      },
      update: {},
      create: {
        branchId,
        name: categories[c].name,
        displayOrder: c + 1,
        isActive: true,
      },
    });

    for (const item of categories[c].items) {
      await prisma.menuItem.create({
        data: {
          categoryId: category.id,
          name: item.name,
          basePrice: item.price,
          isAvailable: true,
        },
      });
    }
  }

  console.log("Seeded menu");
}
