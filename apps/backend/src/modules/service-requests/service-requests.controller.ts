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
import { ServiceRequestsService } from "./service-requests.service";
import { CreateServiceRequestDto } from "./dto/create-service-request.dto";
import { ReassignServiceRequestDto } from "./dto/reassign-service-request.dto";

@Controller("service-requests")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ServiceRequestsController {
  constructor(
    private readonly serviceRequestsService: ServiceRequestsService,
  ) {}

  @Get()
  @RequirePermissions("service_request.view")
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.serviceRequestsService.findAll(user.branchId);
  }

  @Post()
  @RequirePermissions("service_request.create")
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateServiceRequestDto,
  ) {
    return this.serviceRequestsService.create(user.branchId, user.id, dto);
  }

  @Patch(":id/acknowledge")
  @RequirePermissions("service_request.acknowledge")
  async acknowledge(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.serviceRequestsService.acknowledge(user.branchId, id, user.id);
  }

  @Patch(":id/resolve")
  @RequirePermissions("service_request.resolve")
  async resolve(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.serviceRequestsService.resolve(user.branchId, id, user.id);
  }

  @Patch(":id/escalate")
  @RequirePermissions("service_request.escalate")
  async escalate(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.serviceRequestsService.escalate(user.branchId, id, user.id);
  }

  @Patch(":id/reassign")
  @RequirePermissions("service_request.reassign")
  async reassign(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ReassignServiceRequestDto,
  ) {
    return this.serviceRequestsService.reassign(user.branchId, id, dto);
  }
}
