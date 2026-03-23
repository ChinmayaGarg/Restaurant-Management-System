import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  BillStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { NotificationTypes } from "../notifications/notification-types";
import { NotificationsService } from "../notifications/notifications.service";
import { RecordCardPaymentDto } from "./dto/record-card-payment.dto";
import { RecordCashPaymentDto } from "./dto/record-cash-payment.dto";

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findByBillId(branchId: string, billId: string) {
    const bill = await this.getBillOrThrow(branchId, billId);

    const paidAmount = this.getSuccessfulPaidAmount(bill.payments);
    const balanceAmount = bill.totalAmount.minus(paidAmount);

    return {
      billId: bill.id,
      billNumber: bill.billNumber,
      billStatus: bill.status,
      totalAmount: bill.totalAmount,
      paidAmount,
      balanceAmount,
      payments: bill.payments,
    };
  }

  async markCash(
    branchId: string,
    recordedByUserId: string,
    billId: string,
    dto: RecordCashPaymentDto,
  ) {
    return this.recordManualPayment(
      branchId,
      recordedByUserId,
      billId,
      PaymentMethod.CASH,
      dto.amount,
      {
        provider: "MANUAL_CASH",
        providerReference: dto.note ?? null,
      },
    );
  }

  async markCard(
    branchId: string,
    recordedByUserId: string,
    billId: string,
    dto: RecordCardPaymentDto,
  ) {
    return this.recordManualPayment(
      branchId,
      recordedByUserId,
      billId,
      PaymentMethod.CARD,
      dto.amount,
      {
        provider: dto.provider ?? "MANUAL_CARD",
        providerReference: dto.providerReference ?? null,
      },
    );
  }

  private async recordManualPayment(
    branchId: string,
    recordedByUserId: string,
    billId: string,
    method: PaymentMethod,
    amount: number,
    meta: {
      provider: string | null;
      providerReference: string | null;
    },
  ) {
    const bill = await this.getBillOrThrow(branchId, billId);

    if (bill.status === BillStatus.VOID) {
      throw new BadRequestException("Cannot record payment on a void bill");
    }

    if (bill.status === BillStatus.PAID) {
      throw new BadRequestException("Bill is already fully paid");
    }

    const paidAmount = this.getSuccessfulPaidAmount(bill.payments);
    const balanceAmount = bill.totalAmount.minus(paidAmount);
    const incomingAmount = new Prisma.Decimal(amount);

    if (incomingAmount.gt(balanceAmount)) {
      throw new BadRequestException("Payment amount exceeds remaining balance");
    }

    return this.prisma
      .$transaction(async (tx: Prisma.TransactionClient) => {
        const payment = await tx.payment.create({
          data: {
            billId,
            method,
            provider: meta.provider,
            providerReference: meta.providerReference,
            amount: incomingAmount,
            status: PaymentStatus.SUCCESS,
            recordedByUserId,
            paidAt: new Date(),
          },
          include: {
            recordedByUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        });

        const updatedBill = await tx.bill.findUniqueOrThrow({
          where: { id: billId },
          include: {
            payments: true,
          },
        });

        const updatedPaidAmount = this.getSuccessfulPaidAmount(
          updatedBill.payments,
        );
        const updatedBalanceAmount =
          updatedBill.totalAmount.minus(updatedPaidAmount);

        if (updatedBalanceAmount.lte(new Prisma.Decimal(0))) {
          await tx.bill.update({
            where: { id: billId },
            data: {
              status: BillStatus.PAID,
            },
          });
        }

        const finalBill = await tx.bill.findUniqueOrThrow({
          where: { id: billId },
          include: this.getBillInclude(),
        });

        return {
          message: "Payment recorded successfully",
          payment,
          bill: finalBill,
          paidAmount: updatedPaidAmount,
          balanceAmount: updatedBalanceAmount.lt(new Prisma.Decimal(0))
            ? new Prisma.Decimal(0)
            : updatedBalanceAmount,
        };
      })
      .then(async (result) => {
        await this.safeNotify(branchId, {
          title: "Payment recorded",
          message: `Payment of ${result.payment.amount.toString()} recorded for bill ${result.bill.billNumber}`,
          type: NotificationTypes.PAYMENT_RECORDED,
        });

        if (result.bill.status === BillStatus.PAID) {
          await this.safeNotify(branchId, {
            title: "Bill paid",
            message: `Bill ${result.bill.billNumber} is fully paid`,
            type: NotificationTypes.BILL_PAID,
          });
        }

        return result;
      });
  }

  private async getBillOrThrow(branchId: string, billId: string) {
    const bill = await this.prisma.bill.findFirst({
      where: {
        id: billId,
        tableSession: {
          table: {
            branchId,
          },
        },
      },
      include: this.getBillInclude(),
    });

    if (!bill) {
      throw new NotFoundException("Bill not found for this branch");
    }

    return bill;
  }

  private getSuccessfulPaidAmount(
    payments: Array<{ amount: Prisma.Decimal; status: PaymentStatus }>,
  ) {
    return payments
      .filter((payment) => payment.status === PaymentStatus.SUCCESS)
      .reduce(
        (sum, payment) => sum.plus(payment.amount),
        new Prisma.Decimal(0),
      );
  }

  private getBillInclude() {
    return {
      tableSession: {
        include: {
          table: {
            include: {
              section: true,
            },
          },
        },
      },
      payments: {
        orderBy: {
          createdAt: "asc" as const,
        },
        include: {
          recordedByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
    };
  }

  private async safeNotify(
    branchId: string,
    payload: {
      title: string;
      message: string;
      type: string;
      targetUserId?: string;
    },
  ) {
    try {
      await this.notificationsService.send(branchId, payload);
    } catch (error) {
      this.logger.error("Failed to create notification", error as Error);
    }
  }
}
