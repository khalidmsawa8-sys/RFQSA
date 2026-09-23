import { Controller, Post, Get, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { QuotationService } from '../services/quotation.service';
import { SubmitQuoteDto } from '../dtos/submit-quote.dto';

@ApiTags('Quotation Engine (عروض الأسعار)')
@Controller({ version: '1', path: 'quotations' })
export class QuotationController {
  constructor(private readonly quotationService: QuotationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'تقديم عرض سعر جديد من المورد لطلب شراء' })
  async submitQuote(@Body() dto: SubmitQuoteDto, @Query('supplierId') supplierId: string) {
    return this.quotationService.submitQuote(supplierId || 'demo-supplier-1', dto);
  }

  @Get('rfq/:rfqId')
  @ApiOperation({ summary: 'استعراض عروض الأسعار المقدمة لطلب محدد' })
  async getQuotesForRFQ(@Param('rfqId') rfqId: string) {
    return this.quotationService.getQuotesForRFQ(rfqId);
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'اعتماد العميل لعرض سعر محدد' })
  async acceptQuote(@Param('id') id: string) {
    return this.quotationService.acceptQuote(id);
  }
}
