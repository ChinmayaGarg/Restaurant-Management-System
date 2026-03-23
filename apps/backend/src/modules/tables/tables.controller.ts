import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { RequirePermissions } from "../roles/decorators/require-permissions.decorator";
import { PermissionsGuard } from "../roles/guards/permissions.guard";
import { TablesService } from "./tables.service";
import { UpdateTableStatusDto } from "./dto/update-table-status.dto";
import { OpenTableSessionDto } from "./dto/open-table-session.dto";

@Controller("tables")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get()
  @RequirePermissions("table.view")
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.tablesService.findAll(user.branchId);
  }

  @Patch(":id/status")
  @RequirePermissions("table.status.update")
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateTableStatusDto,
  ) {
    return this.tablesService.updateStatus(user.branchId, id, dto);
  }

  @Post(":id/open-session")
  @RequirePermissions("table.session.open")
  async openSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: OpenTableSessionDto,
  ) {
    return this.tablesService.openSession(user.branchId, id, user.id, dto);
  }

  @Post(":id/close-session")
  @RequirePermissions("table.session.close")
  async closeSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.tablesService.closeSession(user.branchId, id);
  }
}
