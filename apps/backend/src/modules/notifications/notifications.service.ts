import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { SendNotificationDto } from "./dto/send-notification.dto";
import { NotificationsGateway } from "./notifications.gateway";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async findAll(branchId: string, userId: string) {
    return this.prisma.notification.findMany({
      where: {
        branchId,
        OR: [{ targetUserId: null }, { targetUserId: userId }],
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        targetUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async send(branchId: string, dto: SendNotificationDto) {
    if (dto.targetUserId) {
      const user = await this.prisma.user.findFirst({
        where: {
          id: dto.targetUserId,
          branchId,
          status: "ACTIVE",
        },
      });

      if (!user) {
        throw new NotFoundException("Target user not found for this branch");
      }
    }

    const created = await this.prisma.notification.create({
      data: {
        branchId,
        title: dto.title,
        message: dto.message,
        type: dto.type,
        targetUserId: dto.targetUserId,
      },
      include: {
        targetUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    try {
      this.notificationsGateway.emitCreated({
        id: created.id,
        branchId: created.branchId,
        title: created.title,
        message: created.message,
        type: created.type,
        isRead: created.isRead,
        targetUserId: created.targetUserId,
        createdAt: created.createdAt,
        readAt: created.readAt,
      });
    } catch (error) {
      this.logger.error(
        "Failed to emit notification.created event",
        error instanceof Error ? error.stack : String(error),
      );
    }

    return created;
  }

  async markRead(branchId: string, userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        branchId,
        OR: [{ targetUserId: null }, { targetUserId: userId }],
      },
    });

    if (!notification) {
      throw new NotFoundException("Notification not found");
    }

    if (notification.isRead) {
      return this.prisma.notification.findUniqueOrThrow({
        where: { id: notificationId },
        include: {
          targetUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
      include: {
        targetUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    try {
      this.notificationsGateway.emitRead({
        id: updated.id,
        branchId: updated.branchId,
        targetUserId: updated.targetUserId,
        readAt: updated.readAt,
      });
    } catch (error) {
      this.logger.error(
        "Failed to emit notification.read event",
        error instanceof Error ? error.stack : String(error),
      );
    }

    return updated;
  }
}
