import { Injectable } from '@nestjs/common';
import { AdminOrdersService } from '../order/admin-orders.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pesanan: AdminOrdersService,
  ) {}

  /** Ringkasan katalog & penjualan untuk dashboard admin. */
  async ringkasan() {
    const [totalProduk, terbit, draft, arsip, totalKategori, produkStokHabis, stokMenipis, terbaru] =
      await Promise.all([
        this.prisma.product.count(),
        this.prisma.product.count({ where: { status: 'PUBLISHED' } }),
        this.prisma.product.count({ where: { status: 'DRAFT' } }),
        this.prisma.product.count({ where: { status: 'ARCHIVED' } }),
        this.prisma.category.count({ where: { aktif: true } }),
        this.prisma.product.count({ where: { status: 'PUBLISHED', stok: 0, variants: { none: {} } } }),
        this.prisma.product.findMany({
          where: { status: 'PUBLISHED', variants: { none: {} }, stok: { lte: 5, gt: 0 } },
          select: { id: true, nama: true, sku: true, stok: true, stokMinimum: true },
          orderBy: { stok: 'asc' },
          take: 5,
        }),
        this.prisma.product.findMany({
          select: {
            id: true,
            nama: true,
            sku: true,
            harga: true,
            status: true,
            updatedAt: true,
            images: { select: { url: true }, orderBy: { urutan: 'asc' }, take: 1 },
          },
          orderBy: { updatedAt: 'desc' },
          take: 5,
        }),
      ]);

    // Nilai persediaan berdasarkan HPP — indikator modal yang tertahan di stok.
    const produkDenganHpp = await this.prisma.product.findMany({
      where: { hpp: { not: null } },
      select: { hpp: true, stok: true, variants: { select: { stok: true, aktif: true } } },
    });
    const nilaiPersediaan = produkDenganHpp.reduce((total, p) => {
      const varianAktif = p.variants.filter((v) => v.aktif);
      const stok = varianAktif.length ? varianAktif.reduce((s, v) => s + v.stok, 0) : p.stok;
      return total + (p.hpp ?? 0) * stok;
    }, 0);

    const penjualan = await this.pesanan.ringkasanPenjualan();

    return {
      penjualan,
      produk: { total: totalProduk, terbit, draft, arsip },
      totalKategori,
      produkStokHabis,
      nilaiPersediaan,
      stokMenipis,
      produkTerbaru: terbaru.map((p) => ({
        id: p.id,
        nama: p.nama,
        sku: p.sku,
        harga: p.harga,
        status: p.status,
        updatedAt: p.updatedAt,
        gambarUtama: p.images[0]?.url ?? null,
      })),
    };
  }
}
