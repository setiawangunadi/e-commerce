import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { MidtransService, type NotifikasiMidtrans } from './midtrans.service';
import { PaymentService } from './payment.service';

@Controller({ path: 'pembayaran', version: '1' })
export class PaymentController {
  constructor(
    private readonly payment: PaymentService,
    private readonly midtrans: MidtransService,
  ) {}

  /** Dipakai frontend untuk tahu apakah tombol bayar bisa ditampilkan. */
  @Get('status-konfigurasi')
  statusKonfigurasi() {
    return { midtransSiap: this.midtrans.siap() };
  }

  /**
   * Endpoint notifikasi Midtrans (Payment Notification URL).
   *
   * Tidak ada guard autentikasi di sini — yang menentukan keaslian adalah
   * signature di dalam body, diperiksa oleh PaymentService.
   *
   * Selalu 200 untuk pesan yang sah tapi tidak relevan, supaya Midtrans tidak
   * mengulang kiriman selamanya.
   */
  @Post('midtrans/notifikasi')
  @HttpCode(HttpStatus.OK)
  notifikasi(@Body() notif: NotifikasiMidtrans) {
    return this.payment.prosesNotifikasi(notif);
  }
}
