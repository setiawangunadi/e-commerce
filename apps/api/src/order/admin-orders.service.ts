import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoyaltyService } from '../customer/loyalty.service';
import type { OrderStatus } from '../generated/prisma/enums.ts';
import type { Prisma } from '../generated/prisma/client.ts';

/**
 * Perpindahan status yang diizinkan.
 *
 * Alur pesanan hanya boleh maju, tidak boleh melompat atau mundur — supaya
 * status yang dilihat pembeli selalu mencerminkan keadaan sebenarnya. Pesanan
 * yang sudah selesai atau batal tidak bisa diubah lagi.
 */
const TRANSISI: Record<OrderStatus, OrderStatus[]> = {
  // Pelunasan datang dari webhook Midtrans, bukan dari admin. Yang bisa
  // dilakukan admin di sini hanya membatalkan.
  WAITING_PAYMENT: ['ORDER_CANCELLED'],
  PAYMENT_SUCCESS: ['PROCESS_ORDER', 'ORDER_CANCELLED'],
  PROCESS_ORDER: ['ORDER_SEND', 'ORDER_CANCELLED'],
  ORDER_SEND: ['ORDER_RECEIPT'],
  ORDER_RECEIPT: [],
  ORDER_CANCELLED: [],
  PAYMENT_EXPIRED: [],
};

export const LABEL_STATUS: Record<OrderStatus, string> = {
  WAITING_PAYMENT: 'Menunggu Pembayaran',
  PAYMENT_SUCCESS: 'Sudah Dibayar',
  PROCESS_ORDER: 'Sedang Dikemas',
  ORDER_SEND: 'Dalam Pengiriman',
  ORDER_RECEIPT: 'Diterima Pembeli',
  ORDER_CANCELLED: 'Dibatalkan',
  PAYMENT_EXPIRED: 'Kedaluwarsa',
};

const orderInclude = { items: true } satisfies Prisma.OrderInclude;

@Injectable()
export class AdminOrdersService {
  private readonly logger = new Logger(AdminOrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly loyalty: LoyaltyService,
  ) {}

  async daftar(params: { page: number; limit: number; status?: OrderStatus; q?: string }) {
    const { page, limit, status, q } = params;

    const where: Prisma.OrderWhereInput = {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { nomor: { contains: q, mode: 'insensitive' } },
              { namaPembeli: { contains: q, mode: 'insensitive' } },
              { emailPembeli: { contains: q, mode: 'insensitive' } },
              { teleponPembeli: { contains: q, mode: 'insensitive' } },
              { nomorResi: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total, jumlahPerStatus] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { items: { select: { namaProduk: true, jumlah: true } } },
      }),
      this.prisma.order.count({ where }),
      // Dihitung tanpa filter status, supaya angka di tab tidak ikut menyusut
      // saat salah satu tab sedang dipilih.
      this.prisma.order.groupBy({
        by: ['status'],
        _count: { _all: true },
        where: q ? { OR: where.OR } : undefined,
      }),
    ]);

    const hitungan = Object.fromEntries(
      Object.keys(TRANSISI).map((s) => [s, 0]),
    ) as Record<OrderStatus, number>;
    for (const baris of jumlahPerStatus) {
      hitungan[baris.status] = baris._count._all;
    }

    return {
      data: items.map((o) => ({
        id: o.id,
        nomor: o.nomor,
        status: o.status,
        statusLabel: LABEL_STATUS[o.status],
        statusPembayaran: o.statusPembayaran,
        metodePembayaran: o.metodePembayaran,
        namaPembeli: o.namaPembeli,
        teleponPembeli: o.teleponPembeli,
        kota: o.kota,
        provinsi: o.provinsi,
        kurir: `${o.kurir} ${o.layananKurir}`,
        nomorResi: o.nomorResi,
        jumlahBarang: o.items.reduce((t, i) => t + i.jumlah, 0),
        ringkasanBarang: o.items
          .map((i) => `${i.jumlah}× ${i.namaProduk}`)
          .join(', ')
          .slice(0, 120),
        total: o.total,
        createdAt: o.createdAt,
        dibayarPada: o.dibayarPada,
      })),
      meta: {
        page,
        limit,
        total,
        totalHalaman: Math.max(1, Math.ceil(total / limit)),
        jumlahPerStatus: hitungan,
      },
    };
  }

  async detail(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: orderInclude });
    if (!order) throw new NotFoundException('Pesanan tidak ditemukan');

    return {
      id: order.id,
      nomor: order.nomor,
      status: order.status,
      statusLabel: LABEL_STATUS[order.status],
      poinDipakai: order.poinDipakai,
      potonganPoin: order.potonganPoin,
      statusBerikutnya: TRANSISI[order.status].map((s) => ({ status: s, label: LABEL_STATUS[s] })),
      statusPembayaran: order.statusPembayaran,
      metodePembayaran: order.metodePembayaran,
      pembeli: {
        nama: order.namaPembeli,
        email: order.emailPembeli,
        telepon: order.teleponPembeli,
      },
      alamat: {
        lengkap: order.alamatLengkap,
        provinsi: order.provinsi,
        kota: order.kota,
        kecamatan: order.kecamatan,
        kodePos: order.kodePos,
        catatan: order.catatanAlamat,
      },
      pengiriman: {
        kurir: order.kurir,
        layanan: order.layananKurir,
        nama: order.namaLayanan,
        estimasi: order.estimasiTiba,
        beratTotal: order.beratTotal,
        nomorResi: order.nomorResi,
        penyedia: order.penyediaOngkir,
      },
      atribusi: {
        utmSource: order.utmSource,
        utmMedium: order.utmMedium,
        utmCampaign: order.utmCampaign,
        utmContent: order.utmContent,
        landingSlug: order.landingSlug,
      },
      items: order.items.map((i) => ({
        namaProduk: i.namaProduk,
        namaVarian: i.namaVarian,
        sku: i.sku,
        gambarUrl: i.gambarUrl,
        harga: i.harga,
        jumlah: i.jumlah,
        subtotal: i.subtotal,
      })),
      subtotal: order.subtotal,
      ongkir: order.ongkir,
      diskon: order.diskon,
      total: order.total,
      kedaluwarsaPada: order.kedaluwarsaPada,
      dibayarPada: order.dibayarPada,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  /**
   * Memindahkan pesanan ke status berikutnya.
   *
   * Pembatalan pesanan yang sudah lunas mengembalikan stok — stok dikurangi
   * saat pembayaran berhasil, jadi kalau pesanannya batal, barang itu harus
   * kembali tersedia untuk pembeli lain.
   */
  async ubahStatus(id: string, tujuan: OrderStatus, nomorResi?: string | null) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        nomor: true,
        status: true,
        statusPembayaran: true,
        stokSudahDikurangi: true,
      },
    });
    if (!order) throw new NotFoundException('Pesanan tidak ditemukan');

    const boleh = TRANSISI[order.status];
    if (!boleh.includes(tujuan)) {
      throw new BadRequestException(
        boleh.length === 0
          ? `Pesanan berstatus "${LABEL_STATUS[order.status]}" sudah final dan tidak bisa diubah lagi.`
          : `Dari "${LABEL_STATUS[order.status]}" hanya bisa pindah ke ${boleh
              .map((s) => `"${LABEL_STATUS[s]}"`)
              .join(' atau ')}.`,
      );
    }

    // Resi wajib saat menyerahkan ke kurir: tanpa itu pembeli tidak punya cara
    // melacak, dan ini pertanyaan nomor satu ke customer service.
    const resi = nomorResi?.trim() || null;
    if (tujuan === 'ORDER_SEND' && !resi) {
      throw new BadRequestException('Nomor resi wajib diisi saat pesanan dikirim');
    }

    const perluKembalikanStok = tujuan === 'ORDER_CANCELLED' && order.stokSudahDikurangi;

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: {
          status: tujuan,
          ...(resi ? { nomorResi: resi } : {}),
          ...(perluKembalikanStok ? { stokSudahDikurangi: false } : {}),
        },
      });

      // Poin baru dicairkan setelah barang sampai. Menunggu sampai titik ini
      // membuat pembatalan tidak pernah perlu menarik poin yang mungkin sudah
      // dibelanjakan pembeli.
      if (tujuan === 'ORDER_RECEIPT') {
        const poin = await this.loyalty.kreditkanDariPesanan(tx, id);
        if (poin > 0) this.logger.log(`Pesanan ${order.nomor}: ${poin} poin dikreditkan`);
      }

      // Sebaliknya, poin yang sudah terpakai dikembalikan saat pesanan batal —
      // pembeli tidak boleh kehilangan poin untuk barang yang tidak diterima.
      if (tujuan === 'ORDER_CANCELLED') {
        await this.loyalty.kembalikan(tx, id);
      }

      if (!perluKembalikanStok) return;

      const items = await tx.orderItem.findMany({ where: { orderId: id } });
      for (const item of items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stok: { increment: item.jumlah } },
          });
        } else if (item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stok: { increment: item.jumlah } },
          });
        }
      }
      this.logger.log(`Pesanan ${order.nomor} dibatalkan — stok ${items.length} item dikembalikan`);
    });

    this.logger.log(`Pesanan ${order.nomor}: ${order.status} -> ${tujuan}`);
    return this.detail(id);
  }

  /** Memperbarui nomor resi tanpa mengubah status. */
  async ubahResi(id: string, nomorResi: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!order) throw new NotFoundException('Pesanan tidak ditemukan');

    if (order.status !== 'ORDER_SEND' && order.status !== 'ORDER_RECEIPT') {
      throw new BadRequestException('Nomor resi hanya bisa diisi setelah pesanan dikirim');
    }

    await this.prisma.order.update({ where: { id }, data: { nomorResi: nomorResi.trim() } });
    return this.detail(id);
  }

  /** Angka penjualan untuk dashboard. */
  async ringkasanPenjualan() {
    const awalHariIni = new Date();
    awalHariIni.setHours(0, 0, 0, 0);

    const [perluDiproses, sedangDikirim, hariIni, omzet, totalSelesai] = await Promise.all([
      this.prisma.order.count({ where: { status: 'PAYMENT_SUCCESS' } }),
      this.prisma.order.count({ where: { status: 'ORDER_SEND' } }),
      this.prisma.order.count({ where: { createdAt: { gte: awalHariIni } } }),
      // Omzet dihitung hanya dari pesanan yang benar-benar lunas.
      this.prisma.order.aggregate({
        _sum: { total: true },
        _count: { _all: true },
        where: { statusPembayaran: 'LUNAS' },
      }),
      this.prisma.order.count({ where: { status: 'ORDER_RECEIPT' } }),
    ]);

    const jumlahLunas = omzet._count._all;
    const totalOmzet = omzet._sum.total ?? 0;

    return {
      perluDiproses,
      sedangDikirim,
      pesananHariIni: hariIni,
      pesananSelesai: totalSelesai,
      jumlahPesananLunas: jumlahLunas,
      omzet: totalOmzet,
      // AOV — nilai rata-rata per pesanan (research/business/12-analytics-kpi.md).
      nilaiRataRata: jumlahLunas > 0 ? Math.round(totalOmzet / jumlahLunas) : 0,
    };
  }
}
