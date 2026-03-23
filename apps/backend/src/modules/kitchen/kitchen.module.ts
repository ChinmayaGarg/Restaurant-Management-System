import { Module } from "@nestjs/common";
import { KitchenController } from "./kitchen.controller";
import { KitchenService } from "./kitchen.service";
import { AuthModule } from "../auth/auth.module";
import { RolesModule } from "../roles/roles.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../roles/guards/permissions.guard";

@Module({
  imports: [AuthModule, RolesModule, NotificationsModule],
  controllers: [KitchenController],
  providers: [KitchenService, JwtAuthGuard, PermissionsGuard],
  exports: [KitchenService],
})
export class KitchenModule {}
