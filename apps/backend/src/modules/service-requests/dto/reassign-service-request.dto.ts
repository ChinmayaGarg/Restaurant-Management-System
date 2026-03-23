import { IsString } from "class-validator";

export class ReassignServiceRequestDto {
  @IsString()
  assignedToUserId!: string;
}
