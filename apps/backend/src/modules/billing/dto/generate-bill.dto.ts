import { IsString } from "class-validator";

export class GenerateBillDto {
  @IsString()
  tableSessionId!: string;
}