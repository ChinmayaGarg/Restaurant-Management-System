import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class OpenTableSessionDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  guestCount?: number;

  @IsOptional()
  @IsString()
  assignedServerId?: string;
}
