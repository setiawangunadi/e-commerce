import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { AdminCategoriesService } from '../../src/admin/admin-categories.service';
import type { PrismaService } from '../../src/prisma/prisma.service';
import { buatPrismaPalsu, type PrismaPalsu } from '../bantuan/prisma-palsu';

describe('AdminCategoriesService', () => {
  let prisma: PrismaPalsu;
  let service: AdminCategoriesService;

  beforeEach(() => {
    prisma = buatPrismaPalsu();
    service = new AdminCategoriesService(prisma as unknown as PrismaService);
    prisma.category.create.mockResolvedValue({ id: 'kategori-1' });
    prisma.category.update.mockResolvedValue({ id: 'kategori-1' });
  });

  describe('buat', () => {
    it('membuat slug dari nama kategori', async () => {
      await service.buat({ nama: 'Tas & Dompet' });

      expect(prisma.category.create.mock.calls[0]![0].data.slug).toBe('tas-dompet');
    });

    it('menolak slug yang sudah dipakai', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'kategori-lain' });

      await expect(service.buat({ nama: 'Tas & Dompet' })).rejects.toThrow(/sudah ada/i);
    });

    it('menolak kategori induk yang tidak ada', async () => {
      prisma.category.findUnique.mockImplementation(async (args: Record<string, never>) =>
        (args.where as Record<string, unknown>).id ? null : null,
      );

      await expect(
        service.buat({ nama: 'Pakaian Pria', parentId: 'hantu' }),
      ).rejects.toThrow(/induk tidak ditemukan/i);
    });

    it('MEMBATASI struktur kategori jadi dua tingkat', async () => {
      // Rantai kategori lebih dalam tidak bisa dirender rapi di navigasi
      // maupun remah roti.
      prisma.category.findUnique.mockImplementation(async (args: Record<string, never>) =>
        (args.where as Record<string, unknown>).id
          ? { id: 'induk', parentId: 'kakek' }
          : null,
      );

      await expect(
        service.buat({ nama: 'Kemeja Pria', parentId: 'induk' }),
      ).rejects.toThrow(/dua tingkat/i);
    });

    it('menerima sub-kategori di bawah induk tingkat pertama', async () => {
      prisma.category.findUnique.mockImplementation(async (args: Record<string, never>) =>
        (args.where as Record<string, unknown>).id ? { id: 'induk', parentId: null } : null,
      );

      await expect(
        service.buat({ nama: 'Pakaian Pria', parentId: 'induk' }),
      ).resolves.toBeDefined();
    });
  });

  describe('perbarui', () => {
    beforeEach(() => {
      prisma.category.findUnique.mockResolvedValue({ id: 'kategori-1', slug: 'fashion' });
    });

    it('menolak kategori yang tidak ada', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.perbarui('hantu', { nama: 'X' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('menolak kategori yang dijadikan induk dirinya sendiri', async () => {
      await expect(
        service.perbarui('kategori-1', { parentId: 'kategori-1' }),
      ).rejects.toThrow(/induk dirinya sendiri/i);
    });

    it('menolak kategori yang sudah punya anak dijadikan sub-kategori lain', async () => {
      // Itu akan menghasilkan tingkat ketiga lewat pintu belakang.
      prisma.category.findUnique.mockImplementation(async (args: Record<string, never>) => {
        const where = args.where as Record<string, unknown>;
        if (where.id === 'kategori-1') return { id: 'kategori-1', slug: 'fashion' };
        return { id: 'induk-lain', parentId: null };
      });
      prisma.category.count.mockResolvedValue(3);

      await expect(
        service.perbarui('kategori-1', { parentId: 'induk-lain' }),
      ).rejects.toThrow(/sudah punya sub-kategori/i);
    });

    it('menolak slug yang bentrok dengan kategori lain', async () => {
      prisma.category.findFirst.mockResolvedValue({ id: 'kategori-lain' });

      await expect(
        service.perbarui('kategori-1', { slug: 'pakaian-pria' }),
      ).rejects.toThrow(/sudah dipakai/i);
    });

    it('tidak memeriksa bentrok bila slugnya tidak berubah', async () => {
      await service.perbarui('kategori-1', { slug: 'Fashion' });

      expect(prisma.category.findFirst).not.toHaveBeenCalled();
    });

    it('mengizinkan kategori dilepas dari induknya', async () => {
      await service.perbarui('kategori-1', { parentId: null });

      expect(prisma.category.update.mock.calls[0]![0].data.parentId).toBeNull();
    });
  });

  describe('hapus', () => {
    it('menolak kategori yang masih punya sub-kategori', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'kategori-1',
        _count: { anak: 2, products: 0 },
      });

      await expect(service.hapus('kategori-1')).rejects.toThrow(/sub-kategorinya dulu/i);
    });

    it('menghapus kategori kosong dan melaporkan berapa produk yang terdampak', async () => {
      // Produknya tidak ikut terhapus — relasinya di-set null oleh skema.
      prisma.category.findUnique.mockResolvedValue({
        id: 'kategori-1',
        _count: { anak: 0, products: 7 },
      });

      await expect(service.hapus('kategori-1')).resolves.toEqual({
        id: 'kategori-1',
        dihapus: true,
        produkTerpengaruh: 7,
      });
    });

    it('menolak kategori yang tidak ada', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.hapus('hantu')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('daftar', () => {
    it('menyertakan jumlah produk dan sub-kategori', async () => {
      prisma.category.findMany.mockResolvedValue([
        {
          id: 'k1',
          nama: 'Fashion',
          slug: 'fashion',
          deskripsi: null,
          gambarUrl: null,
          urutan: 0,
          aktif: true,
          parentId: null,
          parent: null,
          _count: { products: 3, anak: 2 },
        },
      ]);

      const [kategori] = await service.daftar();

      expect(kategori!.jumlahProduk).toBe(3);
      expect(kategori!.jumlahAnak).toBe(2);
    });
  });

  it('melempar BadRequestException untuk seluruh galat aturan struktur', async () => {
    prisma.category.findUnique.mockResolvedValue({ id: 'lain' });

    await expect(service.buat({ nama: 'X' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
