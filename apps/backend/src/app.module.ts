import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { RolesModule } from "./modules/roles/roles.module";
import { HealthModule } from "./modules/health/health.module";
import { MenuModule } from "./modules/menu/menu.module";
import { TablesModule } from "./modules/tables/tables.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { ServiceRequestsModule } from "./modules/service-requests/service-requests.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    HealthModule,
    UsersModule,
    RolesModule,
    AuthModule,
    MenuModule,
    TablesModule,
    OrdersModule,
    ServiceRequestsModule,
  ],
})
export class AppModule {}
