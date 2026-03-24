import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CourseType,
  FireStatus,
  OrderItemStatus,
  OrderStatus,
  Prisma,
  TableSessionStatus,
} from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { AddOrderItemsDto } from "./dto/add-order-items.dto";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
import { CreateOrderItemDto } from "./dto/create-order-item.dto";

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(branchId: string) {
    return this.prisma.order.findMany({
      where: {
        tableSession: {
          table: {
            branchId,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      include: this.getOrderInclude(),
    });
  }

  async findById(branchId: string, orderId: string) {
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

  async createOrder(
    branchId: string,
    createdByUserId: string,
    dto: CreateOrderDto,
  ) {
    if (!dto.items?.length) {
      throw new BadRequestException("Order must contain at least one item");
    }

    const tableSession = await this.prisma.tableSession.findFirst({
      where: {
        id: dto.tableSessionId,
        status: TableSessionStatus.OPEN,
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
        seatAssignments: {
          where: {
            isActive: true,
          },
        },
      },
    });

    if (!tableSession) {
      throw new NotFoundException(
        "Open table session not found for this branch",
      );
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const order = await tx.order.create({
        data: {
          tableSessionId: dto.tableSessionId,
          sourceType: dto.sourceType,
          createdByUserId,
          notes: dto.notes ?? null,
          status: OrderStatus.PLACED,
          subtotalAmount: new Prisma.Decimal(0),
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: null,
          toStatus: OrderStatus.PLACED,
          changedByUserId: createdByUserId,
        },
      });

      const subtotal = await this.createOrderItems(
        tx,
        tableSession.id,
        order.id,
        createdByUserId,
        dto.items,
      );

      await tx.order.update({
        where: { id: order.id },
        data: {
          subtotalAmount: subtotal,
        },
      });

      return tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: this.getOrderInclude(),
      });
    });
  }

  async addItems(
    branchId: string,
    orderId: string,
    addedByUserId: string,
    dto: AddOrderItemsDto,
  ) {
    if (!dto.items?.length) {
      throw new BadRequestException("At least one item is required");
    }

    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        tableSession: {
          status: TableSessionStatus.OPEN,
          table: {
            branchId,
          },
        },
      },
      include: {
        tableSession: true,
      },
    });

    if (!order) {
      throw new NotFoundException("Open order not found for this branch");
    }

    if (
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.CLOSED
    ) {
      throw new BadRequestException(
        "Cannot add items to a closed or cancelled order",
      );
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const addedSubtotal = await this.createOrderItems(
        tx,
        order.tableSessionId,
        orderId,
        addedByUserId,
        dto.items,
      );

      await tx.order.update({
        where: { id: orderId },
        data: {
          subtotalAmount: order.subtotalAmount.plus(addedSubtotal),
        },
      });

      return tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: this.getOrderInclude(),
      });
    });
  }

  async updateStatus(
    branchId: string,
    orderId: string,
    changedByUserId: string,
    dto: UpdateOrderStatusDto,
  ) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        tableSession: {
          table: {
            branchId,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException("Order not found for this branch");
    }

    if (order.status === dto.status) {
      return this.findById(branchId, orderId);
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

      return tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: this.getOrderInclude(),
      });
    });
  }

  private async createOrderItems(
    tx: Prisma.TransactionClient,
    tableSessionId: string,
    orderId: string,
    addedByUserId: string,
    items: CreateOrderItemDto[],
  ): Promise<Prisma.Decimal> {
    let subtotal = new Prisma.Decimal(0);

    const seatAssignments = await tx.seatAssignment.findMany({
      where: {
        tableSessionId,
        isActive: true,
      },
    });

    const validSeatIds = new Set(seatAssignments.map((seat) => seat.id));

    for (const item of items) {
      if (!validSeatIds.has(item.seatAssignmentId)) {
        throw new BadRequestException(
          `Seat assignment ${item.seatAssignmentId} is invalid for this table session`,
        );
      }

      const menuItem = await tx.menuItem.findUnique({
        where: { id: item.menuItemId },
      });

      if (!menuItem || !menuItem.isAvailable) {
        throw new NotFoundException(
          `Menu item not found or unavailable: ${item.menuItemId}`,
        );
      }

      const modifierOptions = item.modifierOptionIds?.length
        ? await tx.modifierOption.findMany({
            where: {
              id: {
                in: item.modifierOptionIds,
              },
              modifierGroup: {
                menuItemId: item.menuItemId,
              },
              isAvailable: true,
            },
          })
        : [];

      if ((item.modifierOptionIds?.length ?? 0) !== modifierOptions.length) {
        throw new BadRequestException(
          `One or more modifier options are invalid for menu item ${item.menuItemId}`,
        );
      }

      const modifiersTotal = modifierOptions.reduce(
        (sum, option) => sum.plus(option.priceDelta),
        new Prisma.Decimal(0),
      );

      const unitPrice = menuItem.basePrice.plus(modifiersTotal);
      const lineTotal = unitPrice.mul(item.quantity);

      const createdOrderItem = await tx.orderItem.create({
        data: {
          orderId,
          menuItemId: item.menuItemId,
          seatAssignmentId: item.seatAssignmentId,
          quantity: item.quantity,
          unitPrice,
          lineTotal,
          specialInstructions: item.specialInstructions ?? null,
          status: OrderItemStatus.PENDING,
          courseType: item.courseType,
          courseRound: item.courseRound ?? 1,
          fireStatus: this.getDefaultFireStatus(item.courseType),
          addedByUserId,
        },
      });

      for (const option of modifierOptions) {
        await tx.orderItemModifier.create({
          data: {
            orderItemId: createdOrderItem.id,
            modifierOptionId: option.id,
            priceDelta: option.priceDelta,
          },
        });
      }

      subtotal = subtotal.plus(lineTotal);
    }

    return subtotal;
  }

  private getDefaultFireStatus(courseType: CourseType): FireStatus {
    switch (courseType) {
      case CourseType.ENTREE:
        return FireStatus.HOLD;
      case CourseType.APPETIZER:
      case CourseType.DRINK:
      case CourseType.DESSERT:
      case CourseType.SIDE:
      case CourseType.OTHER:
      default:
        return FireStatus.FIRED;
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
          assignedServer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          seatAssignments: {
            where: {
              isActive: true,
            },
            orderBy: {
              seatNumber: "asc" as const,
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
          seatAssignment: true,
          addedByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
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
