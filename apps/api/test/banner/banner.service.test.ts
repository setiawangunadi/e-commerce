import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { BannerService } from '../../src/banner/banner.service';
import type { PrismaService } from '../../src/prisma/prisma.service';
import { buatPrismaPalsu, type PrismaPalsu } from '../bantuan/prisma-palsu';

describe('BannerService', () => {
  let prisma: PrismaPalsu;
  let service: BannerService;

  beforeEach(() => {
    prisma = buatPrismaPalsu();
    service = new BannerService(prisma as unknown as PrismaService);
    prisma.banner.create.mockResolvedValue({ id: 'banner-1' });
    prisma.banner.update.mockResolvedValue({ id: 'banner-1' });
  });

  describe('yangTayang', () => {
    it('hanya mengambil banner aktif yang sedang berada dalam jadwalnya', async () => {
      await service.yangTayang();

      const where = prisma.banner.findMany.mock.calls[0]![0].where;
      expect(where.aktif).toBe(true);
      expect(where.AND).toHaveLength(2);
    });

    it('menganggap jadwal kosong berarti tayang selamanya', async () => {
      await service.yangTayang();

      const [mulai, selesai] = prisma.banner.findMany.mock.calls[0]![0].where.AND;
      expect(mulai.OR).toContainEqual({ mulaiTayang: null });
      expect(selesai.OR).toContainEqual({ selesaiTayang: null });
    });

    it('tidak mengirim kolom internal ke etalase', async () => {
      await service.yangTayang();

      const select = prisma.banner.findMany.mock.calls[0]![0].select;
      expect(Object.keys(select)).not.toContain('aktif');
      expect(Object.keys(select)).not.toContain('mulaiTayang');
    });

    it('mengurutkan sesuai urutan yang ditentukan admin', async () => {
      await service.yangTayang();

      expect(prisma.banner.findMany.mock.calls[0]![0].orderBy).toEqual([
        { urutan: 'asc' },
        { createdAt: 'desc' },
      ]);
    });
  });

  describe('daftarAdmin', () => {
    it('menampilkan banner nonaktif dan di luar jadwal juga', async () => {
      await service.daftarAdmin();

      expect(prisma.banner.findMany.mock.calls[0]![0].where).toBeUndefined();
    });
  });

  describe('validasi jadwal', () => {
    it('menolak tanggal selesai yang lebih dulu daripada tanggal mulai', () => {
      expect(() =>
        service.buat({
          judul: 'Promo',
          gambarUrl: '/uploads/a.jpg',
          mulaiTayang: '2026-09-01T00:00:00Z',
          selesaiTayang: '2026-08-01T00:00:00Z',
        }),
      ).toThrow(/setelah tanggal mulai/i);
    });

    it('menolak periode tayang berdurasi nol', () => {
      expect(() =>
        service.buat({
          judul: 'Promo',
          gambarUrl: '/uploads/a.jpg',
          mulaiTayang: '2026-09-01T00:00:00Z',
          selesaiTayang: '2026-09-01T00:00:00Z',
        }),
      ).toThrow(/setelah tanggal mulai/i);
    });

    it('menerima banner tanpa jadwal sama sekali', () => {
      expect(() => service.buat({ judul: 'Promo', gambarUrl: '/uploads/a.jpg' })).not.toThrow();
    });

    it('memvalidasi jadwal terhadap gabungan nilai lama dan baru saat diperbarui', async () => {
      // Mengubah salah satu tanggal saja tetap harus menghasilkan rentang
      // yang masuk akal.
      prisma.banner.findUnique.mockResolvedValue({
        mulaiTayang: new Date('2026-09-01T00:00:00Z'),
        selesaiTayang: null,
      });

      await expect(
        service.perbarui('banner-1', { selesaiTayang: '2026-08-01T00:00:00Z' }),
      ).rejects.toThrow(/setelah tanggal mulai/i);
    });
  });

  describe('perbarui', () => {
    beforeEach(() => {
      prisma.banner.findUnique.mockResolvedValue({ mulaiTayang: null, selesaiTayang: null });
    });

    it('menolak banner yang tidak ada', async () => {
      prisma.banner.findUnique.mockResolvedValue(null);

      await expect(service.perbarui('hantu', { judul: 'X' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('hanya mengubah kolom yang benar-benar dikirim', async () => {
      await service.perbarui('banner-1', { judul: 'Judul Baru' });

      expect(prisma.banner.update.mock.calls[0]![0].data).toEqual({ judul: 'Judul Baru' });
    });

    it('mengizinkan banner dinonaktifkan tanpa dihapus', async () => {
      await service.perbarui('banner-1', { aktif: false });

      expect(prisma.banner.update.mock.calls[0]![0].data).toEqual({ aktif: false });
    });
  });

  describe('buat', () => {
    it('memakai nilai bawaan yang masuk akal', () => {
      service.buat({ judul: 'Promo', gambarUrl: '/uploads/a.jpg' });

      const data = prisma.banner.create.mock.calls[0]![0].data;
      expect(data.urutan).toBe(0);
      expect(data.aktif).toBe(true);
      expect(data.subjudul).toBeNull();
      expect(data.mulaiTayang).toBeNull();
    });
  });

  describe('hapus', () => {
    it('menolak banner yang tidak ada', async () => {
      prisma.banner.findUnique.mockResolvedValue(null);

      await expect(service.hapus('hantu')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('menghapus banner yang ada', async () => {
      prisma.banner.findUnique.mockResolvedValue({ id: 'banner-1' });

      await expect(service.hapus('banner-1')).resolves.toEqual({ id: 'banner-1', dihapus: true });
    });
  });
});
