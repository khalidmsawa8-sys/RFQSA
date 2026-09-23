import { IsNotEmpty, IsString, IsNumber, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitQuoteItemDto {
  @ApiProperty({ example: 'فحمات فرامل أمامية' })
  @IsNotEmpty()
  @IsString()
  partName!: string;

  @ApiProperty({ example: 250 })
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiProperty({ example: 90, description: 'مدة الضمان بالأيام' })
  @IsNumber()
  warrantyDays!: number;
}

export class SubmitQuoteDto {
  @ApiProperty({ example: 'rfq-123' })
  @IsNotEmpty()
  @IsString()
  rfqId!: string;

  @ApiProperty({ example: 'مؤسسة قطع الغيار المعتمدة' })
  @IsNotEmpty()
  @IsString()
  supplierName!: string;

  @ApiProperty({ example: 30, description: 'رسوم التوصيل' })
  @IsNumber()
  @Min(0)
  deliveryFee!: number;

  @ApiProperty({ example: 24, description: 'الوقت التقديري بالساعات' })
  @IsNumber()
  estimatedHours!: number;

  @ApiProperty({ type: [SubmitQuoteItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitQuoteItemDto)
  items!: SubmitQuoteItemDto[];
}
