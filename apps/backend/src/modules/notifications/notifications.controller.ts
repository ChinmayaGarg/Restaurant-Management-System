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
import { NotificationsService } from "./notifications.service";
import { SendNotificationDto } from "./dto/send-notification.dto";

@Controller("notifications")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @RequirePermissions("service_request.view")
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.findAll(user.branchId, user.id);
  }

  @Post("send")
  @RequirePermissions("service_request.create")
  async send(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendNotificationDto,
  ) {
    return this.notificationsService.send(user.branchId, dto);
  }

  @Patch(":id/read")
  @RequirePermissions("service_request.view")
  async markRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.notificationsService.markRead(user.branchId, user.id, id);
  }
}
