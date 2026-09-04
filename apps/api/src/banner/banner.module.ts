import { Global, Module } from '@nestjs/common';
import { BannerService } from './banner.service';

/**
 * Global karena dipakai dua tempat: CatalogController (publik) dan
 * AdminController (CRUD), tanpa perlu saling impor modul.
 */
@Global()
@Module({
  providers: [BannerService],
  exports: [BannerService],
})
export class BannerModule {}
