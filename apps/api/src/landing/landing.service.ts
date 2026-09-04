import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buatSlug } from '../common/slug';
import { productInclude, toProductCard } from '../catalog/product.mapper';
import { validasiKontenBlok, type JenisBlok } from './blok.skema';
import type { BlokDto, CreateLandingDto, UpdateLandingDto } from './dto/landing.dto';
import type { Prisma } from '../generated/prisma/client.ts';

const landingInclude = {
  blok: { orderBy: { urutan: 'asc' } },
} satisfies Prisma.LandingPageInclude;

type LandingLengkap = Prisma.LandingPageGetPayload<{ include: typeof landingInclude }>;

@Injectable()
export class LandingService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Publik ---------------------------------------------------------------

  /**
   * Landing page yang boleh dilihat publik: terbit dan berada dalam jadwal.
   *
   * Produk pada blok PRODUK ikut dimuat di sini supaya halaman kampanye cukup
   * sekali fetch — halaman iklan sangat sensitif terhadap kecepatan muat.
   */
  async tayang(slug: string) {
    const sekarang = new Date();

    const landing = await this.prisma.landingPage.findFirst({
      where: {
        slug,
        status: 'PUBLISHED',
        AND: [
          { OR: [{ mulaiTayang: null }, { mulaiTayang: { lte: sekarang } }] },
          { OR: [{ selesaiTayang: null }, { selesaiTayang: { gte: sekarang } }] },
        ],
      },
      include: { blok: { where: { aktif: true }, orderBy: { urutan: 'asc' } } },
    });

    if (!landing) throw new NotFoundException('Halaman tidak ditemukan');

    const produkIds = new Set<string>();
    for (const b of landing.blok) {
      if (b.tipe !== 'PRODUK') continue;
      const konten = b.konten as { produkIds?: string[] };
      for (const id of konten.produkIds ?? []) produkIds.add(id);
    }

    const produk = produkIds.size
      ? await this.prisma.product.findMany({
          where: { id: { in: [...produkIds] }, status: 'PUBLISHED' },
          include: productInclude,
        })
      : [];

    return {
      slug: landing.slug,
      nama: landing.nama,
      judulMeta: landing.judulMeta,
      deskripsiMeta: landing.deskripsiMeta,
      gambarOg: landing.gambarOg,
      warnaAksen: landing.warnaAksen,
      tracking: {
        metaPixelId: landing.metaPixelId,
        ga4Id: landing.ga4Id,
        googleAdsId: landing.googleAdsId,
        googleAdsLabel: landing.googleAdsLabel,
        gtmId: landing.gtmId,
      },
      blok: landing.blok.map((b) => ({ id: b.id, tipe: b.tipe, konten: b.konten })),
      // Dikirim terpisah agar blok tetap ramping dan produk tidak terduplikasi
      // bila dipakai di lebih dari satu blok.
      produk: produk.map(toProductCard),
    };
  }

  // --- Admin ----------------------------------------------------------------

  async daftar() {
    const semua = await this.prisma.landingPage.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { blok: true } } },
    });

    return semua.map((l) => ({
      id: l.id,
      nama: l.nama,
      slug: l.slug,
      status: l.status,
      jumlahBlok: l._count.blok,
      metaPixelId: l.metaPixelId,
      ga4Id: l.ga4Id,
      googleAdsId: l.googleAdsId,
      mulaiTayang: l.mulaiTayang,
      selesaiTayang: l.selesaiTayang,
      updatedAt: l.updatedAt,
    }));
  }

  async detail(id: string) {
    const landing = await this.prisma.landingPage.findUnique({
      where: { id },
      include: landingInclude,
    });
    if (!landing) throw new NotFoundException('Landing page tidak ditemukan');
    return this.bentuk(landing);
  }

  async buat(dto: CreateLandingDto) {
    const slug = await this.slugUnik(dto.slug?.trim() || dto.nama);
    const jadwal = this.validasiJadwal(dto.mulaiTayang, dto.selesaiTayang);
    const blok = this.siapkanBlok(dto.blok ?? []);

    const landing = await this.prisma.landingPage.create({
      data: {
        ...this.dataDasar(dto),
        nama: dto.nama,
        slug,
        status: dto.status ?? 'DRAFT',
        ...jadwal,
        blok: blok.length ? { create: blok } : undefined,
      },
      include: landingInclude,
    });

    return this.bentuk(landing);
  }

  async perbarui(id: string, dto: UpdateLandingDto) {
    const ada = await this.prisma.landingPage.findUnique({
      where: { id },
      select: { id: true, slug: true, mulaiTayang: true, selesaiTayang: true },
    });
    if (!ada) throw new NotFoundException('Landing page tidak ditemukan');

    const slug =
      dto.slug && buatSlug(dto.slug) !== ada.slug ? await this.slugUnik(dto.slug, id) : undefined;

    const mulai =
      dto.mulaiTayang === undefined ? (ada.mulaiTayang?.toISOString() ?? null) : dto.mulaiTayang;
    const selesai =
      dto.selesaiTayang === undefined
        ? (ada.selesaiTayang?.toISOString() ?? null)
        : dto.selesaiTayang;
    const jadwal = this.validasiJadwal(mulai, selesai);

    // Blok dikirim sebagai daftar utuh dari editor, jadi diganti seluruhnya
    // dalam satu transaksi agar tidak ada halaman setengah tersimpan.
    await this.prisma.$transaction(async (tx) => {
      await tx.landingPage.update({
        where: { id },
        data: {
          ...(dto.nama !== undefined ? { nama: dto.nama } : {}),
          ...(slug ? { slug } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...this.dataDasar(dto),
          ...(dto.mulaiTayang !== undefined || dto.selesaiTayang !== undefined ? jadwal : {}),
        },
      });

      if (dto.blok) {
        const blok = this.siapkanBlok(dto.blok);
        await tx.landingBlock.deleteMany({ where: { landingPageId: id } });
        if (blok.length) {
          await tx.landingBlock.createMany({
            data: blok.map((b) => ({ ...b, landingPageId: id })),
          });
        }
      }
    });

    return this.detail(id);
  }

  async hapus(id: string) {
    const ada = await this.prisma.landingPage.findUnique({ where: { id }, select: { id: true } });
    if (!ada) throw new NotFoundException('Landing page tidak ditemukan');
    await this.prisma.landingPage.delete({ where: { id } });
    return { id, dihapus: true };
  }

  // -------------------------------------------------------------------------

  /** Field opsional yang bentuknya seragam antara buat & perbarui. */
  private dataDasar(dto: CreateLandingDto | UpdateLandingDto) {
    const kosongkan = (v: string | null | undefined) =>
      v === undefined ? undefined : v === null || v.trim() === '' ? null : v.trim();

    return {
      ...(dto.judulMeta !== undefined ? { judulMeta: kosongkan(dto.judulMeta) } : {}),
      ...(dto.deskripsiMeta !== undefined ? { deskripsiMeta: kosongkan(dto.deskripsiMeta) } : {}),
      ...(dto.gambarOg !== undefined ? { gambarOg: kosongkan(dto.gambarOg) } : {}),
      ...(dto.metaPixelId !== undefined ? { metaPixelId: kosongkan(dto.metaPixelId) } : {}),
      ...(dto.ga4Id !== undefined ? { ga4Id: kosongkan(dto.ga4Id)?.toUpperCase() ?? null } : {}),
      ...(dto.googleAdsId !== undefined
        ? { googleAdsId: kosongkan(dto.googleAdsId)?.toUpperCase() ?? null }
        : {}),
      ...(dto.googleAdsLabel !== undefined
        ? { googleAdsLabel: kosongkan(dto.googleAdsLabel) }
        : {}),
      ...(dto.gtmId !== undefined ? { gtmId: kosongkan(dto.gtmId)?.toUpperCase() ?? null } : {}),
      ...(dto.warnaAksen !== undefined ? { warnaAksen: dto.warnaAksen } : {}),
    };
  }

  /** Memvalidasi isi tiap blok sesuai jenisnya sebelum menyentuh database. */
  private siapkanBlok(blok: BlokDto[]) {
    return blok.map((b, i) => {
      const hasil = validasiKontenBlok(b.tipe as JenisBlok, b.konten);
      if (!hasil.ok) {
        throw new BadRequestException(`Blok ${i + 1} (${b.tipe}) — ${hasil.pesan}`);
      }
      return {
        tipe: b.tipe,
        urutan: i,
        aktif: b.aktif ?? true,
        konten: hasil.data as Prisma.InputJsonValue,
      };
    });
  }

  private validasiJadwal(mulai?: string | null, selesai?: string | null) {
    const mulaiTayang = mulai ? new Date(mulai) : null;
    const selesaiTayang = selesai ? new Date(selesai) : null;

    if (mulaiTayang && selesaiTayang && selesaiTayang <= mulaiTayang) {
      throw new BadRequestException('Tanggal selesai tayang harus setelah tanggal mulai');
    }
    return { mulaiTayang, selesaiTayang };
  }

  private async slugUnik(sumber: string, kecualiId?: string): Promise<string> {
    const dasar = buatSlug(sumber) || 'kampanye';
    let kandidat = dasar;
    let n = 2;

    while (
      await this.prisma.landingPage.findFirst({
        where: { slug: kandidat, ...(kecualiId ? { NOT: { id: kecualiId } } : {}) },
        select: { id: true },
      })
    ) {
      kandidat = `${dasar}-${n++}`;
    }
    return kandidat;
  }

  private bentuk(landing: LandingLengkap) {
    return {
      id: landing.id,
      nama: landing.nama,
      slug: landing.slug,
      status: landing.status,
      judulMeta: landing.judulMeta,
      deskripsiMeta: landing.deskripsiMeta,
      gambarOg: landing.gambarOg,
      metaPixelId: landing.metaPixelId,
      ga4Id: landing.ga4Id,
      googleAdsId: landing.googleAdsId,
      googleAdsLabel: landing.googleAdsLabel,
      gtmId: landing.gtmId,
      warnaAksen: landing.warnaAksen,
      mulaiTayang: landing.mulaiTayang,
      selesaiTayang: landing.selesaiTayang,
      blok: landing.blok.map((b) => ({
        id: b.id,
        tipe: b.tipe,
        aktif: b.aktif,
        urutan: b.urutan,
        konten: b.konten,
      })),
      createdAt: landing.createdAt,
      updatedAt: landing.updatedAt,
    };
  }
}
