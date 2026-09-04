import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { aturanTier, tierBerikutnya } from '../customer/loyalty.config';
import { LABEL_STATUS } from '../order/admin-orders.service';
import type { Prisma } from '../generated/prisma/client.ts';
import type { CustomerTier } from '../generated/prisma/enums.ts';

/** Status pesanan yang dihitung sebagai belanja nyata, bukan keranjang terbengkalai. */
const BELANJA_NYATA = ['PAYMENT_SUCCESS', 'PROCESS_ORDER', 'ORDER_SEND', 'ORDER_RECEIPT'] as const;

@Injectable()
export class AdminCustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async daftar(params: {
    page: number;
    limit: number;
    q?: string;
    tier?: CustomerTier;
    aktif?: boolean;
  }) {
    const { page, limit, q, tier, aktif } = params;

    const where: Prisma.CustomerWhereInput = {
      ...(tier ? { tier } : {}),
      ...(aktif !== undefined ? { aktif } : {}),
      ...(q
        ? {
            OR: [
              { nama: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              { telepon: { contains: q } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          email: true,
          nama: true,
          telepon: true,
          aktif: true,
          poin: true,
          tier: true,
          belanja12Bulan: true,
          lastLoginAt: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data: items.map((c) => ({
        id: c.id,
        email: c.email,
        nama: c.nama,
        telepon: c.telepon,
        aktif: c.aktif,
        poin: c.poin,
        tier: c.tier,
        namaTier: aturanTier(c.tier).nama,
        warnaTier: aturanTier(c.tier).warna,
        belanja12Bulan: c.belanja12Bulan,
        jumlahPesanan: c._count.orders,
        lastLoginAt: c.lastLoginAt,
        createdAt: c.createdAt,
      })),
      meta: { page, limit, total, totalHalaman: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async detail(id: string) {
    const pelanggan = await this.prisma.customer.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        nama: true,
        telepon: true,
        aktif: true,
        poin: true,
        tier: true,
        belanja12Bulan: true,
        lastLoginAt: true,
        createdAt: true,
        alamat: {
          orderBy: [{ utama: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            label: true,
            namaPenerima: true,
            teleponPenerima: true,
            alamatLengkap: true,
            provinsi: true,
            kota: true,
            kecamatan: true,
            kodePos: true,
            utama: true,
          },
        },
      },
    });
    if (!pelanggan) throw new NotFoundException('Pelanggan tidak ditemukan');

    const [pesanan, agregat, mutasi] = await Promise.all([
      this.prisma.order.findMany({
        where: { customerId: id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          nomor: true,
          status: true,
          statusPembayaran: true,
          total: true,
          poinDipakai: true,
          createdAt: true,
        },
      }),
      this.prisma.order.aggregate({
        where: { customerId: id, status: { in: [...BELANJA_NYATA] } },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.pointLedger.findMany({
        where: { customerId: id },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: {
          id: true,
          tipe: true,
          jumlah: true,
          saldoSesudah: true,
          keterangan: true,
          kodeVoucher: true,
          createdAt: true,
          order: { select: { nomor: true } },
        },
      }),
    ]);

    const aturan = aturanTier(pelanggan.tier);
    const berikut = tierBerikutnya(pelanggan.belanja12Bulan);
    const belanjaTotal = agregat._sum.total ?? 0;
    const pesananSukses = agregat._count;

    return {
      ...pelanggan,
      namaTier: aturan.nama,
      warnaTier: aturan.warna,
      pengaliPoin: aturan.pengali,
      tierBerikutnya: berikut ? { nama: berikut.tier.nama, kurang: berikut.kurang } : null,
      belanjaTotal,
      pesananSukses,
      // Nilai pesanan rata-rata memberi konteks yang tidak bisa dibaca dari
      // total saja: pelanggan Rp5 juta dari 20 pesanan berbeda perlakuannya
      // dari pelanggan Rp5 juta dari satu pesanan.
      rataRataPesanan: pesananSukses > 0 ? Math.round(belanjaTotal / pesananSukses) : 0,
      pesanan: pesanan.map((o) => ({
        id: o.id,
        nomor: o.nomor,
        status: o.status,
        statusLabel: LABEL_STATUS[o.status],
        statusPembayaran: o.statusPembayaran,
        total: o.total,
        poinDipakai: o.poinDipakai,
        createdAt: o.createdAt,
      })),
      mutasiPoin: mutasi.map((m) => ({
        id: m.id,
        tipe: m.tipe,
        jumlah: m.jumlah,
        saldoSesudah: m.saldoSesudah,
        keterangan: m.keterangan,
        kodeVoucher: m.kodeVoucher,
        nomorPesanan: m.order?.nomor ?? null,
        createdAt: m.createdAt,
      })),
    };
  }

  /**
   * Menonaktifkan akun. Datanya sengaja tidak dihapus: pesanan yang sudah
   * terjadi harus tetap terbaca, dan penghapusan permanen akan memutus riwayat
   * yang dibutuhkan untuk pembukuan.
   */
  async ubahAktif(id: string, aktif: boolean) {
    const ada = await this.prisma.customer.findUnique({ where: { id }, select: { id: true } });
    if (!ada) throw new NotFoundException('Pelanggan tidak ditemukan');

    await this.prisma.customer.update({ where: { id }, data: { aktif } });
    return { id, aktif };
  }
}
