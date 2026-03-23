import { ServiceRequestSourceType, ServiceRequestType } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

export class CreateServiceRequestDto {
  @IsString()
  tableSessionId!: string;

  @IsEnum(ServiceRequestType)
  requestType!: ServiceRequestType;

  @IsEnum(ServiceRequestSourceType)
  sourceType!: ServiceRequestSourceType;

  @IsOptional()
  @IsString()
  sourceDeviceId?: string;
}
