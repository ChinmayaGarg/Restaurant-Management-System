import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { CreateMenuCategoryDto } from "./dto/create-menu-category.dto";
import { CreateMenuItemDto } from "./dto/create-menu-item.dto";
import { UpdateMenuItemPriceDto } from "./dto/update-menu-item-price.dto";

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(branchId: string) {
    return this.prisma.menuCategory.findMany({
      where: {
        branchId,
        isActive: true,
      },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      include: {
        items: {
          orderBy: [{ name: "asc" }],
          include: {
            modifierGroups: {
              orderBy: [{ name: "asc" }],
              include: {
                options: {
                  orderBy: [{ name: "asc" }],
                },
              },
            },
          },
        },
      },
    });
  }

  async createCategory(branchId: string, dto: CreateMenuCategoryDto) {
    const existing = await this.prisma.menuCategory.findFirst({
      where: {
        branchId,
        name: dto.name,
      },
    });

    if (existing) {
      throw new ConflictException(
        "Menu category with this name already exists",
      );
    }

    return this.prisma.menuCategory.create({
      data: {
        branchId,
        name: dto.name,
        description: dto.description,
        displayOrder: dto.displayOrder ?? 0,
        isActive: true,
      },
    });
  }

  async createItem(branchId: string, dto: CreateMenuItemDto) {
    const category = await this.prisma.menuCategory.findFirst({
      where: {
        id: dto.categoryId,
        branchId,
      },
    });

    if (!category) {
      throw new NotFoundException("Menu category not found for this branch");
    }

    const existing = await this.prisma.menuItem.findFirst({
      where: {
        categoryId: dto.categoryId,
        name: dto.name,
      },
    });

    if (existing) {
      throw new ConflictException("Menu item with this name already exists");
    }

    return this.prisma.menuItem.create({
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        basePrice: dto.basePrice,
        isAvailable: dto.isAvailable ?? true,
        sku: dto.sku,
        imageUrl: dto.imageUrl,
      },
    });
  }

  async updateItemPrice(
    branchId: string,
    itemId: string,
    dto: UpdateMenuItemPriceDto,
  ) {
    const item = await this.prisma.menuItem.findFirst({
      where: {
        id: itemId,
        category: {
          branchId,
        },
      },
      include: {
        category: true,
      },
    });

    if (!item) {
      throw new NotFoundException("Menu item not found for this branch");
    }

    return this.prisma.menuItem.update({
      where: { id: itemId },
      data: {
        basePrice: dto.basePrice,
      },
    });
  }
}
