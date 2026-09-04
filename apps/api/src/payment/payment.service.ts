import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MidtransService, type NotifikasiMidtrans } from './midtrans.service';
import type { PaymentStatus } from '../generated/prisma/enums.ts';

/** Hasil pemrosesan, dipakai untuk logging & respons ke Midtrans. */
type HasilProses =
  | 'LUNAS'
  | 'MENUNGGU'
  | 'GAGAL'
  | 'KEDALUWARSA'
  | 'DITANTANG'
  | 'DIABAIKAN'
  | 'NOMINAL_TIDAK_COCOK'
  | 'SUDAH_LUNAS'
  | 'BELUM_ADA_TRANSAKSI';

interface OrderRingkas {
  id: string;
  nomor: string;
  total: number;
  statusPembayaran: PaymentStatus;
  stokSudahDikurangi: boolean;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly midtrans: MidtransService,
  ) {}

  /**
   * Memproses notifikasi pembayaran dari Midtrans (webhook).
   *
   * Endpoint ini terbuka ke internet, jadi keaslian pesan hanya dijamin oleh
   * signature — bukan oleh IP atau apa pun yang bisa dipalsukan.
   */
  async prosesNotifikasi(notif: NotifikasiMidtrans): Promise<{ diterima: true; status: string }> {
    if (!this.midtrans.verifikasiSignature(notif)) {
      this.logger.warn(`Signature notifikasi tidak valid untuk order_id ${notif.order_id}`);
      throw new ForbiddenException('Signature tidak valid');
    }

    const order = await this.cariByMidtransId(notif.order_id);
    if (!order) {
      // Dijawab 200 agar Midtrans berhenti mencoba ulang untuk order yang
      // memang tidak ada di sistem kita.
      this.logger.warn(`Notifikasi untuk order tidak dikenal: ${notif.order_id}`);
      return { diterima: true, status: 'DIABAIKAN' };
    }

    const status = await this.terapkan(order, notif, 'webhook');
    return { diterima: true, status };
  }

  /**
   * Menyelaraskan status pesanan dengan keadaan sebenarnya di Midtrans.
   *
   * Ini cadangan untuk webhook yang tidak sampai — kejadian yang wajar saat
   * Notification URL belum dipasang, server sempat mati, atau jaringan putus.
   * Karena kita sendiri yang memanggil API Midtrans lewat TLS, tidak ada
   * signature yang perlu diperiksa di sini.
   */
  async sinkronkan(nomorPesanan: string): Promise<{ diperbarui: boolean; status: HasilProses }> {
    const order = await this.prisma.order.findUnique({
      where: { nomor: nomorPesanan },
      select: {
        id: true,
        nomor: true,
        total: true,
        statusPembayaran: true,
        stokSudahDikurangi: true,
        midtransOrderId: true,
      },
    });

    if (!order?.midtransOrderId) {
      // Pembeli belum pernah menekan tombol bayar, jadi belum ada apa pun
      // untuk diselaraskan.
      return { diperbarui: false, status: 'BELUM_ADA_TRANSAKSI' };
    }

    const notif = await this.midtrans.ambilStatus(order.midtransOrderId);
    if (!notif) return { diperbarui: false, status: 'BELUM_ADA_TRANSAKSI' };

    const sebelum = order.statusPembayaran;
    const status = await this.terapkan(order, notif, 'sinkron');

    return { diperbarui: status === 'LUNAS' ? sebelum !== 'LUNAS' : sebelum !== status, status };
  }

  /**
   * Menyelaraskan semua pesanan yang masih menunggu bayar.
   * Dipanggil terjadwal supaya pesanan tidak menggantung walau webhook mati.
   */
  async sinkronkanYangMenunggu(): Promise<number> {
    if (!this.midtrans.siap()) return 0;

    const menunggu = await this.prisma.order.findMany({
      where: {
        statusPembayaran: 'MENUNGGU',
        status: 'WAITING_PAYMENT',
        midtransOrderId: { not: null },
      },
      select: { nomor: true },
      take: 100,
    });

    let berubah = 0;
    for (const o of menunggu) {
      try {
        const hasil = await this.sinkronkan(o.nomor);
        if (hasil.diperbarui) berubah++;
      } catch (e) {
        this.logger.warn(
          `Gagal menyelaraskan ${o.nomor}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    if (berubah > 0) this.logger.log(`${berubah} pesanan diperbarui dari sinkronisasi Midtrans`);
    return berubah;
  }

  // -------------------------------------------------------------------------

  private cariByMidtransId(midtransOrderId: string) {
    return this.prisma.order.findUnique({
      where: { midtransOrderId },
      select: {
        id: true,
        nomor: true,
        total: true,
        statusPembayaran: true,
        stokSudahDikurangi: true,
      },
    });
  }

  /**
   * Menerapkan hasil pembayaran ke pesanan.
   *
   * Dipakai bersama webhook dan sinkronisasi supaya keduanya tidak pernah
   * berbeda perlakuan — "apa yang terjadi saat pesanan lunas" hanya ditulis
   * satu kali di sini.
   */
  private async terapkan(
    order: OrderRingkas,
    notif: NotifikasiMidtrans,
    sumber: 'webhook' | 'sinkron',
  ): Promise<HasilProses> {
    // Nominal dicocokkan supaya notifikasi yang lolos signature tapi jumlahnya
    // berbeda (mis. hasil replay dari transaksi lain) tidak melunasi pesanan.
    const nominal = Math.round(Number(notif.gross_amount));
    if (!Number.isFinite(nominal) || nominal !== order.total) {
      this.logger.error(
        `[${sumber}] Nominal ${notif.gross_amount} tidak sama dengan total pesanan ${order.nomor} (${order.total})`,
      );
      return 'NOMINAL_TIDAK_COCOK';
    }

    const hasil = this.midtrans.petakanStatus(notif);

    // Pesanan yang sudah lunas tidak pernah diturunkan statusnya oleh
    // notifikasi susulan.
    if (order.statusPembayaran === 'LUNAS' && hasil !== 'LUNAS') {
      this.logger.warn(`[${sumber}] "${hasil}" diabaikan, pesanan ${order.nomor} sudah lunas`);
      return 'SUDAH_LUNAS';
    }

    if (hasil === 'LUNAS') {
      await this.tandaiLunas(order.id, notif, sumber);
      return 'LUNAS';
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        statusPembayaran: hasil as PaymentStatus,
        metodePembayaran: notif.payment_type ?? undefined,
        ...(hasil === 'GAGAL' ? { status: 'ORDER_CANCELLED' as const } : {}),
        ...(hasil === 'KEDALUWARSA' ? { status: 'PAYMENT_EXPIRED' as const } : {}),
      },
    });

    this.logger.log(`[${sumber}] Pesanan ${order.nomor} -> ${hasil}`);
    return hasil;
  }

  /**
   * Menandai lunas dan mengurangi stok dalam satu transaksi.
   *
   * `stokSudahDikurangi` menjaga agar stok hanya berkurang sekali, walaupun
   * Midtrans mengirim notifikasi berkali-kali ATAU sinkronisasi dijalankan
   * berulang untuk pesanan yang sama.
   */
  private async tandaiLunas(
    orderId: string,
    notif: NotifikasiMidtrans,
    sumber: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
      if (!order) return;

      const waktuBayar = notif.settlement_time ?? notif.transaction_time;

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'PAYMENT_SUCCESS',
          statusPembayaran: 'LUNAS',
          metodePembayaran: notif.payment_type ?? undefined,
          // Waktu dari Midtrans selalu WIB tanpa penanda zona.
          dibayarPada: waktuBayar ? new Date(waktuBayar.replace(' ', 'T') + '+07:00') : new Date(),
          stokSudahDikurangi: true,
        },
      });

      if (order.stokSudahDikurangi) {
        this.logger.log(`[${sumber}] Stok ${order.nomor} sudah pernah dikurangi, dilewati`);
        return;
      }

      for (const item of order.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stok: { decrement: item.jumlah } },
          });
        } else if (item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stok: { decrement: item.jumlah } },
          });
        }
      }

      this.logger.log(
        `[${sumber}] Pesanan ${order.nomor} LUNAS — stok ${order.items.length} item dikurangi`,
      );
    });
  }

  /**
   * Menutup pesanan yang lewat batas bayar.
   *
   * Sebelum menghanguskan, statusnya diselaraskan dulu ke Midtrans —
   * menghanguskan pesanan yang sebenarnya sudah dibayar jauh lebih merugikan
   * daripada menutupnya terlambat beberapa menit.
   */
  async tutupYangKedaluwarsa(): Promise<number> {
    await this.sinkronkanYangMenunggu();

    const hasil = await this.prisma.order.updateMany({
      where: {
        status: 'WAITING_PAYMENT',
        statusPembayaran: 'MENUNGGU',
        kedaluwarsaPada: { lt: new Date() },
      },
      data: { status: 'PAYMENT_EXPIRED', statusPembayaran: 'KEDALUWARSA' },
    });

    if (hasil.count > 0) {
      this.logger.log(`${hasil.count} pesanan ditutup karena lewat batas bayar`);
    }
    return hasil.count;
  }
}
