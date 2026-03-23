import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { RequirePermissions } from "../roles/decorators/require-permissions.decorator";
import { PermissionsGuard } from "../roles/guards/permissions.guard";
import { PaymentsService } from "./payments.service";
import { RecordCashPaymentDto } from "./dto/record-cash-payment.dto";
import { RecordCardPaymentDto } from "./dto/record-card-payment.dto";

@Controller("payments")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get("bill/:billId")
  @RequirePermissions("payment.view")
  async findByBillId(
    @CurrentUser() user: AuthenticatedUser,
    @Param("billId") billId: string,
  ) {
    return this.paymentsService.findByBillId(user.branchId, billId);
  }

  @Post(":billId/mark-cash")
  @RequirePermissions("payment.mark.cash")
  async markCash(
    @CurrentUser() user: AuthenticatedUser,
    @Param("billId") billId: string,
    @Body() dto: RecordCashPaymentDto,
  ) {
    return this.paymentsService.markCash(user.branchId, user.id, billId, dto);
  }

  @Post(":billId/mark-card")
  @RequirePermissions("payment.mark.card")
  async markCard(
    @CurrentUser() user: AuthenticatedUser,
    @Param("billId") billId: string,
    @Body() dto: RecordCardPaymentDto,
  ) {
    return this.paymentsService.markCard(user.branchId, user.id, billId, dto);
  }
}
