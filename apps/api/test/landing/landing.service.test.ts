import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { LandingService } from '../../src/landing/landing.service';
import type { PrismaService } from '../../src/prisma/prisma.service';
import { buatPrismaPalsu, type PrismaPalsu } from '../bantuan/prisma-palsu';

function landing(ubah: Record<string, unknown> = {}) {
  return {
    id: 'landing-1',
    nama: 'Promo Kemeja',
    slug: 'promo-kemeja',
    status: 'PUBLISHED',
    judulMeta: null,
    deskripsiMeta: null,
    gambarOg: null,
    metaPixelId: null,
    ga4Id: null,
    googleAdsId: null,
    googleAdsLabel: null,
    gtmId: null,
    warnaAksen: '#c96442',
    mulaiTayang: null,
    selesaiTayang: null,
    blok: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...ubah,
  };
}

describe('LandingService.tayang (halaman publik)', () => {
  let prisma: PrismaPalsu;
  let service: LandingService;

  beforeEach(() => {
    prisma = buatPrismaPalsu();
    service = new LandingService(prisma as unknown as PrismaService);
  });

  it('hanya menayangkan halaman berstatus PUBLISHED yang sedang dalam jadwal', async () => {
    prisma.landingPage.findFirst.mockResolvedValue(landing());

    await service.tayang('promo-kemeja');

    const where = prisma.landingPage.findFirst.mock.calls[0]![0].where;
    expect(where.status).toBe('PUBLISHED');
    expect(where.AND).toHaveLength(2);
  });

  it('hanya menyertakan blok yang aktif', async () => {
    prisma.landingPage.findFirst.mockResolvedValue(landing());

    await service.tayang('promo-kemeja');

    expect(prisma.landingPage.findFirst.mock.calls[0]![0].include.blok.where).toEqual({
      aktif: true,
    });
  });

  it('menolak halaman yang tidak ada atau belum terbit', async () => {
    prisma.landingPage.findFirst.mockResolvedValue(null);

    await expect(service.tayang('tidak-ada')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('memuat produk blok PRODUK dalam satu query, tidak per blok', async () => {
    // Halaman iklan sangat sensitif terhadap kecepatan muat.
    prisma.landingPage.findFirst.mockResolvedValue(
      landing({
        blok: [
          { id: 'b1', tipe: 'PRODUK', konten: { produkIds: ['p1', 'p2'] } },
          { id: 'b2', tipe: 'PRODUK', konten: { produkIds: ['p2', 'p3'] } },
        ],
      }),
    );

    await service.tayang('promo-kemeja');

    expect(prisma.product.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.product.findMany.mock.calls[0]![0].where.id.in.sort()).toEqual([
      'p1',
      'p2',
      'p3',
    ]);
  });

  it('tidak menayangkan produk yang sudah tidak terbit walau masih terdaftar di blok', async () => {
    prisma.landingPage.findFirst.mockResolvedValue(
      landing({ blok: [{ id: 'b1', tipe: 'PRODUK', konten: { produkIds: ['p1'] } }] }),
    );

    await service.tayang('promo-kemeja');

    expect(prisma.product.findMany.mock.calls[0]![0].where.status).toBe('PUBLISHED');
  });

  it('tidak menyentuh tabel produk bila tidak ada blok produk', async () => {
    prisma.landingPage.findFirst.mockResolvedValue(
      landing({ blok: [{ id: 'b1', tipe: 'HERO', konten: { judul: 'X' } }] }),
    );

    await service.tayang('promo-kemeja');

    expect(prisma.product.findMany).not.toHaveBeenCalled();
  });

  it('mengirim produk terpisah dari blok supaya tidak terduplikasi', async () => {
    prisma.landingPage.findFirst.mockResolvedValue(
      landing({ blok: [{ id: 'b1', tipe: 'PRODUK', konten: { produkIds: ['p1'] } }] }),
    );

    const hasil = await service.tayang('promo-kemeja');

    expect(hasil).toHaveProperty('produk');
    expect(hasil.blok[0]).toEqual({ id: 'b1', tipe: 'PRODUK', konten: { produkIds: ['p1'] } });
  });

  it('mengirim ID pelacakan per kampanye', async () => {
    prisma.landingPage.findFirst.mockResolvedValue(
      landing({ metaPixelId: '123456789012345', ga4Id: 'G-ABCDEFGHIJ' }),
    );

    const hasil = await service.tayang('promo-kemeja');

    expect(hasil.tracking).toEqual({
      metaPixelId: '123456789012345',
      ga4Id: 'G-ABCDEFGHIJ',
      googleAdsId: null,
      googleAdsLabel: null,
      gtmId: null,
    });
  });
});

describe('LandingService — pengelolaan oleh admin', () => {
  let prisma: PrismaPalsu;
  let service: LandingService;

  beforeEach(() => {
    prisma = buatPrismaPalsu();
    service = new LandingService(prisma as unknown as PrismaService);
    prisma.landingPage.create.mockResolvedValue(landing());
    prisma.landingPage.findUnique.mockResolvedValue(landing());
  });

  describe('validasi blok', () => {
    it('menolak halaman yang salah satu bloknya tidak sah', async () => {
      await expect(
        service.buat({
          nama: 'Promo',
          blok: [{ tipe: 'HERO', konten: { judul: '' } }],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.landingPage.create).not.toHaveBeenCalled();
    });

    it('menyebut nomor dan jenis blok yang bermasalah', async () => {
      await expect(
        service.buat({
          nama: 'Promo',
          blok: [
            { tipe: 'TEKS', konten: { isi: 'Sah' } },
            { tipe: 'HERO', konten: { judul: '   ' } },
          ],
        }),
      ).rejects.toThrow(/Blok 2 \(HERO\)/);
    });

    it('menyimpan urutan blok sesuai posisinya di editor', async () => {
      await service.buat({
        nama: 'Promo',
        blok: [
          { tipe: 'TEKS', konten: { isi: 'Pertama' } },
          { tipe: 'TEKS', konten: { isi: 'Kedua' } },
        ],
      });

      const blok = prisma.landingPage.create.mock.calls[0]![0].data.blok.create;
      expect(blok.map((b: { urutan: number }) => b.urutan)).toEqual([0, 1]);
    });

    it('menyimpan konten blok versi yang sudah dinormalkan skema', async () => {
      // Kolom `konten` bertipe Json — skema Zod inilah satu-satunya yang
      // menentukan apa yang boleh masuk.
      await service.buat({
        nama: 'Promo',
        blok: [{ tipe: 'HERO', konten: { judul: '  Diskon  ', subjudul: '' } }],
      });

      const blok = prisma.landingPage.create.mock.calls[0]![0].data.blok.create[0];
      expect(blok.konten).toMatchObject({ judul: 'Diskon', subjudul: null });
    });

    it('mengganti seluruh blok saat halaman diperbarui', async () => {
      await service.perbarui('landing-1', { blok: [{ tipe: 'TEKS', konten: { isi: 'Baru' } }] });

      expect(prisma.landingBlock.deleteMany).toHaveBeenCalledWith({
        where: { landingPageId: 'landing-1' },
      });
    });

    it('tidak menyentuh blok bila kolomnya tidak dikirim', async () => {
      await service.perbarui('landing-1', { nama: 'Nama Baru' });

      expect(prisma.landingBlock.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('slug', () => {
    it('membuat slug dari nama kampanye', async () => {
      await service.buat({ nama: 'Promo Kemeja Agustus' });

      expect(prisma.landingPage.create.mock.calls[0]![0].data.slug).toBe(
        'promo-kemeja-agustus',
      );
    });

    it('menambahkan sufiks bila slugnya sudah dipakai', async () => {
      prisma.landingPage.findFirst
        .mockResolvedValueOnce({ id: 'lain' })
        .mockResolvedValueOnce(null);

      await service.buat({ nama: 'Promo Kemeja' });

      expect(prisma.landingPage.create.mock.calls[0]![0].data.slug).toBe('promo-kemeja-2');
    });

    it('jatuh ke slug cadangan bila namanya tidak menghasilkan karakter apa pun', async () => {
      await service.buat({ nama: '???' });

      expect(prisma.landingPage.create.mock.calls[0]![0].data.slug).toBe('kampanye');
    });
  });

  describe('ID pelacakan', () => {
    it('menyeragamkan ID Google ke huruf besar', async () => {
      // "g-abcdefghij" yang tertempel dari dokumen tidak boleh membuat GA4
      // diam-diam tidak mengirim apa pun.
      await service.buat({ nama: 'Promo', ga4Id: 'g-abcdefghij', googleAdsId: 'aw-123456789' });

      const data = prisma.landingPage.create.mock.calls[0]![0].data;
      expect(data.ga4Id).toBe('G-ABCDEFGHIJ');
      expect(data.googleAdsId).toBe('AW-123456789');
    });

    it('menyimpan ID kosong sebagai null, bukan string kosong', async () => {
      await service.buat({ nama: 'Promo', metaPixelId: '   ', ga4Id: '' });

      const data = prisma.landingPage.create.mock.calls[0]![0].data;
      expect(data.metaPixelId).toBeNull();
      expect(data.ga4Id).toBeNull();
    });

    it('tidak menyentuh kolom yang tidak dikirim sama sekali', async () => {
      await service.buat({ nama: 'Promo' });

      expect(prisma.landingPage.create.mock.calls[0]![0].data).not.toHaveProperty('metaPixelId');
    });
  });

  describe('jadwal tayang', () => {
    it('menolak tanggal selesai yang lebih dulu daripada mulai', async () => {
      await expect(
        service.buat({
          nama: 'Promo',
          mulaiTayang: '2026-09-01T00:00:00Z',
          selesaiTayang: '2026-08-01T00:00:00Z',
        }),
      ).rejects.toThrow(/setelah tanggal mulai/i);
    });

    it('memvalidasi jadwal terhadap gabungan nilai lama dan baru saat diperbarui', async () => {
      prisma.landingPage.findUnique.mockResolvedValue(
        landing({ mulaiTayang: new Date('2026-09-01T00:00:00Z') }),
      );

      await expect(
        service.perbarui('landing-1', { selesaiTayang: '2026-08-01T00:00:00Z' }),
      ).rejects.toThrow(/setelah tanggal mulai/i);
    });
  });

  describe('status', () => {
    it('menyimpan halaman baru sebagai draft secara bawaan', async () => {
      await service.buat({ nama: 'Promo' });

      expect(prisma.landingPage.create.mock.calls[0]![0].data.status).toBe('DRAFT');
    });
  });

  describe('hapus & detail', () => {
    it('menolak halaman yang tidak ada', async () => {
      prisma.landingPage.findUnique.mockResolvedValue(null);

      await expect(service.hapus('hantu')).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.detail('hantu')).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.perbarui('hantu', {})).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
