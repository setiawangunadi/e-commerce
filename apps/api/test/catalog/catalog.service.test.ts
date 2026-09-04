import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogService } from '../../src/catalog/catalog.service';
import type { BannerService } from '../../src/banner/banner.service';
import type { PrismaService } from '../../src/prisma/prisma.service';
import { buatPrismaPalsu, type PrismaPalsu } from '../bantuan/prisma-palsu';

function produk(ubah: Record<string, unknown> = {}) {
  return {
    id: 'produk-1',
    nama: 'Kemeja Flanel',
    slug: 'kemeja-flanel',
    deskripsi: null,
    deskripsiSingkat: null,
    brand: null,
    sku: 'SKU-1',
    harga: 189_000,
    hargaCoret: null,
    hpp: 90_000,
    berat: 400,
    stok: 10,
    stokMinimum: 5,
    status: 'PUBLISHED',
    metaTitle: null,
    metaDescription: null,
    linkShopee: null,
    linkTiktok: null,
    category: null,
    labels: [],
    images: [],
    variants: [],
    ...ubah,
  };
}

function kategori(ubah: Record<string, unknown> = {}) {
  return {
    id: 'kategori-1',
    nama: 'Fashion',
    slug: 'fashion',
    deskripsi: null,
    gambarUrl: null,
    parentId: null,
    parent: null,
    _count: { products: 0 },
    ...ubah,
  };
}

describe('CatalogService', () => {
  let prisma: PrismaPalsu;
  let banner: { yangTayang: ReturnType<typeof vi.fn> };
  let service: CatalogService;

  beforeEach(() => {
    prisma = buatPrismaPalsu();
    banner = { yangTayang: vi.fn().mockResolvedValue([]) };
    service = new CatalogService(
      prisma as unknown as PrismaService,
      banner as unknown as BannerService,
    );
  });

  describe('hanya produk terbit yang terlihat publik', () => {
    it('menyaring daftar produk ke status PUBLISHED', async () => {
      await service.daftarProduk({ page: 1, limit: 12 });

      expect(prisma.product.findMany.mock.calls[0]![0].where.status).toBe('PUBLISHED');
    });

    it('menolak membuka detail produk yang masih draft', async () => {
      // Tautan langsung ke slug draft tidak boleh membocorkan produk yang
      // belum siap dijual.
      prisma.product.findFirst.mockResolvedValue(null);

      await expect(service.detailProduk('produk-draft')).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.product.findFirst.mock.calls[0]![0].where.status).toBe('PUBLISHED');
    });

    it('tidak membocorkan HPP di detail produk publik', async () => {
      prisma.product.findFirst.mockResolvedValue(produk());

      expect(await service.detailProduk('kemeja-flanel')).not.toHaveProperty('hpp');
    });
  });

  describe('penyaringan kategori', () => {
    it('kategori induk ikut menampilkan produk sub-kategorinya', async () => {
      // Tanpa ini, membuka "Fashion" akan tampil kosong karena produknya
      // sebenarnya duduk di sub-kategori.
      await service.daftarProduk({ page: 1, limit: 12, kategori: 'fashion' });

      expect(prisma.product.findMany.mock.calls[0]![0].where.category).toEqual({
        OR: [{ slug: 'fashion' }, { parent: { slug: 'fashion' } }],
      });
    });

    it('mencari di nama, deskripsi singkat, dan brand', async () => {
      await service.daftarProduk({ page: 1, limit: 12, q: 'flanel' });

      const or = prisma.product.findMany.mock.calls[0]![0].where.OR;
      expect(or.map((k: Record<string, unknown>) => Object.keys(k)[0])).toEqual([
        'nama',
        'deskripsiSingkat',
        'brand',
      ]);
    });

    it('menggabungkan filter kategori dan pencarian', async () => {
      await service.daftarProduk({ page: 1, limit: 12, kategori: 'fashion', q: 'flanel' });

      const where = prisma.product.findMany.mock.calls[0]![0].where;
      expect(where.category).toBeDefined();
      expect(where.OR).toBeDefined();
    });
  });

  describe('paginasi', () => {
    it('melompati hasil sesuai halaman', async () => {
      await service.daftarProduk({ page: 3, limit: 12 });

      expect(prisma.product.findMany.mock.calls[0]![0].skip).toBe(24);
      expect(prisma.product.findMany.mock.calls[0]![0].take).toBe(12);
    });

    it('selalu melaporkan minimal satu halaman', async () => {
      prisma.product.count.mockResolvedValue(0);

      const hasil = await service.daftarProduk({ page: 1, limit: 12 });

      expect(hasil.meta.totalHalaman).toBe(1);
    });

    it('membulatkan jumlah halaman ke atas', async () => {
      prisma.product.count.mockResolvedValue(25);

      expect((await service.daftarProduk({ page: 1, limit: 12 })).meta.totalHalaman).toBe(3);
    });
  });

  describe('jumlah produk per kategori', () => {
    it('menambahkan produk sub-kategori ke hitungan induknya', async () => {
      // Angka ini yang dipakai etalase untuk memutuskan sebuah kategori layak
      // ditampilkan; induk yang produknya semua di anak tidak boleh nol.
      prisma.category.findMany.mockResolvedValue([
        kategori({ id: 'induk', slug: 'fashion', _count: { products: 0 } }),
        kategori({ id: 'anak-1', slug: 'pakaian-pria', parentId: 'induk', _count: { products: 5 } }),
        kategori({ id: 'anak-2', slug: 'pakaian-wanita', parentId: 'induk', _count: { products: 3 } }),
      ]);

      const daftar = await service.daftarKategori();

      expect(daftar.find((k) => k.id === 'induk')!.jumlahProduk).toBe(8);
      expect(daftar.find((k) => k.id === 'anak-1')!.jumlahProduk).toBe(5);
    });

    it('menjumlahkan produk milik sendiri dengan produk anaknya', async () => {
      prisma.category.findMany.mockResolvedValue([
        kategori({ id: 'induk', _count: { products: 2 } }),
        kategori({ id: 'anak', parentId: 'induk', _count: { products: 3 } }),
      ]);

      expect((await service.daftarKategori()).find((k) => k.id === 'induk')!.jumlahProduk).toBe(5);
    });

    it('hanya mengambil kategori yang aktif', async () => {
      await service.daftarKategori();

      expect(prisma.category.findMany.mock.calls[0]![0].where).toEqual({ aktif: true });
    });

    it('hanya menghitung produk yang terbit', async () => {
      await service.daftarKategori();

      expect(prisma.category.findMany.mock.calls[0]![0].select._count.select.products.where).toEqual(
        { status: 'PUBLISHED' },
      );
    });
  });

  describe('beranda', () => {
    it('mengambil seluruh data home dalam satu panggilan', async () => {
      // Server Component Next.js cukup sekali fetch — mengurangi waterfall.
      prisma.product.count.mockResolvedValue(15);

      const hasil = await service.beranda();

      expect(Object.keys(hasil)).toEqual([
        'banner',
        'kategori',
        'produkUnggulan',
        'produkTerbaru',
        'totalProduk',
      ]);
      expect(hasil.totalProduk).toBe(15);
    });

    it('membatasi produk unggulan ke produk yang ditandai unggulan', async () => {
      await service.beranda();

      const where = prisma.product.findMany.mock.calls[0]![0].where;
      expect(where.unggulan).toBe(true);
      expect(where.status).toBe('PUBLISHED');
    });

    it('mengurutkan produk terbaru dari yang paling akhir terbit', async () => {
      await service.beranda();

      expect(prisma.product.findMany.mock.calls[1]![0].orderBy).toEqual({ publishedAt: 'desc' });
    });

    it('tidak membocorkan HPP di kartu produk beranda', async () => {
      prisma.product.findMany.mockResolvedValue([produk()]);

      const hasil = await service.beranda();

      expect(hasil.produkTerbaru[0]).not.toHaveProperty('hpp');
    });
  });
});
