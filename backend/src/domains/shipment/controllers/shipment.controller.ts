import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ShipmentService } from '../services/shipment.service';

@ApiTags('Shipment & Delivery Tracking (التوصيل بالخرائط)')
@Controller({ version: '1', path: 'shipments' })
export class ShipmentController {
  constructor(private readonly shipmentService: ShipmentService) {}

  @Post('assign')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'تعيين مندوب التوصيل وتنشيط تتبع الشحنة' })
  async assignCourier(
    @Body()
    dto: {
      orderId: string;
      courierId: string;
      courierName: string;
    },
  ) {
    return this.shipmentService.assignCourier(dto.orderId, dto.courierId, dto.courierName);
  }

  @Post(':orderId/update-gps')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'تحديث خطوط الطول والعرض للـ GPS المباشر على الخريطة' })
  async updateGPS(@Param('orderId') orderId: string, @Body() dto: { lat: number; lng: number }) {
    return this.shipmentService.updateGPSLocation(orderId, dto.lat, dto.lng);
  }

  @Post(':orderId/proof-of-delivery')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'تسجيل إثبات التسليم بصورة الشحنة والتوقيع الإلكتروني للعميل' })
  async recordProof(
    @Param('orderId') orderId: string,
    @Body() dto: { proofImageBase64: string; signatureBase64: string },
  ) {
    return this.shipmentService.recordProofOfDelivery(orderId, dto.proofImageBase64, dto.signatureBase64);
  }

  @Get(':orderId')
  @ApiOperation({ summary: 'تتبع مسار وموقع مندوب التوصيل المباشر' })
  async getStatus(@Param('orderId') orderId: string) {
    return this.shipmentService.getShipmentStatus(orderId);
  }
}
