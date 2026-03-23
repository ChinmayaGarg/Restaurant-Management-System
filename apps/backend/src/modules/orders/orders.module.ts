import { Module } from "@nestjs/common";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { AuthModule } from "../auth/auth.module";
import { RolesModule } from "../roles/roles.module";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../roles/guards/permissions.guard";

@Module({
  imports: [AuthModule, RolesModule],
  controllers: [OrdersController],
  providers: [OrdersService, JwtAuthGuard, PermissionsGuard],
  exports: [OrdersService],
})
export class OrdersModule {}
