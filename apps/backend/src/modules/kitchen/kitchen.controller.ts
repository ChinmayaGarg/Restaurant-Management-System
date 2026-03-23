import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { RequirePermissions } from "../roles/decorators/require-permissions.decorator";
import { PermissionsGuard } from "../roles/guards/permissions.guard";
import { KitchenService } from "./kitchen.service";
import { UpdateKitchenOrderStatusDto } from "./dto/update-kitchen-order-status.dto";
import { UpdateKitchenItemAvailabilityDto } from "./dto/update-kitchen-item-availability.dto";

@Controller("kitchen")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class KitchenController {
  constructor(private readonly kitchenService: KitchenService) {}

  @Get("queue")
  @RequirePermissions("kitchen.view.queue")
  async getQueue(@CurrentUser() user: AuthenticatedUser) {
    return this.kitchenService.getQueue(user.branchId);
  }

  @Patch("orders/:orderId/status")
  @RequirePermissions("kitchen.status.update")
  async updateOrderStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string,
    @Body() dto: UpdateKitchenOrderStatusDto,
  ) {
    return this.kitchenService.updateOrderStatus(
      user.branchId,
      orderId,
      user.id,
      dto,
    );
  }

  @Patch("items/:id/unavailable")
  @RequirePermissions("kitchen.item.unavailable.flag")
  async updateItemAvailability(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateKitchenItemAvailabilityDto,
  ) {
    return this.kitchenService.updateItemAvailability(user.branchId, id, dto);
  }
}
