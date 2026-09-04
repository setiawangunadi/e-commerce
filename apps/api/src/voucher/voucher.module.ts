import { Global, Module } from '@nestjs/common';
import { LabelService } from './label.service';
import { VoucherService } from './voucher.service';

/** Global karena katalog, keranjang, pesanan, dan admin semua memakainya. */
@Global()
@Module({
  providers: [VoucherService, LabelService],
  exports: [VoucherService, LabelService],
})
export class VoucherModule {}
