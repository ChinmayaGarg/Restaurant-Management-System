import { Module } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { AuthModule } from "../auth/auth.module";
import { RolesModule } from "../roles/roles.module";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../roles/guards/permissions.guard";

@Module({
  imports: [AuthModule, RolesModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, JwtAuthGuard, PermissionsGuard],
  exports: [NotificationsService],
})
export class NotificationsModule {}
