import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { SendNotificationDto } from "./dto/send-notification.dto";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.notification.create({
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

    return this.prisma.notification.update({
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
  }
}
