import { Module } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { AuthModule } from "../auth/auth.module";
import { RolesModule } from "../roles/roles.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../roles/guards/permissions.guard";

@Module({
  imports: [AuthModule, RolesModule, NotificationsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, JwtAuthGuard, PermissionsGuard],
  exports: [PaymentsService],
})
export class PaymentsModule {}
