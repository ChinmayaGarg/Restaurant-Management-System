import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { OrderSourceType } from "@prisma/client";
import { CreateOrderItemDto } from "./create-order-item.dto";

export class CreateOrderDto {
  @IsString()
  tableSessionId!: string;

  @IsEnum(OrderSourceType)
  sourceType!: OrderSourceType;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
