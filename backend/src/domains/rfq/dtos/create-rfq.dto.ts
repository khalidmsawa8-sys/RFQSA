import { IsNotEmpty, IsString, IsNumber, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRFQItemDto {
  @ApiProperty({ example: 'فحمات فرامل أمامية' })
  @IsNotEmpty({ message: 'اسم القطعة مطلوب' })
  @IsString()
  partName!: string;

  @ApiProperty({ example: '04465-0K280', required: false })
  partNumber?: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  quantity!: number;
}

export class CreateRFQDto {
  @ApiProperty({ example: 'Toyota' })
  @IsNotEmpty()
  @IsString()
  vehicleBrand!: string;

  @ApiProperty({ example: 'Camry' })
  @IsNotEmpty()
  @IsString()
  vehicleModel!: string;

  @ApiProperty({ example: 2024 })
  @IsNumber()
  vehicleYear!: number;

  @ApiProperty({ example: 'JTDKN3DU0A1234567' })
  @IsNotEmpty()
  @IsString()
  vin!: string;

  @ApiProperty({ type: [CreateRFQItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRFQItemDto)
  items!: CreateRFQItemDto[];
}
