import { ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentService } from '../../src/payment/payment.service';
import type { MidtransService, NotifikasiMidtrans } from '../../src/payment/midtrans.service';
import type { PrismaService } from '../../src/prisma/prisma.service';
import { buatPrismaPalsu, type PrismaPalsu } from '../bantuan/prisma-palsu';

const MIDTRANS_ORDER_ID = 'INV-20260817-0001-abc';

function notif(ubah: Partial<NotifikasiMidtrans> = {}): NotifikasiMidtrans {
  return {
    order_id: MIDTRANS_ORDER_ID,
    status_code: '200',
    gross_amount: '250000.00',
    signature_key: 'signature-yang-sah',
    transaction_status: 'settlement',
    payment_type: 'qris',
    transaction_time: '2026-08-17 10:00:00',
    ...ubah,
  };
}

/** Pesanan ringkas seperti yang dibaca `cariByMidtransId`. */
function pesananRingkas(ubah: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    nomor: 'INV-20260817-0001',
    total: 250_000,
    statusPembayaran: 'MENUNGGU',
    stokSudahDikurangi: false,
    midtransOrderId: MIDTRANS_ORDER_ID,
    ...ubah,
  };
}

/** Pesanan lengkap dengan item, seperti yang dibaca di dalam transaksi pelunasan. */
function pesananLengkap(ubah: Record<string, unknown> = {}) {
  return {
    ...pesananRingkas(ubah),
    items: [
      { productId: 'produk-1', variantId: null, jumlah: 2 },
      { productId: 'produk-2', variantId: 'varian-1', jumlah: 1 },
    ],
    ...ubah,
  };
}

describe('PaymentService', () => {
  let prisma: PrismaPalsu;
  let midtrans: {
    verifikasiSignature: ReturnType<typeof vi.fn>;
    petakanStatus: ReturnType<typeof vi.fn>;
    ambilStatus: ReturnType<typeof vi.fn>;
    siap: ReturnType<typeof vi.fn>;
  };
  let service: PaymentService;

  /** Membuat `order.findUnique` menjawab beda untuk pencarian webhook vs pencarian di transaksi. */
  function siapkanPesanan(ubah: Record<string, unknown> = {}) {
    prisma.order.findUnique.mockImplementation(async (args: { where: Record<string, unknown> }) =>
      args.where.midtransOrderId ? pesananRingkas(ubah) : pesananLengkap(ubah),
    );
  }

  beforeEach(() => {
    prisma = buatPrismaPalsu();
    midtrans = {
      verifikasiSignature: vi.fn().mockReturnValue(true),
      petakanStatus: vi.fn().mockReturnValue('LUNAS'),
      ambilStatus: vi.fn().mockResolvedValue(null),
      siap: vi.fn().mockReturnValue(true),
    };
    service = new PaymentService(
      prisma as unknown as PrismaService,
      midtrans as unknown as MidtransService,
    );
  });

  describe('prosesNotifikasi — keamanan webhook', () => {
    it('menolak notifikasi dengan signature tidak valid', async () => {
      midtrans.verifikasiSignature.mockReturnValue(false);

      await expect(service.prosesNotifikasi(notif())).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.order.findUnique).not.toHaveBeenCalled();
    });

    it('memeriksa signature sebelum menyentuh database sama sekali', async () => {
      midtrans.verifikasiSignature.mockReturnValue(false);

      await service.prosesNotifikasi(notif()).catch(() => undefined);

      expect(prisma.order.update).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('membalas 200 untuk pesanan yang tidak dikenal supaya Midtrans berhenti mencoba ulang', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(service.prosesNotifikasi(notif())).resolves.toEqual({
        diterima: true,
        status: 'DIABAIKAN',
      });
    });

    it('menolak melunasi bila nominalnya tidak sama dengan total pesanan', async () => {
      // Notifikasi sah dari transaksi lain tidak boleh dipakai ulang untuk
      // melunasi pesanan yang lebih mahal.
      siapkanPesanan({ total: 500_000 });

      const hasil = await service.prosesNotifikasi(notif({ gross_amount: '250000.00' }));

      expect(hasil.status).toBe('NOMINAL_TIDAK_COCOK');
      expect(prisma.order.update).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('menolak nominal yang bukan angka', async () => {
      siapkanPesanan();

      const hasil = await service.prosesNotifikasi(notif({ gross_amount: 'bukan-angka' }));

      expect(hasil.status).toBe('NOMINAL_TIDAK_COCOK');
    });

    it('menerima nominal Midtrans yang berakhiran desimal nol', async () => {
      siapkanPesanan({ total: 250_000 });

      const hasil = await service.prosesNotifikasi(notif({ gross_amount: '250000.00' }));

      expect(hasil.status).toBe('LUNAS');
    });
  });

  describe('prosesNotifikasi — pelunasan', () => {
    it('menandai pesanan lunas dan mengurangi stok tiap item', async () => {
      siapkanPesanan();

      const hasil = await service.prosesNotifikasi(notif());

      expect(hasil.status).toBe('LUNAS');
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PAYMENT_SUCCESS',
            statusPembayaran: 'LUNAS',
            stokSudahDikurangi: true,
          }),
        }),
      );
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'produk-1' },
        data: { stok: { decrement: 2 } },
      });
      expect(prisma.productVariant.update).toHaveBeenCalledWith({
        where: { id: 'varian-1' },
        data: { stok: { decrement: 1 } },
      });
    });

    it('mengurangi stok varian, bukan stok produk induknya', async () => {
      // Stok melekat pada varian; mengurangi keduanya akan menggandakan pengurangan.
      siapkanPesanan();

      await service.prosesNotifikasi(notif());

      expect(prisma.product.update).toHaveBeenCalledTimes(1);
      expect(prisma.product.update).not.toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'produk-2' } }),
      );
    });

    it('tidak mengurangi stok dua kali walau Midtrans mengirim notifikasi berulang', async () => {
      // Webhook Midtrans dirancang at-least-once — notifikasi ganda itu normal.
      siapkanPesanan({ stokSudahDikurangi: true });

      const hasil = await service.prosesNotifikasi(notif());

      expect(hasil.status).toBe('LUNAS');
      expect(prisma.product.update).not.toHaveBeenCalled();
      expect(prisma.productVariant.update).not.toHaveBeenCalled();
    });

    it('mencatat waktu settlement Midtrans sebagai WIB', async () => {
      siapkanPesanan();

      await service.prosesNotifikasi(
        notif({ settlement_time: '2026-08-17 15:30:00' }),
      );

      const data = prisma.order.update.mock.calls[0]![0].data;
      expect((data.dibayarPada as Date).toISOString()).toBe('2026-08-17T08:30:00.000Z');
    });

    it('memakai transaction_time bila settlement_time tidak dikirim', async () => {
      siapkanPesanan();

      await service.prosesNotifikasi(notif({ transaction_time: '2026-08-17 09:00:00' }));

      const data = prisma.order.update.mock.calls[0]![0].data;
      expect((data.dibayarPada as Date).toISOString()).toBe('2026-08-17T02:00:00.000Z');
    });

    it('menyimpan metode pembayaran yang dipakai pembeli', async () => {
      siapkanPesanan();

      await service.prosesNotifikasi(notif({ payment_type: 'bank_transfer' }));

      expect(prisma.order.update.mock.calls[0]![0].data.metodePembayaran).toBe('bank_transfer');
    });
  });

  describe('prosesNotifikasi — status selain lunas', () => {
    it('membatalkan pesanan saat pembayaran ditolak', async () => {
      siapkanPesanan();
      midtrans.petakanStatus.mockReturnValue('GAGAL');

      const hasil = await service.prosesNotifikasi(notif({ transaction_status: 'deny' }));

      expect(hasil.status).toBe('GAGAL');
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ statusPembayaran: 'GAGAL', status: 'ORDER_CANCELLED' }),
        }),
      );
    });

    it('menghanguskan pesanan saat Midtrans melaporkan expire', async () => {
      siapkanPesanan();
      midtrans.petakanStatus.mockReturnValue('KEDALUWARSA');

      await service.prosesNotifikasi(notif({ transaction_status: 'expire' }));

      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PAYMENT_EXPIRED' }),
        }),
      );
    });

    it('tidak mengubah status pesanan untuk notifikasi pending', async () => {
      siapkanPesanan();
      midtrans.petakanStatus.mockReturnValue('MENUNGGU');

      await service.prosesNotifikasi(notif({ transaction_status: 'pending' }));

      const data = prisma.order.update.mock.calls[0]![0].data;
      expect(data.statusPembayaran).toBe('MENUNGGU');
      expect(data.status).toBeUndefined();
    });

    it('tidak pernah menurunkan status pesanan yang sudah lunas', async () => {
      // Notifikasi susulan (mis. "expire" yang datang terlambat) tidak boleh
      // membatalkan pesanan yang uangnya sudah masuk.
      siapkanPesanan({ statusPembayaran: 'LUNAS' });
      midtrans.petakanStatus.mockReturnValue('KEDALUWARSA');

      const hasil = await service.prosesNotifikasi(notif({ transaction_status: 'expire' }));

      expect(hasil.status).toBe('SUDAH_LUNAS');
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('tetap memproses notifikasi LUNAS ulang untuk pesanan yang sudah lunas', async () => {
      siapkanPesanan({ statusPembayaran: 'LUNAS', stokSudahDikurangi: true });

      const hasil = await service.prosesNotifikasi(notif());

      expect(hasil.status).toBe('LUNAS');
    });
  });

  describe('sinkronkan — cadangan saat webhook tidak sampai', () => {
    it('tidak melakukan apa pun bila pembeli belum pernah menekan bayar', async () => {
      prisma.order.findUnique.mockResolvedValue(pesananRingkas({ midtransOrderId: null }));

      const hasil = await service.sinkronkan('INV-20260817-0001');

      expect(hasil).toEqual({ diperbarui: false, status: 'BELUM_ADA_TRANSAKSI' });
      expect(midtrans.ambilStatus).not.toHaveBeenCalled();
    });

    it('tidak melakukan apa pun bila transaksinya belum ada di Midtrans', async () => {
      prisma.order.findUnique.mockResolvedValue(pesananRingkas());
      midtrans.ambilStatus.mockResolvedValue(null);

      const hasil = await service.sinkronkan('INV-20260817-0001');

      expect(hasil.status).toBe('BELUM_ADA_TRANSAKSI');
    });

    it('melunasi pesanan yang ternyata sudah dibayar, dengan aturan yang sama seperti webhook', async () => {
      siapkanPesanan();
      midtrans.ambilStatus.mockResolvedValue(notif());

      const hasil = await service.sinkronkan('INV-20260817-0001');

      expect(hasil).toEqual({ diperbarui: true, status: 'LUNAS' });
      expect(prisma.product.update).toHaveBeenCalled();
    });

    it('tidak memeriksa signature — panggilannya keluar sendiri lewat TLS', async () => {
      siapkanPesanan();
      midtrans.ambilStatus.mockResolvedValue(notif({ signature_key: '' }));

      await service.sinkronkan('INV-20260817-0001');

      expect(midtrans.verifikasiSignature).not.toHaveBeenCalled();
    });

    it('tetap menolak nominal yang tidak cocok walau datangnya dari sinkronisasi', async () => {
      siapkanPesanan({ total: 999_000 });
      midtrans.ambilStatus.mockResolvedValue(notif());

      const hasil = await service.sinkronkan('INV-20260817-0001');

      expect(hasil.status).toBe('NOMINAL_TIDAK_COCOK');
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('melaporkan tidak ada perubahan bila statusnya tetap menunggu', async () => {
      siapkanPesanan();
      midtrans.petakanStatus.mockReturnValue('MENUNGGU');
      midtrans.ambilStatus.mockResolvedValue(notif({ transaction_status: 'pending' }));

      const hasil = await service.sinkronkan('INV-20260817-0001');

      expect(hasil).toEqual({ diperbarui: false, status: 'MENUNGGU' });
    });

    it('melaporkan tidak ada perubahan saat pesanan sudah lunas sebelumnya', async () => {
      siapkanPesanan({ statusPembayaran: 'LUNAS', stokSudahDikurangi: true });
      midtrans.ambilStatus.mockResolvedValue(notif());

      const hasil = await service.sinkronkan('INV-20260817-0001');

      expect(hasil.diperbarui).toBe(false);
    });
  });

  describe('sinkronkanYangMenunggu', () => {
    it('tidak jalan bila Midtrans belum dikonfigurasi', async () => {
      midtrans.siap.mockReturnValue(false);

      expect(await service.sinkronkanYangMenunggu()).toBe(0);
      expect(prisma.order.findMany).not.toHaveBeenCalled();
    });

    it('melanjutkan ke pesanan berikutnya walau satu pesanan gagal disinkronkan', async () => {
      // Satu pesanan bermasalah tidak boleh menghentikan seluruh antrean.
      prisma.order.findMany.mockResolvedValue([{ nomor: 'INV-1' }, { nomor: 'INV-2' }]);
      const sinkronkan = vi
        .spyOn(service, 'sinkronkan')
        .mockRejectedValueOnce(new Error('jaringan putus'))
        .mockResolvedValueOnce({ diperbarui: true, status: 'LUNAS' });

      expect(await service.sinkronkanYangMenunggu()).toBe(1);
      expect(sinkronkan).toHaveBeenCalledTimes(2);
    });
  });

  describe('tutupYangKedaluwarsa', () => {
    it('menyelaraskan dulu ke Midtrans sebelum menghanguskan pesanan', async () => {
      // Menghanguskan pesanan yang sebenarnya sudah dibayar jauh lebih merugikan
      // daripada menutupnya terlambat beberapa menit.
      const sinkron = vi.spyOn(service, 'sinkronkanYangMenunggu').mockResolvedValue(0);
      prisma.order.updateMany.mockResolvedValue({ count: 3 });

      const jumlah = await service.tutupYangKedaluwarsa();

      expect(sinkron).toHaveBeenCalledOnce();
      expect(jumlah).toBe(3);
      expect(sinkron.mock.invocationCallOrder[0]).toBeLessThan(
        prisma.order.updateMany.mock.invocationCallOrder[0]!,
      );
    });

    it('hanya menutup pesanan yang masih menunggu bayar dan sudah lewat batas', async () => {
      vi.spyOn(service, 'sinkronkanYangMenunggu').mockResolvedValue(0);

      await service.tutupYangKedaluwarsa();

      const where = prisma.order.updateMany.mock.calls[0]![0].where;
      expect(where.status).toBe('WAITING_PAYMENT');
      expect(where.statusPembayaran).toBe('MENUNGGU');
      expect(where.kedaluwarsaPada.lt).toBeInstanceOf(Date);
    });
  });
});
