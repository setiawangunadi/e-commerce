import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentService } from './payment.service';

/**
 * Menutup pesanan yang lewat batas bayar secara berkala.
 *
 * Untuk skala saat ini cron in-process sudah memadai. Bila nanti API dijalankan
 * lebih dari satu instance, pekerjaan ini sebaiknya pindah ke BullMQ agar tidak
 * berjalan ganda — lihat research/tech/02-backend-api.md.
 */
@Injectable()
export class PembersihPesanan {
  private readonly logger = new Logger(PembersihPesanan.name);

  constructor(private readonly payment: PaymentService) {}

  @Cron(CronExpression.EVERY_10_MINUTES, { name: 'tutup-pesanan-kedaluwarsa' })
  async jalankan(): Promise<void> {
    try {
      await this.payment.tutupYangKedaluwarsa();
    } catch (e) {
      this.logger.error(
        `Gagal menutup pesanan kedaluwarsa: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}
