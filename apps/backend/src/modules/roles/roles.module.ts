import { Module } from "@nestjs/common";
import { PermissionsService } from "./services/permissions.service";
import { PermissionsGuard } from "./guards/permissions.guard";


@Module({
  providers: [PermissionsService, PermissionsGuard],
  exports: [PermissionsService, PermissionsGuard],
})
export class RolesModule {}
