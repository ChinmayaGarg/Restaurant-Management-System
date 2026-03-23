import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  BillStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { RecordCashPaymentDto } from "./dto/record-cash-payment.dto";
import { RecordCardPaymentDto } from "./dto/record-card-payment.dto";

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
}
