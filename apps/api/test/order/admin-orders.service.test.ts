import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminOrdersService, LABEL_STATUS } from '../../src/order/admin-orders.service';
import type { LoyaltyService } from '../../src/customer/loyalty.service';
import type { PrismaService } from '../../src/prisma/prisma.service';
import type { OrderStatus } from '../../src/generated/prisma/enums';
import { buatPrismaPalsu, type PrismaPalsu } from '../bantuan/prisma-palsu';

/** Bentuk lengkap yang dibaca `detail()` setelah status berpindah. */
function pesananLengkap(ubah: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    nomor: 'INV-20260817-0001',
    status: 'PAYMENT_SUCCESS',
    statusPembayaran: 'LUNAS',
    metodePembayaran: 'qris',
    namaPembeli: 'Budi',
    emailPembeli: 'budi@contoh.id',
    teleponPembeli: '081234567890',
    alamatLengkap: 'Jl. Merdeka 1',
    provinsi: 'Jawa Barat',
    kota: 'Kota Bandung',
    kecamatan: null,
    kodePos: '40111',
    catatanAlamat: null,
    kurir: 'JNE',
    layananKurir: 'REG',
    namaLayanan: 'Reguler',
    estimasiTiba: '2-3 hari',
    beratTotal: 1200,
    nomorResi: null,
    penyediaOngkir: 'tarif-lokal',
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmContent: null,
    landingSlug: null,
    items: [],
    subtotal: 200_000,
    ongkir: 20_000,
    diskon: 0,
    poinDipakai: 0,
    potonganPoin: 0,
    total: 220_000,
    kedaluwarsaPada: new Date('2026-08-18T00:00:00Z'),
    dibayarPada: new Date('2026-08-17T00:00:00Z'),
    createdAt: new Date('2026-08-17T00:00:00Z'),
    updatedAt: new Date('2026-08-17T00:00:00Z'),
    ...ubah,
  };
}

describe('AdminOrdersService', () => {
  let prisma: PrismaPalsu;
  let loyalty: { kreditkanDariPesanan: ReturnType<typeof vi.fn>; kembalikan: ReturnType<typeof vi.fn> };
  let service: AdminOrdersService;

  /**
   * `ubahStatus` membaca pesanan dua kali dengan bentuk berbeda: `select` untuk
   * pemeriksaan transisi, lalu `include` saat menyusun response detail.
   */
  function siapkanPesanan(ubah: Record<string, unknown> = {}) {
    prisma.order.findUnique.mockImplementation(async (args: Record<string, unknown>) =>
      args.include ? pesananLengkap(ubah) : pesananLengkap(ubah),
    );
  }

  beforeEach(() => {
    prisma = buatPrismaPalsu();
    loyalty = {
      kreditkanDariPesanan: vi.fn().mockResolvedValue(0),
      kembalikan: vi.fn().mockResolvedValue(undefined),
    };
    service = new AdminOrdersService(
      prisma as unknown as PrismaService,
      loyalty as unknown as LoyaltyService,
    );
  });

  describe('ubahStatus — aturan perpindahan', () => {
    it('menolak pesanan yang tidak ada', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(service.ubahStatus('tidak-ada', 'PROCESS_ORDER')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('MENOLAK admin melunasi pesanan secara manual', async () => {
      // Pelunasan hanya boleh datang dari notifikasi Midtrans, supaya catatan
      // uang tidak pernah menyimpang dari kenyataan.
      siapkanPesanan({ status: 'WAITING_PAYMENT', statusPembayaran: 'MENUNGGU' });

      await expect(service.ubahStatus('order-1', 'PAYMENT_SUCCESS')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('mengizinkan pembatalan pesanan yang belum dibayar', async () => {
      siapkanPesanan({ status: 'WAITING_PAYMENT', statusPembayaran: 'MENUNGGU' });

      await service.ubahStatus('order-1', 'ORDER_CANCELLED');

      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'ORDER_CANCELLED' }) }),
      );
    });

    it('menolak lompatan status — pesanan hanya boleh maju satu langkah', async () => {
      siapkanPesanan({ status: 'PAYMENT_SUCCESS' });

      await expect(service.ubahStatus('order-1', 'ORDER_SEND')).rejects.toThrow(
        /hanya bisa pindah ke/i,
      );
      await expect(service.ubahStatus('order-1', 'ORDER_RECEIPT')).rejects.toThrow(
        /hanya bisa pindah ke/i,
      );
    });

    it('menolak status mundur', async () => {
      siapkanPesanan({ status: 'PROCESS_ORDER' });

      await expect(service.ubahStatus('order-1', 'PAYMENT_SUCCESS')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('menolak perubahan pada pesanan yang sudah final, dengan pesan yang menjelaskan', async () => {
      for (const final of ['ORDER_RECEIPT', 'ORDER_CANCELLED', 'PAYMENT_EXPIRED'] as OrderStatus[]) {
        siapkanPesanan({ status: final });
        await expect(service.ubahStatus('order-1', 'PROCESS_ORDER')).rejects.toThrow(
          /sudah final/i,
        );
      }
    });

    it('menyebut label berbahasa manusia di pesan galat, bukan nama enum', async () => {
      siapkanPesanan({ status: 'PAYMENT_SUCCESS' });

      await expect(service.ubahStatus('order-1', 'ORDER_SEND')).rejects.toThrow(
        new RegExp(LABEL_STATUS.PAYMENT_SUCCESS),
      );
    });

    it('menerima alur lengkap: dibayar → dikemas → dikirim → diterima', async () => {
      siapkanPesanan({ status: 'PAYMENT_SUCCESS' });
      await expect(service.ubahStatus('order-1', 'PROCESS_ORDER')).resolves.toBeDefined();

      siapkanPesanan({ status: 'PROCESS_ORDER' });
      await expect(service.ubahStatus('order-1', 'ORDER_SEND', 'JNE123456')).resolves.toBeDefined();

      siapkanPesanan({ status: 'ORDER_SEND' });
      await expect(service.ubahStatus('order-1', 'ORDER_RECEIPT')).resolves.toBeDefined();
    });
  });

  describe('ubahStatus — nomor resi', () => {
    it('mewajibkan nomor resi saat pesanan diserahkan ke kurir', async () => {
      // Tanpa resi pembeli tidak punya cara melacak — pertanyaan nomor satu ke CS.
      siapkanPesanan({ status: 'PROCESS_ORDER' });

      await expect(service.ubahStatus('order-1', 'ORDER_SEND')).rejects.toThrow(/resi wajib/i);
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('menolak nomor resi yang hanya berisi spasi', async () => {
      siapkanPesanan({ status: 'PROCESS_ORDER' });

      await expect(service.ubahStatus('order-1', 'ORDER_SEND', '   ')).rejects.toThrow(
        /resi wajib/i,
      );
    });

    it('menyimpan nomor resi tanpa spasi berlebih', async () => {
      siapkanPesanan({ status: 'PROCESS_ORDER' });

      await service.ubahStatus('order-1', 'ORDER_SEND', '  JNE123456  ');

      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ nomorResi: 'JNE123456' }) }),
      );
    });

    it('tidak menuntut resi untuk perpindahan status lain', async () => {
      siapkanPesanan({ status: 'PAYMENT_SUCCESS' });

      await expect(service.ubahStatus('order-1', 'PROCESS_ORDER')).resolves.toBeDefined();
    });
  });

  describe('ubahStatus — pembatalan mengembalikan stok', () => {
    it('mengembalikan stok pesanan lunas yang dibatalkan', async () => {
      siapkanPesanan({ status: 'PAYMENT_SUCCESS', stokSudahDikurangi: true });
      prisma.orderItem.findMany.mockResolvedValue([
        { productId: 'produk-1', variantId: null, jumlah: 2 },
        { productId: 'produk-2', variantId: 'varian-1', jumlah: 3 },
      ]);

      await service.ubahStatus('order-1', 'ORDER_CANCELLED');

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'produk-1' },
        data: { stok: { increment: 2 } },
      });
      expect(prisma.productVariant.update).toHaveBeenCalledWith({
        where: { id: 'varian-1' },
        data: { stok: { increment: 3 } },
      });
    });

    it('menurunkan penanda stokSudahDikurangi supaya stok tidak dikembalikan dua kali', async () => {
      siapkanPesanan({ status: 'PAYMENT_SUCCESS', stokSudahDikurangi: true });

      await service.ubahStatus('order-1', 'ORDER_CANCELLED');

      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ stokSudahDikurangi: false }),
        }),
      );
    });

    it('tidak mengembalikan stok pesanan yang memang belum pernah dibayar', async () => {
      siapkanPesanan({ status: 'WAITING_PAYMENT', stokSudahDikurangi: false });

      await service.ubahStatus('order-1', 'ORDER_CANCELLED');

      expect(prisma.product.update).not.toHaveBeenCalled();
      expect(prisma.orderItem.findMany).not.toHaveBeenCalled();
    });
  });

  describe('ubahStatus — poin loyalty', () => {
    it('mengkreditkan poin baru saat barang diterima pembeli, bukan saat dibayar', async () => {
      siapkanPesanan({ status: 'PAYMENT_SUCCESS' });
      await service.ubahStatus('order-1', 'PROCESS_ORDER');
      expect(loyalty.kreditkanDariPesanan).not.toHaveBeenCalled();

      siapkanPesanan({ status: 'ORDER_SEND' });
      await service.ubahStatus('order-1', 'ORDER_RECEIPT');
      expect(loyalty.kreditkanDariPesanan).toHaveBeenCalledWith(expect.anything(), 'order-1');
    });

    it('mengembalikan poin yang sudah terpakai saat pesanan dibatalkan', async () => {
      siapkanPesanan({ status: 'PAYMENT_SUCCESS' });

      await service.ubahStatus('order-1', 'ORDER_CANCELLED');

      expect(loyalty.kembalikan).toHaveBeenCalledWith(expect.anything(), 'order-1');
    });

    it('tidak mengembalikan poin untuk perpindahan status biasa', async () => {
      siapkanPesanan({ status: 'PAYMENT_SUCCESS' });

      await service.ubahStatus('order-1', 'PROCESS_ORDER');

      expect(loyalty.kembalikan).not.toHaveBeenCalled();
    });
  });

  describe('detail', () => {
    it('mengirim daftar status berikutnya yang sah, supaya panel admin tidak menebak', async () => {
      prisma.order.findUnique.mockResolvedValue(pesananLengkap({ status: 'PAYMENT_SUCCESS' }));

      const hasil = await service.detail('order-1');

      expect(hasil.statusBerikutnya).toEqual([
        { status: 'PROCESS_ORDER', label: LABEL_STATUS.PROCESS_ORDER },
        { status: 'ORDER_CANCELLED', label: LABEL_STATUS.ORDER_CANCELLED },
      ]);
    });

    it('mengirim daftar kosong untuk pesanan final', async () => {
      prisma.order.findUnique.mockResolvedValue(pesananLengkap({ status: 'ORDER_RECEIPT' }));

      expect((await service.detail('order-1')).statusBerikutnya).toEqual([]);
    });

    it('menolak pesanan yang tidak ada', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(service.detail('hantu')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('ubahResi', () => {
    it('menolak pengisian resi sebelum pesanan dikirim', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 'order-1', status: 'PROCESS_ORDER' });

      await expect(service.ubahResi('order-1', 'JNE1')).rejects.toThrow(/setelah pesanan dikirim/i);
    });

    it('mengizinkan perbaikan resi setelah dikirim maupun setelah diterima', async () => {
      for (const status of ['ORDER_SEND', 'ORDER_RECEIPT']) {
        prisma.order.findUnique.mockImplementation(async (args: Record<string, unknown>) =>
          args.include ? pesananLengkap({ status }) : { id: 'order-1', status },
        );

        await expect(service.ubahResi('order-1', ' JNE999 ')).resolves.toBeDefined();
        expect(prisma.order.update).toHaveBeenCalledWith({
          where: { id: 'order-1' },
          data: { nomorResi: 'JNE999' },
        });
      }
    });
  });

  describe('ringkasanPenjualan', () => {
    it('menghitung nilai rata-rata pesanan dari pesanan yang benar-benar lunas', async () => {
      prisma.order.count.mockResolvedValue(4);
      prisma.order.aggregate.mockResolvedValue({ _sum: { total: 1_000_000 }, _count: { _all: 4 } });

      const hasil = await service.ringkasanPenjualan();

      expect(hasil.omzet).toBe(1_000_000);
      expect(hasil.nilaiRataRata).toBe(250_000);
    });

    it('tidak membagi dengan nol saat belum ada pesanan lunas', async () => {
      prisma.order.aggregate.mockResolvedValue({ _sum: { total: null }, _count: { _all: 0 } });

      const hasil = await service.ringkasanPenjualan();

      expect(hasil.omzet).toBe(0);
      expect(hasil.nilaiRataRata).toBe(0);
    });

    it('menghitung omzet hanya dari pesanan berstatus pembayaran LUNAS', async () => {
      await service.ringkasanPenjualan();

      expect(prisma.order.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({ where: { statusPembayaran: 'LUNAS' } }),
      );
    });
  });

  describe('daftar', () => {
    it('menghitung jumlah per status tanpa terpengaruh filter status yang sedang dipilih', async () => {
      // Kalau ikut tersaring, angka di tab lain akan jadi nol begitu satu tab dibuka.
      prisma.order.groupBy.mockResolvedValue([
        { status: 'PAYMENT_SUCCESS', _count: { _all: 5 } },
        { status: 'ORDER_SEND', _count: { _all: 2 } },
      ]);

      const hasil = await service.daftar({ page: 1, limit: 20, status: 'ORDER_SEND' });

      expect(prisma.order.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
      expect(hasil.meta.jumlahPerStatus.PAYMENT_SUCCESS).toBe(5);
      expect(hasil.meta.jumlahPerStatus.WAITING_PAYMENT).toBe(0);
    });

    it('selalu melaporkan minimal satu halaman walau hasilnya kosong', async () => {
      const hasil = await service.daftar({ page: 1, limit: 20 });

      expect(hasil.meta.totalHalaman).toBe(1);
    });
  });
});
