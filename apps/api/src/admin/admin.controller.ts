import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { AdminBrandsService } from './admin-brands.service';
import { AdminCategoriesService } from './admin-categories.service';
import { AdminCustomersService } from './admin-customers.service';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminProductsService } from './admin-products.service';
import { UploadService } from './upload.service';
import { BannerService } from '../banner/banner.service';
import { LandingService } from '../landing/landing.service';
import { CreateLandingDto, UpdateLandingDto } from '../landing/dto/landing.dto';
import { AdminOrdersService } from '../order/admin-orders.service';
import { LoyaltyService } from '../customer/loyalty.service';
import { LabelService } from '../voucher/label.service';
import { VoucherService } from '../voucher/voucher.service';
import { CreateLabelDto, UpdateLabelDto } from '../voucher/dto/label.dto';
import { CreateVoucherDto, UpdateVoucherDto } from '../voucher/dto/voucher.dto';
import { PaymentService } from '../payment/payment.service';
import { UbahResiDto, UbahStatusDto } from '../order/dto/admin-order.dto';
import { CreateBannerDto, UpdateBannerDto } from './dto/banner.dto';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { SesuaikanPoinDto, UbahAktifPelangganDto } from './dto/customer.dto';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import type { CustomerTier, OrderStatus, ProductStatus } from '../generated/prisma/enums.ts';

/** Semua endpoint di bawah /admin butuh JWT admin yang valid. */
@Controller({ path: 'admin', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(
    private readonly dashboard: AdminDashboardService,
    private readonly produk: AdminProductsService,
    private readonly kategori: AdminCategoriesService,
    private readonly merek: AdminBrandsService,
    private readonly pelanggan: AdminCustomersService,
    private readonly loyalty: LoyaltyService,
    private readonly banner: BannerService,
    private readonly landing: LandingService,
    private readonly pesanan: AdminOrdersService,
    private readonly payment: PaymentService,
    private readonly voucher: VoucherService,
    private readonly label: LabelService,
    private readonly upload: UploadService,
  ) {}

  @Get('ringkasan')
  ringkasan() {
    return this.dashboard.ringkasan();
  }

  // --- Produk ---------------------------------------------------------------

  @Get('produk')
  daftarProduk(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('q') q?: string,
    @Query('status') status?: ProductStatus,
    @Query('kategoriId') kategoriId?: string,
  ) {
    return this.produk.daftar({
      page: Math.max(1, page),
      limit: Math.min(100, Math.max(1, limit)),
      q,
      status,
      kategoriId,
    });
  }

  @Get('produk/:id')
  detailProduk(@Param('id') id: string) {
    return this.produk.detail(id);
  }

  @Post('produk')
  buatProduk(@Body() dto: CreateProductDto) {
    return this.produk.buat(dto);
  }

  @Patch('produk/:id')
  perbaruiProduk(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.produk.perbarui(id, dto);
  }

  /** Hapus permanen hanya untuk ADMIN — STAFF cukup bisa mengarsipkan lewat PATCH status. */
  @Delete('produk/:id')
  @Roles('ADMIN')
  hapusProduk(@Param('id') id: string) {
    return this.produk.hapus(id);
  }

  // --- Kategori -------------------------------------------------------------

  @Get('kategori')
  daftarKategori() {
    return this.kategori.daftar();
  }

  @Post('kategori')
  @Roles('ADMIN')
  buatKategori(@Body() dto: CreateCategoryDto) {
    return this.kategori.buat(dto);
  }

  @Patch('kategori/:id')
  @Roles('ADMIN')
  perbaruiKategori(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.kategori.perbarui(id, dto);
  }

  @Delete('kategori/:id')
  @Roles('ADMIN')
  hapusKategori(@Param('id') id: string) {
    return this.kategori.hapus(id);
  }

  // --- Banner ---------------------------------------------------------------

  @Get('banner')
  daftarBanner() {
    return this.banner.daftarAdmin();
  }

  @Get('banner/:id')
  detailBanner(@Param('id') id: string) {
    return this.banner.detail(id);
  }

  @Post('banner')
  buatBanner(@Body() dto: CreateBannerDto) {
    return this.banner.buat(dto);
  }

  @Patch('banner/:id')
  perbaruiBanner(@Param('id') id: string, @Body() dto: UpdateBannerDto) {
    return this.banner.perbarui(id, dto);
  }

  @Delete('banner/:id')
  @Roles('ADMIN')
  hapusBanner(@Param('id') id: string) {
    return this.banner.hapus(id);
  }

  // --- Pesanan --------------------------------------------------------------

  @Get('pesanan')
  daftarPesanan(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: OrderStatus,
    @Query('q') q?: string,
  ) {
    return this.pesanan.daftar({
      page: Math.max(1, page),
      limit: Math.min(100, Math.max(1, limit)),
      status,
      q,
    });
  }

  @Get('pesanan/:id')
  detailPesanan(@Param('id') id: string) {
    return this.pesanan.detail(id);
  }

  @Patch('pesanan/:id/status')
  ubahStatusPesanan(@Param('id') id: string, @Body() dto: UbahStatusDto) {
    return this.pesanan.ubahStatus(id, dto.status, dto.nomorResi ?? null);
  }

  /** Menanyakan status pembayaran langsung ke Midtrans, untuk pesanan yang
   *  webhook-nya tidak sampai. */
  @Post('pesanan/:id/sinkron')
  async sinkronPesanan(@Param('id') id: string) {
    const pesanan = await this.pesanan.detail(id);
    const hasil = await this.payment.sinkronkan(pesanan.nomor);
    return { ...hasil, pesanan: await this.pesanan.detail(id) };
  }

  @Patch('pesanan/:id/resi')
  ubahResiPesanan(@Param('id') id: string, @Body() dto: UbahResiDto) {
    return this.pesanan.ubahResi(id, dto.nomorResi);
  }

  // --- Landing page kampanye ------------------------------------------------

  @Get('landing')
  daftarLanding() {
    return this.landing.daftar();
  }

  @Get('landing/:id')
  detailLanding(@Param('id') id: string) {
    return this.landing.detail(id);
  }

  @Post('landing')
  buatLanding(@Body() dto: CreateLandingDto) {
    return this.landing.buat(dto);
  }

  @Patch('landing/:id')
  perbaruiLanding(@Param('id') id: string, @Body() dto: UpdateLandingDto) {
    return this.landing.perbarui(id, dto);
  }

  @Delete('landing/:id')
  @Roles('ADMIN')
  hapusLanding(@Param('id') id: string) {
    return this.landing.hapus(id);
  }

  // --- Voucher --------------------------------------------------------------

  @Get('voucher')
  daftarVoucher() {
    return this.voucher.daftar();
  }

  @Get('voucher/:id')
  detailVoucher(@Param('id') id: string) {
    return this.voucher.detail(id);
  }

  @Post('voucher')
  buatVoucher(@Body() dto: CreateVoucherDto) {
    return this.voucher.buat(dto);
  }

  @Patch('voucher/:id')
  perbaruiVoucher(@Param('id') id: string, @Body() dto: UpdateVoucherDto) {
    return this.voucher.perbarui(id, dto);
  }

  @Delete('voucher/:id')
  @Roles('ADMIN')
  hapusVoucher(@Param('id') id: string) {
    return this.voucher.hapus(id);
  }

  // --- Label promosi --------------------------------------------------------

  // --- Merek ----------------------------------------------------------------

  @Get('merek')
  daftarMerek() {
    return this.merek.daftar();
  }

  @Post('merek')
  @Roles('ADMIN')
  buatMerek(@Body() dto: CreateBrandDto) {
    return this.merek.buat(dto);
  }

  @Patch('merek/:id')
  @Roles('ADMIN')
  perbaruiMerek(@Param('id') id: string, @Body() dto: UpdateBrandDto) {
    return this.merek.perbarui(id, dto);
  }

  @Delete('merek/:id')
  @Roles('ADMIN')
  hapusMerek(@Param('id') id: string) {
    return this.merek.hapus(id);
  }

  // --- Pelanggan ------------------------------------------------------------

  @Get('pelanggan')
  daftarPelanggan(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('q') q?: string,
    @Query('tier') tier?: CustomerTier,
    @Query('aktif') aktif?: string,
  ) {
    return this.pelanggan.daftar({
      page: Math.max(1, page),
      limit: Math.min(100, Math.max(1, limit)),
      q,
      tier,
      aktif: aktif === undefined || aktif === '' ? undefined : aktif === 'true',
    });
  }

  @Get('pelanggan/:id')
  detailPelanggan(@Param('id') id: string) {
    return this.pelanggan.detail(id);
  }

  @Patch('pelanggan/:id')
  @Roles('ADMIN')
  ubahAktifPelanggan(@Param('id') id: string, @Body() dto: UbahAktifPelangganDto) {
    return this.pelanggan.ubahAktif(id, dto.aktif);
  }

  /**
   * Penyesuaian poin manual. Hanya ADMIN: mutasi ini setara memberi uang, dan
   * emailnya ikut tercatat di buku besar sebagai penanggung jawab.
   */
  @Post('pelanggan/:id/poin')
  @Roles('ADMIN')
  sesuaikanPoin(
    @Param('id') id: string,
    @Body() dto: SesuaikanPoinDto,
    @Req() req: FastifyRequest & { admin?: { email: string } },
  ) {
    return this.loyalty.sesuaikan(id, dto.jumlah, dto.alasan, req.admin?.email ?? 'admin');
  }

  @Get('label')
  daftarLabel() {
    return this.label.daftarAdmin();
  }

  @Post('label')
  buatLabel(@Body() dto: CreateLabelDto) {
    return this.label.buat(dto);
  }

  @Patch('label/:id')
  perbaruiLabel(@Param('id') id: string, @Body() dto: UpdateLabelDto) {
    return this.label.perbarui(id, dto);
  }

  @Delete('label/:id')
  @Roles('ADMIN')
  hapusLabel(@Param('id') id: string) {
    return this.label.hapus(id);
  }

  // --- Upload gambar --------------------------------------------------------

  /**
   * Multipart ditangani manual lewat @fastify/multipart — FileInterceptor bawaan
   * NestJS hanya bekerja dengan adapter Express, sedangkan API ini pakai Fastify.
   */
  @Post('upload')
  async unggahGambar(@Req() req: FastifyRequest) {
    if (!req.isMultipart()) {
      throw new BadRequestException('Request harus berupa multipart/form-data');
    }

    const berkas = await req.file();
    if (!berkas) throw new BadRequestException('Tidak ada berkas yang dikirim');

    const buffer = await berkas.toBuffer();
    return this.upload.simpan({
      filename: berkas.filename,
      mimetype: berkas.mimetype,
      buffer,
    });
  }
}
