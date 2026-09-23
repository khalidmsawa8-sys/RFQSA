import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { CorrelationIdMiddleware } from './domains/shared/correlation-id.middleware';
import { IdentityModule } from './domains/identity/identity.module';
import { WalletModule } from './domains/wallet/wallet.module';
import { RFQModule } from './domains/rfq/rfq.module';
import { QuotationModule } from './domains/quotation/quotation.module';
import { OrderModule } from './domains/order/order.module';
import { ShipmentModule } from './domains/shipment/shipment.module';
import { InvoiceModule } from './domains/invoice/invoice.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100, // Default Rate Limit: 100 requests per minute
      },
    ]),
    IdentityModule,
    WalletModule,
    RFQModule,
    QuotationModule,
    OrderModule,
    ShipmentModule,
    InvoiceModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
