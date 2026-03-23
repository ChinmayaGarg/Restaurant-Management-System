import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { NotificationsModule } from "../notifications/notifications.module";
import { PermissionsGuard } from "../roles/guards/permissions.guard";
import { RolesModule } from "../roles/roles.module";
import { ServiceRequestsController } from "./service-requests.controller";
import { ServiceRequestsService } from "./service-requests.service";

@Module({
  imports: [AuthModule, RolesModule, NotificationsModule],
  controllers: [ServiceRequestsController],
  providers: [ServiceRequestsService, JwtAuthGuard, PermissionsGuard],
  exports: [ServiceRequestsService],
})
export class ServiceRequestsModule {}
