import { Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { BannerService } from '../banner/banner.service';
import { CatalogService } from './catalog.service';

/** Endpoint publik — tanpa autentikasi (lihat research/tech/02-backend-api.md). */
@Controller({ path: 'catalog', version: '1' })
export class CatalogController {
  constructor(
    private readonly catalog: CatalogService,
    private readonly banner: BannerService,
  ) {}

  @Get('beranda')
  beranda() {
    return this.catalog.beranda();
  }

  @Get('banner')
  bannerTayang() {
    return this.banner.yangTayang();
  }

  @Get('merek')
  merek() {
    return this.catalog.daftarMerek();
  }

  @Get('kategori')
  kategori() {
    return this.catalog.daftarKategori();
  }

  @Get('produk')
  produk(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(12), ParseIntPipe) limit: number,
    @Query('kategori') kategori?: string,
    @Query('merek') merek?: string,
    @Query('q') q?: string,
  ) {
    return this.catalog.daftarProduk({
      page: Math.max(1, page),
      limit: Math.min(48, Math.max(1, limit)),
      kategori,
      merek,
      q,
    });
  }

  @Get('produk/:slug')
  detail(@Param('slug') slug: string) {
    return this.catalog.detailProduk(slug);
  }
}
