import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { BillStatus, OrderStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { NotificationTypes } from "../notifications/notification-types";
import { NotificationsService } from "../notifications/notifications.service";
import { GenerateBillDto } from "./dto/generate-bill.dto";

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async generateBill(
    branchId: string,
    generatedByUserId: string,
    dto: GenerateBillDto,
  ) {
    const tableSession = await this.prisma.tableSession.findFirst({
      where: {
        id: dto.tableSessionId,
        table: {
          branchId,
        },
      },
      include: {
        table: {
          include: {
            section: true,
          },
        },
        bills: {
          where: {
            status: {
              in: [
                BillStatus.DRAFT,
                BillStatus.GENERATED,
                BillStatus.PAID,
                BillStatus.CLOSED,
              ],
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });

    if (!tableSession) {
      throw new NotFoundException("Table session not found for this branch");
    }

    const existingBill = tableSession.bills[0];
    if (existingBill && existingBill.status !== BillStatus.VOID) {
      return this.findById(branchId, existingBill.id);
    }

    const orders = await this.prisma.order.findMany({
      where: {
        tableSessionId: dto.tableSessionId,
        status: {
          not: OrderStatus.CANCELLED,
        },
      },
      include: {
        items: {
          where: {
            status: {
              not: "CANCELLED",
            },
          },
          include: {
            menuItem: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const orderItems = orders.flatMap((order) => order.items);

    if (!orderItems.length) {
      throw new BadRequestException(
        "No billable order items found for this table session",
      );
    }

    const activeTaxes = await this.prisma.taxConfig.findMany({
      where: {
        branchId,
        isActive: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const subtotalAmount = orderItems.reduce(
      (sum, item) => sum.plus(item.lineTotal),
      new Prisma.Decimal(0),
    );

    const discountAmount = new Prisma.Decimal(0);
    const serviceChargeAmount = new Prisma.Decimal(0);

    const taxRatePercent = activeTaxes.reduce(
      (sum, tax) => sum.plus(tax.rate),
      new Prisma.Decimal(0),
    );

    const taxableBase = subtotalAmount
      .minus(discountAmount)
      .plus(serviceChargeAmount);
    const taxAmount = taxableBase.mul(taxRatePercent).div(100);
    const totalAmount = taxableBase.plus(taxAmount);

    const billNumber = this.generateBillNumber();

    const createdBill = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const bill = await tx.bill.create({
          data: {
            tableSessionId: dto.tableSessionId,
            billNumber,
            status: BillStatus.GENERATED,
            subtotalAmount,
            discountAmount,
            taxAmount,
            serviceChargeAmount,
            totalAmount,
            generatedByUserId,
            generatedAt: new Date(),
          },
        });

        for (const orderItem of orderItems) {
          await tx.billItem.create({
            data: {
              billId: bill.id,
              orderItemId: orderItem.id,
              nameSnapshot: orderItem.menuItem.name,
              quantity: orderItem.quantity,
              unitPrice: orderItem.unitPrice,
              lineTotal: orderItem.lineTotal,
            },
          });
        }

        return tx.bill.findUniqueOrThrow({
          where: { id: bill.id },
          include: this.getBillInclude(),
        });
      },
    );

    await this.safeNotify(branchId, {
      title: "Bill generated",
      message: `Bill ${createdBill.billNumber} generated for ${createdBill.tableSession.table.displayName}`,
      type: NotificationTypes.BILL_GENERATED,
      targetUserId: createdBill.tableSession.assignedServerId ?? undefined,
    });

    return createdBill;
  }

  async findById(branchId: string, billId: string) {
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

  async closeBill(branchId: string, billId: string) {
    const bill = await this.prisma.bill.findFirst({
      where: {
        id: billId,
        tableSession: {
          table: {
            branchId,
          },
        },
      },
    });

    if (!bill) {
      throw new NotFoundException("Bill not found for this branch");
    }

    if (bill.status === BillStatus.VOID) {
      throw new BadRequestException("Cannot close a void bill");
    }

    if (bill.status === BillStatus.CLOSED) {
      return this.findById(branchId, billId);
    }

    const closedBill = await this.prisma.bill.update({
      where: { id: billId },
      data: {
        status: BillStatus.CLOSED,
        closedAt: new Date(),
      },
      include: this.getBillInclude(),
    });

    await this.safeNotify(branchId, {
      title: "Bill closed",
      message: `Bill ${closedBill.billNumber} has been closed`,
      type: NotificationTypes.BILL_CLOSED,
      targetUserId: closedBill.tableSession.assignedServerId ?? undefined,
    });

    return closedBill;
  }

  async reprintBill(branchId: string, billId: string) {
    const bill = await this.findById(branchId, billId);

    if (bill.status === BillStatus.VOID) {
      throw new BadRequestException("Cannot reprint a void bill");
    }

    return {
      message: "Bill ready for reprint",
      bill,
    };
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
          openedByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          assignedServer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
      generatedByUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      items: {
        include: {
          orderItem: {
            include: {
              menuItem: true,
              modifiers: {
                include: {
                  modifierOption: true,
                },
              },
            },
          },
        },
      },
      adjustments: {
        orderBy: {
          createdAt: "asc" as const,
        },
        include: {
          createdByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
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

  private generateBillNumber() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const h = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");

    return `BILL-${y}${m}${d}-${h}${min}${s}-${Math.floor(Math.random() * 1000)}`;
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
