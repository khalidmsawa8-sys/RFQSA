import { Controller, Post, Get, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RFQService } from '../services/rfq.service';
import { CreateRFQDto } from '../dtos/create-rfq.dto';

@ApiTags('RFQ Engine (طلب عروض الأسعار)')
@Controller({ version: '1', path: 'rfqs' })
export class RFQController {
  constructor(private readonly rfqService: RFQService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'إنشاء طلب عرض سعر جديد لقطع الغيار' })
  async createRFQ(@Body() dto: CreateRFQDto, @Query('customerId') customerId: string) {
    return this.rfqService.createRFQ(customerId || 'demo-customer-1', dto);
  }

  @Get('vendor-feed')
  @ApiOperation({ summary: 'استعراض الطلبات المنشورة المتاحة للموردين' })
  async getVendorFeed() {
    return this.rfqService.getAvailableRFQsForVendors();
  }

  @Get(':id')
  @ApiOperation({ summary: 'تفاصيل طلب عرض السعر بالتفصيل' })
  async getRFQById(@Param('id') id: string) {
    return this.rfqService.getRFQById(id);
  }
}
