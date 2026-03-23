import { Module } from "@nestjs/common";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import { AuthModule } from "../auth/auth.module";
import { RolesModule } from "../roles/roles.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../roles/guards/permissions.guard";

@Module({
  imports: [AuthModule, RolesModule, NotificationsModule],
  controllers: [BillingController],
  providers: [BillingService, JwtAuthGuard, PermissionsGuard],
  exports: [BillingService],
})
export class BillingModule {}
