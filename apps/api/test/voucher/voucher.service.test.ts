import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { VoucherService, type ItemUntukVoucher } from '../../src/voucher/voucher.service';
import type { PrismaService } from '../../src/prisma/prisma.service';
import { buatPrismaPalsu, type PrismaPalsu } from '../bantuan/prisma-palsu';

const KEMARIN = new Date(Date.now() - 86_400_000);
const BESOK = new Date(Date.now() + 86_400_000);

function voucher(ubah: Record<string, unknown> = {}) {
  return {
    id: 'voucher-1',
    kode: 'HEMAT10',
    deskripsi: 'Diskon 10%',
    tipe: 'PERSEN',
    nilai: 10,
    maksPotongan: null,
    minBelanja: 0,
    kuota: null,
    terpakai: 0,
    mulai: null,
    selesai: null,
    aktif: true,
    produk: [],
    kategori: [],
    ...ubah,
  };
}

const itemBiasa: ItemUntukVoucher[] = [
  { produkId: 'produk-1', kategoriId: 'kategori-1', subtotal: 150_000 },
  { produkId: 'produk-2', kategoriId: 'kategori-2', subtotal: 50_000 },
];

describe('VoucherService.hitungPotongan', () => {
  let prisma: PrismaPalsu;
  let service: VoucherService;

  beforeEach(() => {
    prisma = buatPrismaPalsu();
    service = new VoucherService(prisma as unknown as PrismaService);
  });

  describe('keberlakuan kode', () => {
    it('menolak kode kosong', async () => {
      await expect(service.hitungPotongan('   ', itemBiasa)).rejects.toThrow(/kosong/i);
    });

    it('mencari kode setelah dirapikan jadi huruf besar', async () => {
      prisma.voucher.findUnique.mockResolvedValue(voucher());

      await service.hitungPotongan('  hemat10 ', itemBiasa);

      expect(prisma.voucher.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { kode: 'HEMAT10' } }),
      );
    });

    it('memberi pesan yang sama untuk kode tidak ada dan kode nonaktif', async () => {
      // Membedakannya akan memberi tahu orang mana kode yang benar tapi sedang
      // dimatikan, dan itu cukup untuk menebak-nebak kode kampanye berikutnya.
      prisma.voucher.findUnique.mockResolvedValue(null);
      const pesanTidakAda = await service.hitungPotongan('APAPUN', itemBiasa).catch((e) => e.message);

      prisma.voucher.findUnique.mockResolvedValue(voucher({ aktif: false }));
      const pesanNonaktif = await service.hitungPotongan('HEMAT10', itemBiasa).catch((e) => e.message);

      expect(pesanTidakAda).toBe(pesanNonaktif);
      expect(pesanTidakAda).toMatch(/tidak berlaku/i);
    });

    it('menolak voucher yang belum mulai', async () => {
      prisma.voucher.findUnique.mockResolvedValue(voucher({ mulai: BESOK }));

      await expect(service.hitungPotongan('HEMAT10', itemBiasa)).rejects.toThrow(/belum bisa/i);
    });

    it('menolak voucher yang sudah lewat masa berlakunya', async () => {
      prisma.voucher.findUnique.mockResolvedValue(voucher({ selesai: KEMARIN }));

      await expect(service.hitungPotongan('HEMAT10', itemBiasa)).rejects.toThrow(/sudah lewat/i);
    });

    it('menerima voucher yang sedang berada dalam jadwalnya', async () => {
      prisma.voucher.findUnique.mockResolvedValue(voucher({ mulai: KEMARIN, selesai: BESOK }));

      await expect(service.hitungPotongan('HEMAT10', itemBiasa)).resolves.toBeDefined();
    });

    it('menolak voucher yang kuotanya sudah habis', async () => {
      prisma.voucher.findUnique.mockResolvedValue(voucher({ kuota: 100, terpakai: 100 }));

      await expect(service.hitungPotongan('HEMAT10', itemBiasa)).rejects.toThrow(/kuota/i);
    });

    it('masih menerima voucher pada pemakaian terakhir yang tersisa', async () => {
      prisma.voucher.findUnique.mockResolvedValue(voucher({ kuota: 100, terpakai: 99 }));

      await expect(service.hitungPotongan('HEMAT10', itemBiasa)).resolves.toBeDefined();
    });
  });

  describe('perhitungan potongan', () => {
    it('menghitung diskon persen dari subtotal yang berlaku', async () => {
      prisma.voucher.findUnique.mockResolvedValue(voucher({ tipe: 'PERSEN', nilai: 10 }));

      const hasil = await service.hitungPotongan('HEMAT10', itemBiasa);

      expect(hasil.subtotalBerlaku).toBe(200_000);
      expect(hasil.potongan).toBe(20_000);
    });

    it('membulatkan diskon persen ke bawah, tidak pernah menambah potongan', async () => {
      prisma.voucher.findUnique.mockResolvedValue(voucher({ tipe: 'PERSEN', nilai: 33 }));
      const item = [{ produkId: 'p', kategoriId: null, subtotal: 10_001 }];

      // 10.001 × 33% = 3.300,33
      expect((await service.hitungPotongan('X', item)).potongan).toBe(3_300);
    });

    it('menghormati batas maksimal potongan pada diskon persen', async () => {
      prisma.voucher.findUnique.mockResolvedValue(
        voucher({ tipe: 'PERSEN', nilai: 50, maksPotongan: 25_000 }),
      );

      expect((await service.hitungPotongan('X', itemBiasa)).potongan).toBe(25_000);
    });

    it('memakai nominal apa adanya untuk voucher potongan tetap', async () => {
      prisma.voucher.findUnique.mockResolvedValue(voucher({ tipe: 'NOMINAL', nilai: 30_000 }));

      expect((await service.hitungPotongan('X', itemBiasa)).potongan).toBe(30_000);
    });

    it('mengabaikan maksPotongan pada voucher nominal', async () => {
      prisma.voucher.findUnique.mockResolvedValue(
        voucher({ tipe: 'NOMINAL', nilai: 30_000, maksPotongan: 5_000 }),
      );

      expect((await service.hitungPotongan('X', itemBiasa)).potongan).toBe(30_000);
    });

    it('tidak pernah memotong lebih dari nilai barang — pembeli tidak ditagih minus', async () => {
      // Ongkir tetap harus dibayar berapa pun promonya.
      prisma.voucher.findUnique.mockResolvedValue(voucher({ tipe: 'NOMINAL', nilai: 500_000 }));

      expect((await service.hitungPotongan('X', itemBiasa)).potongan).toBe(200_000);
    });
  });

  describe('minimal belanja', () => {
    it('menolak bila subtotal yang dikenai voucher belum mencapai minimal belanja', async () => {
      prisma.voucher.findUnique.mockResolvedValue(voucher({ minBelanja: 300_000 }));

      await expect(service.hitungPotongan('X', itemBiasa)).rejects.toThrow(/minimal belanja/i);
    });

    it('menerima bila subtotalnya persis sama dengan minimal belanja', async () => {
      prisma.voucher.findUnique.mockResolvedValue(voucher({ minBelanja: 200_000 }));

      await expect(service.hitungPotongan('X', itemBiasa)).resolves.toBeDefined();
    });

    it('mengukur minimal belanja dari item yang tercakup saja, bukan seluruh keranjang', async () => {
      // Kalau tidak, voucher khusus satu produk bisa "dibuka" hanya dengan
      // menambah barang lain yang sebenarnya tidak termasuk cakupannya.
      prisma.voucher.findUnique.mockResolvedValue(
        voucher({ minBelanja: 200_000, produk: [{ productId: 'produk-2' }] }),
      );

      await expect(service.hitungPotongan('X', itemBiasa)).rejects.toThrow(/minimal belanja/i);
    });
  });

  describe('cakupan produk & kategori', () => {
    it('berlaku untuk seluruh keranjang bila cakupannya kosong', async () => {
      prisma.voucher.findUnique.mockResolvedValue(voucher());

      expect((await service.hitungPotongan('X', itemBiasa)).subtotalBerlaku).toBe(200_000);
    });

    it('hanya mengenai produk yang tercakup', async () => {
      prisma.voucher.findUnique.mockResolvedValue(
        voucher({ tipe: 'NOMINAL', nilai: 10_000, produk: [{ productId: 'produk-2' }] }),
      );

      const hasil = await service.hitungPotongan('X', itemBiasa);

      expect(hasil.subtotalBerlaku).toBe(50_000);
    });

    it('hanya mengenai produk dalam kategori yang tercakup', async () => {
      prisma.voucher.findUnique.mockResolvedValue(
        voucher({ tipe: 'NOMINAL', nilai: 10_000, kategori: [{ categoryId: 'kategori-1' }] }),
      );

      expect((await service.hitungPotongan('X', itemBiasa)).subtotalBerlaku).toBe(150_000);
    });

    it('kategori induk ikut mencakup sub-kategorinya', async () => {
      // Admin yang memilih "Fashion" mengira vouchernya aktif; tanpa perluasan
      // ini voucher itu tidak pernah kena satu produk pun.
      prisma.voucher.findUnique.mockResolvedValue(
        voucher({ tipe: 'NOMINAL', nilai: 10_000, kategori: [{ categoryId: 'fashion' }] }),
      );
      prisma.category.findMany.mockResolvedValue([{ id: 'kategori-1' }, { id: 'kategori-2' }]);

      const hasil = await service.hitungPotongan('X', itemBiasa);

      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { parentId: { in: ['fashion'] } } }),
      );
      expect(hasil.subtotalBerlaku).toBe(200_000);
    });

    it('menolak bila tidak satu pun isi keranjang yang tercakup', async () => {
      prisma.voucher.findUnique.mockResolvedValue(
        voucher({ produk: [{ productId: 'produk-lain' }] }),
      );

      await expect(service.hitungPotongan('X', itemBiasa)).rejects.toThrow(
        /tidak berlaku untuk produk/i,
      );
    });

    it('tidak menganggap item tanpa kategori cocok dengan cakupan kategori', async () => {
      prisma.voucher.findUnique.mockResolvedValue(
        voucher({ kategori: [{ categoryId: 'kategori-1' }] }),
      );

      const tanpaKategori = [{ produkId: 'produk-9', kategoriId: null, subtotal: 90_000 }];
      await expect(service.hitungPotongan('X', tanpaKategori)).rejects.toThrow(/tidak berlaku/i);
    });
  });
});

describe('VoucherService.pakai', () => {
  let prisma: PrismaPalsu;
  let service: VoucherService;

  beforeEach(() => {
    prisma = buatPrismaPalsu();
    service = new VoucherService(prisma as unknown as PrismaService);
  });

  it('menaikkan hitungan pemakaian', async () => {
    prisma.voucher.findUnique.mockResolvedValue({ id: 'voucher-1', kuota: 10, terpakai: 3 });

    await service.pakai(prisma as never, 'HEMAT10');

    expect(prisma.voucher.update).toHaveBeenCalledWith({
      where: { id: 'voucher-1' },
      data: { terpakai: { increment: 1 } },
    });
  });

  it('memeriksa kuota sekali lagi di dalam transaksi pembuatan pesanan', async () => {
    // Dua pembeli yang menekan bayar bersamaan tidak boleh sama-sama lolos
    // pada kuota terakhir.
    prisma.voucher.findUnique.mockResolvedValue({ id: 'voucher-1', kuota: 10, terpakai: 10 });

    await expect(service.pakai(prisma as never, 'HEMAT10')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.voucher.update).not.toHaveBeenCalled();
  });

  it('diam saja bila vouchernya hilang di tengah jalan', async () => {
    prisma.voucher.findUnique.mockResolvedValue(null);

    await expect(service.pakai(prisma as never, 'HILANG')).resolves.toBeUndefined();
  });

  it('tidak membatasi voucher tanpa kuota', async () => {
    prisma.voucher.findUnique.mockResolvedValue({ id: 'v', kuota: null, terpakai: 9999 });

    await expect(service.pakai(prisma as never, 'X')).resolves.toBeUndefined();
    expect(prisma.voucher.update).toHaveBeenCalled();
  });
});

describe('VoucherService — pengelolaan oleh admin', () => {
  let prisma: PrismaPalsu;
  let service: VoucherService;

  const dtoDasar = { kode: 'hemat-10', tipe: 'PERSEN' as const, nilai: 10 };

  beforeEach(() => {
    prisma = buatPrismaPalsu();
    service = new VoucherService(prisma as unknown as PrismaService);
    prisma.voucher.create.mockResolvedValue({ id: 'voucher-1', kode: 'HEMAT-10' });
    prisma.voucher.findUnique.mockImplementation(async (args: Record<string, never>) =>
      (args.where as Record<string, unknown>).id ? voucher() : null,
    );
  });

  it('menormalkan kode jadi huruf besar tanpa spasi', async () => {
    await service.buat({ ...dtoDasar, kode: ' hemat 10 ' });

    expect(prisma.voucher.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ kode: 'HEMAT10' }) }),
    );
  });

  it('menolak kode dengan karakter yang tidak bisa diketik ulang pembeli', async () => {
    await expect(service.buat({ ...dtoDasar, kode: 'HEMAT@10!' })).rejects.toThrow(
      /huruf, angka, dan tanda hubung/i,
    );
  });

  it('menolak kode yang terlalu pendek', async () => {
    await expect(service.buat({ ...dtoDasar, kode: 'AB' })).rejects.toThrow(/3–32 karakter/);
  });

  it('menolak kode yang sudah dipakai voucher lain', async () => {
    prisma.voucher.findUnique.mockResolvedValue({ id: 'lain' });

    await expect(service.buat(dtoDasar)).rejects.toThrow(/sudah dipakai/i);
  });

  it('menolak diskon persen di luar 1–100', async () => {
    await expect(service.buat({ ...dtoDasar, nilai: 0 })).rejects.toThrow(/antara 1 dan 100/);
    await expect(service.buat({ ...dtoDasar, nilai: 101 })).rejects.toThrow(/antara 1 dan 100/);
  });

  it('menolak potongan nominal nol atau negatif', async () => {
    await expect(
      service.buat({ kode: 'NOL', tipe: 'NOMINAL', nilai: 0 }),
    ).rejects.toThrow(/lebih dari 0/);
  });

  it('tidak menyimpan maksPotongan pada voucher nominal', async () => {
    // Kolom itu tidak punya arti untuk potongan tetap; menyimpannya hanya
    // membuat form admin menampilkan nilai yang tidak berpengaruh.
    await service.buat({ kode: 'TETAP', tipe: 'NOMINAL', nilai: 25_000, maksPotongan: 10_000 });

    expect(prisma.voucher.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ maksPotongan: null }) }),
    );
  });

  it('menolak jadwal yang selesainya lebih dulu daripada mulainya', async () => {
    await expect(
      service.buat({ ...dtoDasar, mulai: '2026-09-01T00:00:00Z', selesai: '2026-08-01T00:00:00Z' }),
    ).rejects.toThrow(/setelah tanggal mulai/i);
  });

  it('menolak menghapus voucher yang tidak ada', async () => {
    prisma.voucher.findUnique.mockResolvedValue(null);

    await expect(service.hapus('hantu')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('menjelaskan keadaan tiap voucher di daftar admin', async () => {
    prisma.voucher.findMany.mockResolvedValue([
      voucher({ id: '1', aktif: false, _count: { produk: 0, kategori: 0 } }),
      voucher({ id: '2', mulai: BESOK, _count: { produk: 0, kategori: 0 } }),
      voucher({ id: '3', selesai: KEMARIN, _count: { produk: 0, kategori: 0 } }),
      voucher({ id: '4', kuota: 5, terpakai: 5, _count: { produk: 0, kategori: 0 } }),
      voucher({ id: '5', _count: { produk: 2, kategori: 1 } }),
    ]);

    const daftar = await service.daftar();

    expect(daftar.map((v) => v.keadaan)).toEqual([
      'Nonaktif',
      'Terjadwal',
      'Kedaluwarsa',
      'Kuota habis',
      'Aktif',
    ]);
    expect(daftar[4]!.cakupan).toBe('2 produk, 1 kategori');
    expect(daftar[0]!.cakupan).toBe('Semua produk');
  });
});
