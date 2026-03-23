import { Module } from "@nestjs/common";
import { ServiceRequestsController } from "./service-requests.controller";
import { ServiceRequestsService } from "./service-requests.service";
import { AuthModule } from "../auth/auth.module";
import { RolesModule } from "../roles/roles.module";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../roles/guards/permissions.guard";

@Module({
  imports: [AuthModule, RolesModule],
  controllers: [ServiceRequestsController],
  providers: [ServiceRequestsService, JwtAuthGuard, PermissionsGuard],
  exports: [ServiceRequestsService],
})
export class ServiceRequestsModule {}