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
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { AddOrderItemsDto } from "./dto/add-order-items.dto";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";

@Controller("orders")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @RequirePermissions("order.view")
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.findAll(user.branchId);
  }

  @Get(":id")
  @RequirePermissions("order.view")
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.ordersService.findById(user.branchId, id);
  }

  @Post()
  @RequirePermissions("order.create")
  async createOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(user.branchId, user.id, dto);
  }

  @Post(":id/items")
  @RequirePermissions("order.item.add")
  async addItems(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: AddOrderItemsDto,
  ) {
    return this.ordersService.addItems(user.branchId, id, user.id, dto);
  }

  @Patch(":id/status")
  @RequirePermissions("order.status.update")
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(user.branchId, id, user.id, dto);
  }
}
