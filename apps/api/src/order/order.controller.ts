import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CustomerOpsionalGuard } from '../customer/customer-jwt.guard';
import { CustomerOpsional } from '../customer/current-customer.decorator';
import { BuatOrderDto } from './dto/order.dto';
import type { CustomerJwtPayload } from '../customer/customer.types';

@Controller({ path: 'pesanan', version: '1' })
export class OrderController {
  constructor(private readonly order: OrderService) {}

  /**
   * Guard-nya opsional dengan sengaja: tamu tetap harus bisa checkout, dan
   * token pelanggan yang kedaluwarsa tidak boleh menggagalkan pembelian —
   * pembeli itu cuma kehilangan poinnya, bukan pesanannya.
   */
  @Post()
  @UseGuards(CustomerOpsionalGuard)
  buat(
    @Body() dto: BuatOrderDto,
    @CustomerOpsional() pelanggan: CustomerJwtPayload | null,
    @Headers('x-cart-token') tokenKeranjang?: string,
  ) {
    if (!tokenKeranjang) throw new BadRequestException('Sesi keranjang tidak ditemukan');
    return this.order.buatDariKeranjang(tokenKeranjang, dto, pelanggan?.sub ?? null);
  }

  /** Token pesanan dikirim sebagai query agar tautan status bisa dibagikan. */
  @Get(':nomor')
  lihat(@Param('nomor') nomor: string, @Query('token') token?: string) {
    if (!token) throw new BadRequestException('Token pesanan wajib disertakan');
    return this.order.lihat(nomor, token);
  }

  @Post(':nomor/bayar')
  bayar(@Param('nomor') nomor: string, @Body('token') token?: string) {
    if (!token) throw new BadRequestException('Token pesanan wajib disertakan');
    return this.order.siapkanPembayaran(nomor, token);
  }
}
