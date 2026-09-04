import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { LabelService } from '../../src/voucher/label.service';
import type { PrismaService } from '../../src/prisma/prisma.service';
import { buatPrismaPalsu, type PrismaPalsu } from '../bantuan/prisma-palsu';

const KEMARIN = new Date(Date.now() - 86_400_000);
const BESOK = new Date(Date.now() + 86_400_000);

describe('LabelService', () => {
  let prisma: PrismaPalsu;
  let service: LabelService;

  beforeEach(() => {
    prisma = buatPrismaPalsu();
    service = new LabelService(prisma as unknown as PrismaService);
    prisma.label.create.mockResolvedValue({ id: 'label-1' });
    prisma.label.update.mockResolvedValue({ id: 'label-1' });
  });

  describe('yangTayang', () => {
    it('hanya mengambil label aktif yang sedang berada dalam jadwalnya', async () => {
      await service.yangTayang();

      const where = prisma.label.findMany.mock.calls[0]![0].where;
      expect(where.aktif).toBe(true);
      expect(where.AND).toHaveLength(2);
    });

    it('tidak mengirim kolom jadwal ke etalase', async () => {
      await service.yangTayang();

      expect(Object.keys(prisma.label.findMany.mock.calls[0]![0].select)).toEqual([
        'id',
        'nama',
        'slug',
        'warna',
      ]);
    });
  });

  describe('daftarAdmin', () => {
    it('menjelaskan keadaan tiap label', async () => {
      prisma.label.findMany.mockResolvedValue([
        { id: '1', aktif: false, mulai: null, selesai: null, _count: { produk: 0 } },
        { id: '2', aktif: true, mulai: BESOK, selesai: null, _count: { produk: 0 } },
        { id: '3', aktif: true, mulai: null, selesai: KEMARIN, _count: { produk: 0 } },
        { id: '4', aktif: true, mulai: KEMARIN, selesai: BESOK, _count: { produk: 3 } },
      ]);

      const daftar = await service.daftarAdmin();

      expect(daftar.map((l) => l.keadaan)).toEqual([
        'Nonaktif',
        'Terjadwal',
        'Berakhir',
        'Tayang',
      ]);
      expect(daftar[3]!.jumlahProduk).toBe(3);
    });
  });

  describe('buat', () => {
    it('membuat slug dari nama label', async () => {
      await service.buat({ nama: 'Flash Sale' });

      expect(prisma.label.create.mock.calls[0]![0].data.slug).toBe('flash-sale');
    });

    it('menambahkan sufiks bila slugnya sudah dipakai', async () => {
      prisma.label.findFirst.mockResolvedValueOnce({ id: 'lain' }).mockResolvedValueOnce(null);

      await service.buat({ nama: 'Flash Sale' });

      expect(prisma.label.create.mock.calls[0]![0].data.slug).toBe('flash-sale-2');
    });

    it('memakai warna merek sebagai bawaan', async () => {
      await service.buat({ nama: 'Terlaris' });

      expect(prisma.label.create.mock.calls[0]![0].data.warna).toBe('#c96442');
    });

    it('menolak jadwal yang selesainya lebih dulu daripada mulainya', async () => {
      await expect(
        service.buat({
          nama: 'Flash Sale',
          mulai: '2026-09-01T00:00:00Z',
          selesai: '2026-08-01T00:00:00Z',
        }),
      ).rejects.toThrow(/setelah waktu mulai/i);
    });
  });

  describe('perbarui', () => {
    beforeEach(() => {
      prisma.label.findUnique.mockResolvedValue({
        id: 'label-1',
        slug: 'flash-sale',
        mulai: null,
        selesai: null,
      });
    });

    it('menolak label yang tidak ada', async () => {
      prisma.label.findUnique.mockResolvedValue(null);

      await expect(service.perbarui('hantu', { nama: 'X' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('tidak mengubah slug bila slugnya sama saja', async () => {
      await service.perbarui('label-1', { slug: 'Flash Sale' });

      expect(prisma.label.update.mock.calls[0]![0].data.slug).toBeUndefined();
    });

    it('memvalidasi jadwal terhadap gabungan nilai lama dan baru', async () => {
      prisma.label.findUnique.mockResolvedValue({
        id: 'label-1',
        slug: 'flash-sale',
        mulai: new Date('2026-09-01T00:00:00Z'),
        selesai: null,
      });

      await expect(
        service.perbarui('label-1', { selesai: '2026-08-01T00:00:00Z' }),
      ).rejects.toThrow(/setelah waktu mulai/i);
    });
  });

  describe('hapus', () => {
    it('menolak label yang tidak ada', async () => {
      prisma.label.findUnique.mockResolvedValue(null);

      await expect(service.hapus('hantu')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('menghapus label yang ada', async () => {
      prisma.label.findUnique.mockResolvedValue({ id: 'label-1' });

      await expect(service.hapus('label-1')).resolves.toEqual({ id: 'label-1', dihapus: true });
    });
  });
});
