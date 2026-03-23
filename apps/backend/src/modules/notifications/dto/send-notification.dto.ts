import { IsOptional, IsString, MaxLength } from "class-validator";

export class SendNotificationDto {
  @IsString()
  @MaxLength(150)
  title!: string;

  @IsString()
  @MaxLength(1000)
  message!: string;

  @IsString()
  @MaxLength(50)
  type!: string;

  @IsOptional()
  @IsString()
  targetUserId?: string;
}
