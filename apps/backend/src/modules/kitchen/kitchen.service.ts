import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { OrderItemStatus, OrderStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { UpdateKitchenOrderStatusDto } from "./dto/update-kitchen-order-status.dto";
import { UpdateKitchenItemAvailabilityDto } from "./dto/update-kitchen-item-availability.dto";

@Injectable()
export class KitchenService {
  constructor(private readonly prisma: PrismaService) {}

  async getQueue(branchId: string) {
    return this.prisma.order.findMany({
      where: {
        tableSession: {
          table: {
            branchId,
          },
        },
        status: {
          in: [
            OrderStatus.PLACED,
            OrderStatus.ACCEPTED,
            OrderStatus.PREPARING,
            OrderStatus.READY,
          ],
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      include: this.getOrderInclude(),
    });
  }

  async updateOrderStatus(
    branchId: string,
    orderId: string,
    changedByUserId: string,
    dto: UpdateKitchenOrderStatusDto,
  ) {
    const allowedStatuses: OrderStatus[] = [
      OrderStatus.ACCEPTED,
      OrderStatus.PREPARING,
      OrderStatus.READY,
    ];

    if (!allowedStatuses.includes(dto.status)) {
      throw new BadRequestException(
        "Kitchen can only set order status to ACCEPTED, PREPARING, or READY",
      );
    }

    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        tableSession: {
          table: {
            branchId,
          },
        },
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException("Order not found for this branch");
    }

    if (
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.CLOSED ||
      order.status === OrderStatus.SERVED
    ) {
      throw new BadRequestException(
        "Kitchen cannot update a cancelled, served, or closed order",
      );
    }

    if (order.status === dto.status) {
      return this.findOrderById(branchId, orderId);
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: dto.status,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: dto.status,
          changedByUserId,
        },
      });

      const targetItemStatus = this.mapOrderStatusToOrderItemStatus(dto.status);

      if (targetItemStatus) {
        await tx.orderItem.updateMany({
          where: {
            orderId,
            status: {
              not: OrderItemStatus.CANCELLED,
            },
          },
          data: {
            status: targetItemStatus,
          },
        });
      }

      return tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: this.getOrderInclude(),
      });
    });
  }

  async updateItemAvailability(
    branchId: string,
    itemId: string,
    dto: UpdateKitchenItemAvailabilityDto,
  ) {
    const item = await this.prisma.menuItem.findFirst({
      where: {
        id: itemId,
        category: {
          branchId,
        },
      },
      include: {
        category: true,
      },
    });

    if (!item) {
      throw new NotFoundException("Menu item not found for this branch");
    }

    return this.prisma.menuItem.update({
      where: { id: itemId },
      data: {
        isAvailable: dto.isAvailable,
      },
      include: {
        category: true,
      },
    });
  }

  private async findOrderById(branchId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        tableSession: {
          table: {
            branchId,
          },
        },
      },
      include: this.getOrderInclude(),
    });

    if (!order) {
      throw new NotFoundException("Order not found for this branch");
    }

    return order;
  }

  private mapOrderStatusToOrderItemStatus(status: OrderStatus) {
    switch (status) {
      case OrderStatus.ACCEPTED:
        return OrderItemStatus.PENDING;
      case OrderStatus.PREPARING:
        return OrderItemStatus.PREPARING;
      case OrderStatus.READY:
        return OrderItemStatus.READY;
      default:
        return null;
    }
  }

  private getOrderInclude() {
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
      createdByUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      items: {
        include: {
          menuItem: true,
          modifiers: {
            include: {
              modifierOption: true,
            },
          },
        },
      },
      statusHistory: {
        orderBy: {
          changedAt: "asc" as const,
        },
        include: {
          changedByUser: {
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
