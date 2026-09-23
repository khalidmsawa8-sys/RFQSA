import { Controller, Get, Post, Body, Headers, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { WalletService } from '../services/wallet.service';

@ApiTags('Wallet & Double-Entry Ledger')
@Controller({ version: '1', path: 'wallet' })
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  @ApiOperation({ summary: 'استعلام عن الرصيد المتاح والمحجوز للمستخدم' })
  async getBalance(@Query('userId') userId: string) {
    return this.walletService.getBalance(userId || 'demo-user-1');
  }

  @Post('deposit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'شحن المحفظة بـ Idempotency Key' })
  @ApiHeader({ name: 'x-idempotency-key', required: true, description: 'متاح لمنع تكرار الشحن' })
  async deposit(
    @Body('userId') userId: string,
    @Body('amount') amount: number,
    @Headers('x-idempotency-key') idempotencyKey: string,
  ) {
    const key = idempotencyKey || `DEP_${Date.now()}`;
    return this.walletService.deposit(userId || 'demo-user-1', amount, key);
  }
}
