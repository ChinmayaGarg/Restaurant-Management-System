import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  Prisma,
  ServiceRequestStatus,
  TableSessionStatus,
} from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { CreateServiceRequestDto } from "./dto/create-service-request.dto";
import { ReassignServiceRequestDto } from "./dto/reassign-service-request.dto";

@Injectable()
export class ServiceRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(branchId: string) {
    return this.prisma.serviceRequest.findMany({
      where: {
        tableSession: {
          table: {
            branchId,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      include: this.getInclude(),
    });
  }

  async create(
    branchId: string,
    createdByUserId: string,
    dto: CreateServiceRequestDto,
  ) {
    const tableSession = await this.prisma.tableSession.findFirst({
      where: {
        id: dto.tableSessionId,
        status: TableSessionStatus.OPEN,
        table: {
          branchId,
        },
      },
    });

    if (!tableSession) {
      throw new NotFoundException(
        "Open table session not found for this branch",
      );
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const serviceRequest = await tx.serviceRequest.create({
        data: {
          tableSessionId: dto.tableSessionId,
          requestType: dto.requestType,
          sourceType: dto.sourceType,
          sourceDeviceId: dto.sourceDeviceId,
          status: ServiceRequestStatus.OPEN,
          createdByUserId,
        },
      });

      await tx.serviceRequestHistory.create({
        data: {
          serviceRequestId: serviceRequest.id,
          fromStatus: null,
          toStatus: ServiceRequestStatus.OPEN,
          changedByUserId: createdByUserId,
        },
      });

      return tx.serviceRequest.findUniqueOrThrow({
        where: { id: serviceRequest.id },
        include: this.getInclude(),
      });
    });
  }

  async acknowledge(
    branchId: string,
    serviceRequestId: string,
    changedByUserId: string,
  ) {
    const serviceRequest = await this.prisma.serviceRequest.findFirst({
      where: {
        id: serviceRequestId,
        tableSession: {
          table: {
            branchId,
          },
        },
      },
    });

    if (!serviceRequest) {
      throw new NotFoundException("Service request not found for this branch");
    }

    if (
      serviceRequest.status === ServiceRequestStatus.RESOLVED ||
      serviceRequest.status === ServiceRequestStatus.CANCELLED
    ) {
      throw new BadRequestException(
        "Cannot acknowledge a resolved or cancelled request",
      );
    }

    if (serviceRequest.status === ServiceRequestStatus.ACKNOWLEDGED) {
      return this.findById(branchId, serviceRequestId);
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.serviceRequest.update({
        where: { id: serviceRequestId },
        data: {
          status: ServiceRequestStatus.ACKNOWLEDGED,
          acknowledgedAt: new Date(),
          assignedToUserId: changedByUserId,
        },
      });

      await tx.serviceRequestHistory.create({
        data: {
          serviceRequestId,
          fromStatus: serviceRequest.status,
          toStatus: ServiceRequestStatus.ACKNOWLEDGED,
          changedByUserId,
        },
      });

      return tx.serviceRequest.findUniqueOrThrow({
        where: { id: serviceRequestId },
        include: this.getInclude(),
      });
    });
  }

  async resolve(
    branchId: string,
    serviceRequestId: string,
    changedByUserId: string,
  ) {
    const serviceRequest = await this.prisma.serviceRequest.findFirst({
      where: {
        id: serviceRequestId,
        tableSession: {
          table: {
            branchId,
          },
        },
      },
    });

    if (!serviceRequest) {
      throw new NotFoundException("Service request not found for this branch");
    }

    if (
      serviceRequest.status === ServiceRequestStatus.RESOLVED ||
      serviceRequest.status === ServiceRequestStatus.CANCELLED
    ) {
      throw new BadRequestException(
        "Cannot resolve a resolved or cancelled request",
      );
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.serviceRequest.update({
        where: { id: serviceRequestId },
        data: {
          status: ServiceRequestStatus.RESOLVED,
          resolvedAt: new Date(),
          assignedToUserId: serviceRequest.assignedToUserId ?? changedByUserId,
          acknowledgedAt: serviceRequest.acknowledgedAt ?? new Date(),
        },
      });

      await tx.serviceRequestHistory.create({
        data: {
          serviceRequestId,
          fromStatus: serviceRequest.status,
          toStatus: ServiceRequestStatus.RESOLVED,
          changedByUserId,
        },
      });

      return tx.serviceRequest.findUniqueOrThrow({
        where: { id: serviceRequestId },
        include: this.getInclude(),
      });
    });
  }

  async escalate(
    branchId: string,
    serviceRequestId: string,
    changedByUserId: string,
  ) {
    const serviceRequest = await this.prisma.serviceRequest.findFirst({
      where: {
        id: serviceRequestId,
        tableSession: {
          table: {
            branchId,
          },
        },
      },
    });

    if (!serviceRequest) {
      throw new NotFoundException("Service request not found for this branch");
    }

    if (
      serviceRequest.status === ServiceRequestStatus.RESOLVED ||
      serviceRequest.status === ServiceRequestStatus.CANCELLED
    ) {
      throw new BadRequestException(
        "Cannot escalate a resolved or cancelled request",
      );
    }

    if (serviceRequest.status === ServiceRequestStatus.ESCALATED) {
      return this.findById(branchId, serviceRequestId);
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.serviceRequest.update({
        where: { id: serviceRequestId },
        data: {
          status: ServiceRequestStatus.ESCALATED,
        },
      });

      await tx.serviceRequestHistory.create({
        data: {
          serviceRequestId,
          fromStatus: serviceRequest.status,
          toStatus: ServiceRequestStatus.ESCALATED,
          changedByUserId,
        },
      });

      return tx.serviceRequest.findUniqueOrThrow({
        where: { id: serviceRequestId },
        include: this.getInclude(),
      });
    });
  }

  async reassign(
    branchId: string,
    serviceRequestId: string,
    dto: ReassignServiceRequestDto,
  ) {
    const serviceRequest = await this.prisma.serviceRequest.findFirst({
      where: {
        id: serviceRequestId,
        tableSession: {
          table: {
            branchId,
          },
        },
      },
    });

    if (!serviceRequest) {
      throw new NotFoundException("Service request not found for this branch");
    }

    const assignee = await this.prisma.user.findFirst({
      where: {
        id: dto.assignedToUserId,
        branchId,
        status: "ACTIVE",
      },
    });

    if (!assignee) {
      throw new NotFoundException("Assigned user not found for this branch");
    }

    return this.prisma.serviceRequest.update({
      where: { id: serviceRequestId },
      data: {
        assignedToUserId: dto.assignedToUserId,
      },
      include: this.getInclude(),
    });
  }

  async findById(branchId: string, serviceRequestId: string) {
    const serviceRequest = await this.prisma.serviceRequest.findFirst({
      where: {
        id: serviceRequestId,
        tableSession: {
          table: {
            branchId,
          },
        },
      },
      include: this.getInclude(),
    });

    if (!serviceRequest) {
      throw new NotFoundException("Service request not found for this branch");
    }

    return serviceRequest;
  }

  private getInclude() {
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
      assignedToUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      history: {
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
