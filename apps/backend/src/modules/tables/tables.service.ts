import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, TableSessionStatus, TableStatus } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { UpdateTableStatusDto } from "./dto/update-table-status.dto";
import { OpenTableSessionDto } from "./dto/open-table-session.dto";

@Injectable()
export class TablesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(branchId: string) {
    return this.prisma.diningTable.findMany({
      where: { branchId },
      orderBy: [{ section: { displayOrder: "asc" } }, { displayName: "asc" }],
      include: {
        section: true,
        sessions: {
          where: { status: TableSessionStatus.OPEN },
          orderBy: { openedAt: "desc" },
          take: 1,
          include: {
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
      },
    });
  }

  async updateStatus(
    branchId: string,
    tableId: string,
    dto: UpdateTableStatusDto,
  ) {
    const table = await this.prisma.diningTable.findFirst({
      where: {
        id: tableId,
        branchId,
      },
      include: {
        sessions: {
          where: { status: TableSessionStatus.OPEN },
          take: 1,
        },
      },
    });

    if (!table) {
      throw new NotFoundException("Table not found for this branch");
    }

    if (dto.status === TableStatus.AVAILABLE && table.sessions.length > 0) {
      throw new BadRequestException(
        "Cannot mark table AVAILABLE while it has an open session",
      );
    }

    if (dto.status === TableStatus.OCCUPIED && table.sessions.length === 0) {
      throw new BadRequestException(
        "Cannot mark table OCCUPIED without an open session",
      );
    }

    return this.prisma.diningTable.update({
      where: { id: tableId },
      data: {
        status: dto.status,
      },
      include: {
        section: true,
      },
    });
  }

  async openSession(
    branchId: string,
    tableId: string,
    openedByUserId: string,
    dto: OpenTableSessionDto,
  ) {
    const table = await this.prisma.diningTable.findFirst({
      where: {
        id: tableId,
        branchId,
      },
      include: {
        sessions: {
          where: { status: TableSessionStatus.OPEN },
          take: 1,
        },
      },
    });

    if (!table) {
      throw new NotFoundException("Table not found for this branch");
    }

    if (table.status === TableStatus.OUT_OF_SERVICE) {
      throw new BadRequestException(
        "Cannot open a session on an out-of-service table",
      );
    }

    if (table.sessions.length > 0) {
      throw new ConflictException("This table already has an open session");
    }

    if (dto.assignedServerId) {
      const assignedServer = await this.prisma.user.findFirst({
        where: {
          id: dto.assignedServerId,
          branchId,
          status: "ACTIVE",
        },
      });

      if (!assignedServer) {
        throw new NotFoundException(
          "Assigned server not found for this branch",
        );
      }
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const session = await tx.tableSession.create({
        data: {
          tableId,
          openedByUserId,
          assignedServerId: dto.assignedServerId,
          guestCount: dto.guestCount,
          status: TableSessionStatus.OPEN,
        },
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
      });

      await tx.diningTable.update({
        where: { id: tableId },
        data: {
          status: TableStatus.OCCUPIED,
        },
      });

      return session;
    });
  }

  async closeSession(branchId: string, tableId: string) {
    const table = await this.prisma.diningTable.findFirst({
      where: {
        id: tableId,
        branchId,
      },
      include: {
        sessions: {
          where: { status: TableSessionStatus.OPEN },
          orderBy: { openedAt: "desc" },
          take: 1,
        },
      },
    });

    if (!table) {
      throw new NotFoundException("Table not found for this branch");
    }

    const openSession = table.sessions[0];

    if (!openSession) {
      throw new BadRequestException("This table has no open session");
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updatedSession = await tx.tableSession.update({
        where: { id: openSession.id },
        data: {
          status: TableSessionStatus.CLOSED,
          closedAt: new Date(),
        },
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
      });

      await tx.diningTable.update({
        where: { id: tableId },
        data: {
          status: TableStatus.AVAILABLE,
        },
      });

      return updatedSession;
    });
  }
}
