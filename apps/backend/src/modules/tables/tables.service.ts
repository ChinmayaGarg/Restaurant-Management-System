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

  private getTableInclude() {
    return Prisma.validator<Prisma.DiningTableInclude>()({
      section: true,
      sessions: {
        where: { status: TableSessionStatus.OPEN },
        orderBy: { openedAt: "desc" as const },
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
    });
  }

  async findAll(branchId: string) {
    return this.prisma.diningTable.findMany({
      where: { branchId },
      orderBy: [
        { section: { displayOrder: "asc" as const } },
        { displayName: "asc" as const },
      ],
      include: this.getTableInclude(),
    });
  }
  // async findA ll(branchId: string) {
  // return this.prisma.diningTable.findMany({
  //   where: { branchId },
  //   orderBy: [{ section: { displayOrder: "asc" } }, { displayName: "asc" }],
  //   include: {
  //     section: true,
  //     sessions: {
  //       where: { status: TableSessionStatus.OPEN },
  //       orderBy: { openedAt: "desc" },
  //       take: 1,
  //       include: {
  //         openedByUser: {
  //           select: {
  //             id: true,
  //             firstName: true,
  //             lastName: true,
  //             email: true,
  //           },
  //         },
  //         assignedServer: {
  //           select: {
  //             id: true,
  //             firstName: true,
  //             lastName: true,
  //             email: true,
  //           },
  //         },
  //       },
  //     },
  //   },
  // });
  // }

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
    openedByUserId: string,
    tableId: string,
    dto: OpenTableSessionDto,
  ) {
    const table = await this.prisma.diningTable.findFirst({
      where: {
        id: tableId,
        branchId,
      },
      include: {
        sessions: {
          where: {
            status: TableSessionStatus.OPEN,
          },
          take: 1,
        },
      },
    });

    if (!table) {
      throw new NotFoundException("Table not found for this branch");
    }

    if (table.sessions.length > 0) {
      throw new BadRequestException("This table already has an open session");
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

    const totalSeats = dto.guestCount ?? table.capacity;

    if (totalSeats < 1) {
      throw new BadRequestException("Seat count must be at least 1");
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const tableSession = await tx.tableSession.create({
        data: {
          tableId,
          status: TableSessionStatus.OPEN,
          guestCount: dto.guestCount ?? null,
          openedByUserId,
          assignedServerId: dto.assignedServerId ?? null,
          assignedByUserId: dto.assignedServerId ? openedByUserId : null,
          assignedAt: dto.assignedServerId ? new Date() : null,
        },
      });

      await tx.seatAssignment.createMany({
        data: this.buildSeatAssignments(tableSession.id, totalSeats),
      });

      if (dto.assignedServerId) {
        await tx.tableSessionAssignmentHistory.create({
          data: {
            tableSessionId: tableSession.id,
            fromUserId: null,
            toUserId: dto.assignedServerId,
            changedByUserId: openedByUserId,
            reason: "Initial table assignment",
            startedAt: new Date(),
          },
        });
      }

      await tx.diningTable.update({
        where: { id: tableId },
        data: {
          status: TableStatus.OCCUPIED,
        },
      });

      return tx.tableSession.findUniqueOrThrow({
        where: { id: tableSession.id },
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
          seatAssignments: {
            where: {
              isActive: true,
            },
            orderBy: {
              seatNumber: "asc",
            },
          },
        },
      });
    });
  }

  private buildSeatAssignments(tableSessionId: string, totalSeats: number) {
    const seats: Array<{
      tableSessionId: string;
      seatNumber: number;
      label: string;
      isShared: boolean;
      isActive: boolean;
    }> = [];

    for (let seat = 1; seat <= totalSeats; seat++) {
      seats.push({
        tableSessionId,
        seatNumber: seat,
        label: `Seat ${seat}`,
        isShared: false,
        isActive: true,
      });
    }

    seats.push({
      tableSessionId,
      seatNumber: 0,
      label: "Shared",
      isShared: true,
      isActive: true,
    });

    return seats;
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
