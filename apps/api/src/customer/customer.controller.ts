import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AddressService } from './address.service';
import { BatasiPercobaanLogin } from '../common/batas-login.decorator';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerJwtGuard } from './customer-jwt.guard';
import { CurrentCustomer } from './current-customer.decorator';
import { LoyaltyService } from './loyalty.service';
import { CustomerOrdersService } from './customer-orders.service';
import { TIER } from './loyalty.config';
import {
  AlamatDto,
  DaftarDto,
  MasukDto,
  TukarPoinDto,
  UbahProfilDto,
  UbahSandiDto,
  UpdateAlamatDto,
} from './dto/customer-auth.dto';
import type { CustomerJwtPayload } from './customer.types';

@Controller({ path: 'pelanggan', version: '1' })
export class CustomerController {
  constructor(
    private readonly auth: CustomerAuthService,
    private readonly alamat: AddressService,
    private readonly loyalty: LoyaltyService,
    private readonly pesanan: CustomerOrdersService,
  ) {}

  // --- Terbuka --------------------------------------------------------------

  @Post('daftar')
  @BatasiPercobaanLogin()
  daftar(@Body() dto: DaftarDto) {
    return this.auth.daftar(dto);
  }

  @Post('masuk')
  @HttpCode(HttpStatus.OK)
  @BatasiPercobaanLogin()
  masuk(@Body() dto: MasukDto) {
    return this.auth.masuk(dto);
  }

  /** Aturan program loyalty, dipakai halaman informasi sebelum pembeli punya akun. */
  @Get('tier')
  tier() {
    return TIER.map((t) => ({
      tier: t.tier,
      nama: t.nama,
      minBelanja: t.minBelanja,
      pengali: t.pengali,
      warna: t.warna,
    }));
  }

  // --- Perlu masuk ----------------------------------------------------------

  @Get('saya')
  @UseGuards(CustomerJwtGuard)
  saya(@CurrentCustomer() p: CustomerJwtPayload) {
    return this.auth.profil(p.sub);
  }

  @Patch('saya')
  @UseGuards(CustomerJwtGuard)
  ubahProfil(@CurrentCustomer() p: CustomerJwtPayload, @Body() dto: UbahProfilDto) {
    return this.auth.ubahProfil(p.sub, dto);
  }

  @Post('saya/sandi')
  @UseGuards(CustomerJwtGuard)
  @HttpCode(HttpStatus.OK)
  ubahSandi(@CurrentCustomer() p: CustomerJwtPayload, @Body() dto: UbahSandiDto) {
    return this.auth.ubahSandi(p.sub, dto);
  }

  // --- Buku alamat ----------------------------------------------------------

  @Get('alamat')
  @UseGuards(CustomerJwtGuard)
  daftarAlamat(@CurrentCustomer() p: CustomerJwtPayload) {
    return this.alamat.daftar(p.sub);
  }

  @Post('alamat')
  @UseGuards(CustomerJwtGuard)
  buatAlamat(@CurrentCustomer() p: CustomerJwtPayload, @Body() dto: AlamatDto) {
    return this.alamat.buat(p.sub, dto);
  }

  @Patch('alamat/:id')
  @UseGuards(CustomerJwtGuard)
  ubahAlamat(
    @CurrentCustomer() p: CustomerJwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateAlamatDto,
  ) {
    return this.alamat.perbarui(p.sub, id, dto);
  }

  @Delete('alamat/:id')
  @UseGuards(CustomerJwtGuard)
  hapusAlamat(@CurrentCustomer() p: CustomerJwtPayload, @Param('id') id: string) {
    return this.alamat.hapus(p.sub, id);
  }

  // --- Pesanan --------------------------------------------------------------

  @Get('pesanan')
  @UseGuards(CustomerJwtGuard)
  daftarPesanan(
    @CurrentCustomer() p: CustomerJwtPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.pesanan.daftar(p.sub, {
      page: Math.max(1, page),
      limit: Math.min(50, Math.max(1, limit)),
    });
  }

  // --- Loyalty --------------------------------------------------------------

  @Get('loyalty')
  @UseGuards(CustomerJwtGuard)
  loyaltySaya(@CurrentCustomer() p: CustomerJwtPayload) {
    return this.loyalty.ringkasan(p.sub);
  }

  @Get('loyalty/mutasi')
  @UseGuards(CustomerJwtGuard)
  mutasiPoin(
    @CurrentCustomer() p: CustomerJwtPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.loyalty.mutasi(p.sub, {
      page: Math.max(1, page),
      limit: Math.min(50, Math.max(1, limit)),
    });
  }

  @Post('loyalty/tukar-voucher')
  @UseGuards(CustomerJwtGuard)
  tukarVoucher(@CurrentCustomer() p: CustomerJwtPayload, @Body() dto: TukarPoinDto) {
    return this.loyalty.tukarJadiVoucher(p.sub, dto.poin);
  }
}
