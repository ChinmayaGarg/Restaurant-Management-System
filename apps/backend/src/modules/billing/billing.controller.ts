import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { RequirePermissions } from "../roles/decorators/require-permissions.decorator";
import { PermissionsGuard } from "../roles/guards/permissions.guard";
import { BillingService } from "./billing.service";
import { GenerateBillDto } from "./dto/generate-bill.dto";

@Controller("billing")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post("generate")
  @RequirePermissions("bill.generate")
  async generate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerateBillDto,
  ) {
    return this.billingService.generateBill(user.branchId, user.id, dto);
  }

  @Get(":billId")
  @RequirePermissions("bill.view")
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param("billId") billId: string,
  ) {
    return this.billingService.findById(user.branchId, billId);
  }

  @Post(":billId/close")
  @RequirePermissions("bill.close")
  async close(
    @CurrentUser() user: AuthenticatedUser,
    @Param("billId") billId: string,
  ) {
    return this.billingService.closeBill(user.branchId, billId);
  }

  @Post(":billId/reprint")
  @RequirePermissions("bill.reprint")
  async reprint(
    @CurrentUser() user: AuthenticatedUser,
    @Param("billId") billId: string,
  ) {
    return this.billingService.reprintBill(user.branchId, billId);
  }
}
