import { IsNumber, IsOptional, IsString, Min } from "class-validator";

export class RecordCardPaymentDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  providerReference?: string;
}
