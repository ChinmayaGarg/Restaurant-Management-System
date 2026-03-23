import { Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../roles/guards/permissions.guard";
import { RequirePermissions } from "../roles/decorators/require-permissions.decorator";

@Controller("menu")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MenuController {
  @Get()
  @RequirePermissions("menu.view")
  findAll() {
    return { ok: true, message: "Menu list" };
  }

  @Patch("items/:id/price")
  @RequirePermissions("menu.item.price.update")
  updatePrice() {
    return { ok: true, message: "Price updated" };
  }
}
