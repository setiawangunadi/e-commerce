import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LABEL_STATUS } from '../order/admin-orders.service';
import { aturanTier, poinDariPesanan } from './loyalty.config';

/** Status yang poinnya sudah pasti tapi belum dicairkan — lihat LoyaltyService. */
const POIN_TERTUNDA = ['PAYMENT_SUCCESS', 'PROCESS_ORDER', 'ORDER_SEND'];

@Injectable()
export class CustomerOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Riwayat pesanan milik satu akun, terbaru dulu. */
  async daftar(customerId: string, params: { page: number; limit: number }) {
    const { page, limit } = params;

    const [pelanggan, items, total] = await Promise.all([
      this.prisma.customer.findUnique({ where: { id: customerId }, select: { tier: true } }),
      this.prisma.order.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          nomor: true,
          // Token ikut dikirim supaya tautan "lihat detail" mengarah ke halaman
          // status pesanan yang sudah ada, tanpa perlu endpoint detail kedua.
          token: true,
          status: true,
          statusPembayaran: true,
          subtotal: true,
          diskon: true,
          potonganPoin: true,
          ongkir: true,
          total: true,
          nomorResi: true,
          createdAt: true,
          items: {
            select: { namaProduk: true, namaVarian: true, jumlah: true, gambarUrl: true },
            orderBy: { id: 'asc' },
          },
          mutasiPoin: { where: { tipe: 'EARN' }, select: { jumlah: true } },
        },
      }),
      this.prisma.order.count({ where: { customerId } }),
    ]);

    const pengali = aturanTier(pelanggan?.tier ?? 'BRONZE').pengali;

    return {
      data: items.map((o) => {
        const poinDidapat = o.mutasiPoin.reduce((t, m) => t + m.jumlah, 0);

        return {
          nomor: o.nomor,
          token: o.token,
          status: o.status,
          statusLabel: LABEL_STATUS[o.status],
          statusPembayaran: o.statusPembayaran,
          subtotal: o.subtotal,
          diskon: o.diskon,
          potonganPoin: o.potonganPoin,
          ongkir: o.ongkir,
          total: o.total,
          nomorResi: o.nomorResi,
          jumlahBarang: o.items.reduce((t, i) => t + i.jumlah, 0),
          gambarUtama: o.items[0]?.gambarUrl ?? null,
          ringkasanBarang: o.items
            .map((i) => (i.namaVarian ? `${i.namaProduk} (${i.namaVarian})` : i.namaProduk))
            .join(', '),
          poinDidapat,
          // Perkiraan, bukan janji: pengali tier bisa berubah sebelum pesanan
          // sampai, jadi angka finalnya baru ditetapkan saat poin dikreditkan.
          poinTertunda:
            poinDidapat === 0 && POIN_TERTUNDA.includes(o.status)
              ? poinDariPesanan(o.subtotal - o.diskon - o.potonganPoin, pengali)
              : 0,
          createdAt: o.createdAt,
        };
      }),
      meta: { page, limit, total, totalHalaman: Math.max(1, Math.ceil(total / limit)) },
    };
  }
}
