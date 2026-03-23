import { IsNumber, Min } from "class-validator";

export class UpdateMenuItemPriceDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  basePrice!: number;
}
