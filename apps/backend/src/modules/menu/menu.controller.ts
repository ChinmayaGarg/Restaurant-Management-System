import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { RequirePermissions } from "../roles/decorators/require-permissions.decorator";
import { PermissionsGuard } from "../roles/guards/permissions.guard";
import { MenuService } from "./menu.service";
import { CreateMenuCategoryDto } from "./dto/create-menu-category.dto";
import { CreateMenuItemDto } from "./dto/create-menu-item.dto";
import { UpdateMenuItemPriceDto } from "./dto/update-menu-item-price.dto";

@Controller("menu")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  @RequirePermissions("menu.view")
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.menuService.findAll(user.branchId);
  }

  @Post("categories")
  @RequirePermissions("menu.category.create")
  async createCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMenuCategoryDto,
  ) {
    return this.menuService.createCategory(user.branchId, dto);
  }

  @Post("items")
  @RequirePermissions("menu.item.create")
  async createItem(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMenuItemDto,
  ) {
    return this.menuService.createItem(user.branchId, dto);
  }

  @Patch("items/:id/price")
  @RequirePermissions("menu.item.price.update")
  async updateItemPrice(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateMenuItemPriceDto,
  ) {
    return this.menuService.updateItemPrice(user.branchId, id, dto);
  }
}
