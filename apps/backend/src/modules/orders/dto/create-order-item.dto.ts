import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { CourseType } from "@prisma/client";

export class CreateOrderItemDto {
  @IsString()
  menuItemId!: string;

  @IsString()
  seatAssignmentId!: string;

  @IsEnum(CourseType)
  courseType!: CourseType;

  @IsOptional()
  @IsInt()
  @Min(1)
  courseRound?: number;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  specialInstructions?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  modifierOptionIds?: string[];
}
