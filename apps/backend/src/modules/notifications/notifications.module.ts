import { Module } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { NotificationsGateway } from "./notifications.gateway";
import { AuthModule } from "../auth/auth.module";
import { RolesModule } from "../roles/roles.module";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../roles/guards/permissions.guard";

@Module({
  imports: [AuthModule, RolesModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsGateway,
    JwtAuthGuard,
    PermissionsGuard,
  ],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
