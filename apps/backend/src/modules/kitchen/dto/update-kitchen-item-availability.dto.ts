import { IsBoolean } from "class-validator";

export class UpdateKitchenItemAvailabilityDto {
  @IsBoolean()
  isAvailable!: boolean;
}
