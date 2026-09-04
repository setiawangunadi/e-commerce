import { Global, Module } from '@nestjs/common';
import { MidtransService } from './midtrans.service';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PembersihPesanan } from './pembersih-pesanan';

@Global()
@Module({
  controllers: [PaymentController],
  providers: [MidtransService, PaymentService, PembersihPesanan],
  exports: [MidtransService, PaymentService],
})
export class PaymentModule {}
