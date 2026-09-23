import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InvoiceService } from '../services/invoice.service';

@ApiTags('Invoice & ZATCA Integration (الفواتير الهيئة)')
@Controller({ version: '1', path: 'invoices' })
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post('issue')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'إصدار وتوثيق فاتورة إلكترونية معتمدة من ZATCA المرحلة الثانية' })
  async issueInvoice(
    @Body()
    dto: {
      orderId: string;
      customerName: string;
      supplierName: string;
      subtotal: number;
    },
  ) {
    return this.invoiceService.issueInvoice(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'تفاصيل الفاتورة الإلكترونية والـ QR Code والـ UUID الخاص بـ ZATCA' })
  async getInvoice(@Param('id') id: string) {
    return this.invoiceService.getInvoiceById(id);
  }
}
