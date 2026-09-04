import { Injectable, NotFoundException } from '@nestjs/common';
import { BannerService } from '../banner/banner.service';
import { PrismaService } from '../prisma/prisma.service';
import { productInclude, toProductCard, toPublicProduct } from './product.mapper';
import type { Prisma } from '../generated/prisma/client.ts';

/** Hanya produk berstatus PUBLISHED yang boleh terlihat publik. */
const HANYA_TERBIT: Prisma.ProductWhereInput = { status: 'PUBLISHED' };

/**
 * Kategori induk mewakili seluruh isi anaknya. Tanpa ini, membuka "Fashion"
 * akan tampil kosong karena produknya sebenarnya duduk di sub-kategori.
 */
function cocokKategori(slug: string): Prisma.ProductWhereInput {
  return { category: { OR: [{ slug }, { parent: { slug } }] } };
}

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly banner: BannerService,
  ) {}

  /**
   * Satu panggilan untuk seluruh data halaman home, supaya Server Component
   * Next.js cukup sekali fetch (mengurangi waterfall request).
   */
  async beranda() {
    const [banner, kategori, unggulan, terbaru, totalProduk] = await Promise.all([
      this.banner.yangTayang(),
      this.kategoriDenganHitungan(),
      this.prisma.product.findMany({
        where: { ...HANYA_TERBIT, unggulan: true },
        include: productInclude,
        orderBy: { publishedAt: 'desc' },
        take: 8,
      }),
      this.prisma.product.findMany({
        where: HANYA_TERBIT,
        include: productInclude,
        orderBy: { publishedAt: 'desc' },
        take: 8,
      }),
      this.prisma.product.count({ where: HANYA_TERBIT }),
    ]);

    return {
      banner,
      kategori,
      produkUnggulan: unggulan.map(toProductCard),
      produkTerbaru: terbaru.map(toProductCard),
      totalProduk,
    };
  }

  async daftarProduk(params: {
    page: number;
    limit: number;
    kategori?: string;
    merek?: string;
    q?: string;
  }) {
    const { page, limit, kategori, merek, q } = params;

    const where: Prisma.ProductWhereInput = {
      ...HANYA_TERBIT,
      ...(kategori ? cocokKategori(kategori) : {}),
      ...(merek ? { brand: { slug: merek } } : {}),
      ...(q
        ? {
            OR: [
              { nama: { contains: q, mode: 'insensitive' } },
              { deskripsiSingkat: { contains: q, mode: 'insensitive' } },
              { brand: { nama: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: productInclude,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: items.map(toProductCard),
      meta: { page, limit, total, totalHalaman: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async detailProduk(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, ...HANYA_TERBIT },
      include: productInclude,
    });
    if (!product) throw new NotFoundException('Produk tidak ditemukan');
    return toPublicProduct(product);
  }

  async daftarKategori() {
    return this.kategoriDenganHitungan();
  }

  /** Merek aktif beserta jumlah produk terbitnya, untuk penyaring etalase. */
  async daftarMerek() {
    const merek = await this.prisma.brand.findMany({
      where: { aktif: true },
      orderBy: [{ urutan: 'asc' }, { nama: 'asc' }],
      select: {
        id: true,
        nama: true,
        slug: true,
        deskripsi: true,
        logoUrl: true,
        _count: { select: { products: { where: HANYA_TERBIT } } },
      },
    });

    return merek.map((m) => ({
      id: m.id,
      nama: m.nama,
      slug: m.slug,
      deskripsi: m.deskripsi,
      logoUrl: m.logoUrl,
      jumlahProduk: m._count.products,
    }));
  }

  /**
   * Daftar kategori aktif beserta jumlah produk terbitnya, di mana kategori
   * induk ikut menghitung produk milik sub-kategorinya. Angka ini yang dipakai
   * etalase untuk memutuskan sebuah kategori layak ditampilkan atau tidak, jadi
   * induk yang produknya semua ada di anak tidak boleh terhitung nol.
   */
  private async kategoriDenganHitungan() {
    const kategori = await this.prisma.category.findMany({
      where: { aktif: true },
      orderBy: [{ urutan: 'asc' }, { nama: 'asc' }],
      select: {
        id: true,
        nama: true,
        slug: true,
        deskripsi: true,
        gambarUrl: true,
        parentId: true,
        parent: { select: { id: true, nama: true, slug: true } },
        _count: { select: { products: { where: HANYA_TERBIT } } },
      },
    });

    const milikSendiri = new Map(kategori.map((k) => [k.id, k._count.products]));

    return kategori.map((k) => {
      const anak = kategori
        .filter((a) => a.parentId === k.id)
        .reduce((total, a) => total + (milikSendiri.get(a.id) ?? 0), 0);

      return {
        id: k.id,
        nama: k.nama,
        slug: k.slug,
        deskripsi: k.deskripsi,
        gambarUrl: k.gambarUrl,
        induk: k.parent,
        jumlahProduk: k._count.products + anak,
      };
    });
  }
}
