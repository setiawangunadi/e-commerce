import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  MIN_POIN_JADI_VOUCHER,
  VOUCHER_POIN_BERLAKU_HARI,
  aturanTier,
  maksPoinUntuk,
  nilaiRupiah,
  poinDariPesanan,
  tierBerikutnya,
  tierUntuk,
} from './loyalty.config';
import type { Prisma } from '../generated/prisma/client.ts';
import type { CustomerTier, PointType } from '../generated/prisma/enums.ts';

/** Status pesanan yang poinnya sudah pasti tapi belum boleh dicairkan. */
const SEDANG_BERJALAN = ['PAYMENT_SUCCESS', 'PROCESS_ORDER', 'ORDER_SEND'] as const;

@Injectable()
export class LoyaltyService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Perolehan ------------------------------------------------------------

  /**
   * Mengkreditkan poin sebuah pesanan yang sudah sampai di tangan pembeli.
   *
   * Dipanggil saat status berubah jadi ORDER_RECEIPT. Menunggu sampai titik itu
   * — bukan saat pembayaran berhasil — membuat pembatalan dan refund tidak
   * pernah perlu menarik poin kembali dari saldo yang mungkin sudah dibelanjakan.
   *
   * Aman dipanggil berulang: kunci unik (orderId, tipe) di ledger yang menjadi
   * penjaganya, bukan pengecekan di aplikasi yang bisa kalah balapan.
   */
  async kreditkanDariPesanan(tx: Prisma.TransactionClient, orderId: string): Promise<number> {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        nomor: true,
        customerId: true,
        subtotal: true,
        diskon: true,
        potonganPoin: true,
      },
    });

    if (!order?.customerId) return 0; // pesanan tamu tidak menghasilkan poin

    const pelanggan = await tx.customer.findUnique({
      where: { id: order.customerId },
      select: { id: true, tier: true, poin: true },
    });
    if (!pelanggan) return 0;

    const nilaiBersih = order.subtotal - order.diskon - order.potonganPoin;
    const poin = poinDariPesanan(nilaiBersih, aturanTier(pelanggan.tier).pengali);
    if (poin <= 0) return 0;

    try {
      await tx.pointLedger.create({
        data: {
          customerId: pelanggan.id,
          tipe: 'EARN',
          jumlah: poin,
          saldoSesudah: pelanggan.poin + poin,
          orderId: order.id,
          keterangan: `Poin dari pesanan ${order.nomor}`,
        },
      });
    } catch (e) {
      // P2002 = pesanan ini sudah pernah menghasilkan poin. Bukan kesalahan:
      // sinkronisasi status Midtrans memang bisa berjalan berkali-kali.
      if (this.pelanggaranUnik(e)) return 0;
      throw e;
    }

    await tx.customer.update({
      where: { id: pelanggan.id },
      data: { poin: { increment: poin } },
    });

    await this.segarkanTier(tx, pelanggan.id);
    return poin;
  }

  /**
   * Menghitung ulang belanja 12 bulan terakhir lalu menyesuaikan tier.
   *
   * Memakai jendela bergulir, bukan total seumur hidup, supaya tier benar-benar
   * mencerminkan pelanggan yang masih aktif belanja.
   */
  async segarkanTier(tx: Prisma.TransactionClient, customerId: string): Promise<void> {
    const sejak = new Date();
    sejak.setFullYear(sejak.getFullYear() - 1);

    const hasil = await tx.order.aggregate({
      where: {
        customerId,
        status: { in: ['PAYMENT_SUCCESS', 'PROCESS_ORDER', 'ORDER_SEND', 'ORDER_RECEIPT'] },
        createdAt: { gte: sejak },
      },
      _sum: { subtotal: true, diskon: true, potonganPoin: true },
    });

    const belanja =
      (hasil._sum.subtotal ?? 0) - (hasil._sum.diskon ?? 0) - (hasil._sum.potonganPoin ?? 0);

    await tx.customer.update({
      where: { id: customerId },
      data: { belanja12Bulan: Math.max(0, belanja), tier: tierUntuk(belanja).tier },
    });
  }

  // --- Penukaran ------------------------------------------------------------

  /**
   * Memeriksa permintaan pemakaian poin dan mengembalikan potongan rupiahnya.
   *
   * Hanya menghitung — pengurangan saldonya terjadi di `pakai()` di dalam
   * transaksi pembuatan pesanan.
   */
  async hitungPotongan(
    customerId: string,
    poinDiminta: number,
    subtotalSetelahVoucher: number,
  ): Promise<{ poin: number; potongan: number }> {
    if (poinDiminta <= 0) return { poin: 0, potongan: 0 };

    const pelanggan = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { poin: true, aktif: true },
    });
    if (!pelanggan?.aktif) throw new BadRequestException('Akun tidak aktif');

    if (poinDiminta > pelanggan.poin) {
      throw new BadRequestException(
        `Saldo poin Anda hanya ${pelanggan.poin.toLocaleString('id-ID')}`,
      );
    }

    const maks = maksPoinUntuk(subtotalSetelahVoucher, pelanggan.poin);
    if (poinDiminta > maks) {
      throw new BadRequestException(
        `Maksimal ${maks.toLocaleString('id-ID')} poin untuk belanja sebesar ini`,
      );
    }

    return { poin: poinDiminta, potongan: nilaiRupiah(poinDiminta) };
  }

  /**
   * Mengurangi saldo di dalam transaksi pembuatan pesanan.
   *
   * Pengurangannya bersyarat (`poin: { gte: ... }`), jadi dua checkout yang
   * berjalan bersamaan tidak bisa sama-sama memakai poin yang sama — yang kalah
   * gagal di sini, bukan menghasilkan saldo minus.
   */
  async pakai(
    tx: Prisma.TransactionClient,
    customerId: string,
    poin: number,
    orderId: string,
    nomorPesanan: string,
  ): Promise<void> {
    if (poin <= 0) return;

    const terpakai = await tx.customer.updateMany({
      where: { id: customerId, poin: { gte: poin } },
      data: { poin: { decrement: poin } },
    });

    if (terpakai.count === 0) {
      throw new BadRequestException('Saldo poin tidak mencukupi. Muat ulang halaman lalu coba lagi.');
    }

    const sesudah = await tx.customer.findUnique({
      where: { id: customerId },
      select: { poin: true },
    });

    await tx.pointLedger.create({
      data: {
        customerId,
        tipe: 'REDEEM',
        jumlah: -poin,
        saldoSesudah: sesudah?.poin ?? 0,
        orderId,
        keterangan: `Dipakai di pesanan ${nomorPesanan}`,
      },
    });
  }

  /**
   * Mengembalikan poin yang sudah terpakai ketika pesanannya dibatalkan.
   *
   * Tanpa ini, pembeli kehilangan poin untuk barang yang tidak pernah diterima.
   */
  async kembalikan(tx: Prisma.TransactionClient, orderId: string): Promise<void> {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { id: true, nomor: true, customerId: true, poinDipakai: true },
    });
    if (!order?.customerId || order.poinDipakai <= 0) return;

    const sudah = await tx.pointLedger.findFirst({
      where: { orderId, tipe: 'REFUND' },
      select: { id: true },
    });
    if (sudah) return;

    const pelanggan = await tx.customer.update({
      where: { id: order.customerId },
      data: { poin: { increment: order.poinDipakai } },
      select: { poin: true },
    });

    await tx.pointLedger.create({
      data: {
        customerId: order.customerId,
        tipe: 'REFUND',
        jumlah: order.poinDipakai,
        saldoSesudah: pelanggan.poin,
        orderId,
        keterangan: `Poin dikembalikan karena pesanan ${order.nomor} dibatalkan`,
      },
    });
  }

  /**
   * Menukar poin jadi kode voucher.
   *
   * Vouchernya memakai mesin voucher yang sudah ada dan sudah teruji, jadi
   * pembeli bisa menyimpan atau menghadiahkannya, dan alur checkout tidak
   * perlu tahu asal-usulnya.
   */
  async tukarJadiVoucher(customerId: string, poin: number) {
    if (poin < MIN_POIN_JADI_VOUCHER) {
      throw new BadRequestException(
        `Minimal ${MIN_POIN_JADI_VOUCHER} poin untuk ditukar jadi voucher`,
      );
    }

    const nilai = nilaiRupiah(poin);

    return this.prisma.$transaction(async (tx) => {
      const terpakai = await tx.customer.updateMany({
        where: { id: customerId, aktif: true, poin: { gte: poin } },
        data: { poin: { decrement: poin } },
      });
      if (terpakai.count === 0) throw new BadRequestException('Saldo poin tidak mencukupi');

      const pelanggan = await tx.customer.findUniqueOrThrow({
        where: { id: customerId },
        select: { poin: true },
      });

      const kode = await this.kodeVoucherUnik(tx);
      const selesai = new Date();
      selesai.setDate(selesai.getDate() + VOUCHER_POIN_BERLAKU_HARI);

      await tx.voucher.create({
        data: {
          kode,
          deskripsi: `Voucher tukar poin senilai Rp${nilai.toLocaleString('id-ID')}`,
          tipe: 'NOMINAL',
          nilai,
          minBelanja: nilai, // voucher tidak boleh melebihi nilai belanjanya sendiri
          kuota: 1,
          selesai,
          aktif: true,
        },
      });

      await tx.pointLedger.create({
        data: {
          customerId,
          tipe: 'TO_VOUCHER',
          jumlah: -poin,
          saldoSesudah: pelanggan.poin,
          kodeVoucher: kode,
          keterangan: `Ditukar jadi voucher ${kode}`,
        },
      });

      return { kode, nilai, poin, berlakuSampai: selesai, saldoPoin: pelanggan.poin };
    });
  }

  // --- Bacaan ---------------------------------------------------------------

  /** Ringkasan loyalty untuk kartu di halaman akun. */
  async ringkasan(customerId: string) {
    const pelanggan = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { poin: true, tier: true, belanja12Bulan: true },
    });
    if (!pelanggan) throw new NotFoundException('Pelanggan tidak ditemukan');

    const tertunda = await this.poinTertunda(customerId, pelanggan.tier);
    const aturan = aturanTier(pelanggan.tier);
    const berikut = tierBerikutnya(pelanggan.belanja12Bulan);

    return {
      poin: pelanggan.poin,
      nilaiPoin: nilaiRupiah(pelanggan.poin),
      poinTertunda: tertunda,
      tier: aturan.tier,
      namaTier: aturan.nama,
      warnaTier: aturan.warna,
      pengaliPoin: aturan.pengali,
      belanja12Bulan: pelanggan.belanja12Bulan,
      tierBerikutnya: berikut
        ? { nama: berikut.tier.nama, kurang: berikut.kurang, pengali: berikut.tier.pengali }
        : null,
    };
  }

  /**
   * Poin dari pesanan yang sudah dibayar tapi belum sampai di tangan pembeli.
   *
   * Dihitung saat diminta, bukan disimpan: nilainya cuma untuk ditampilkan, dan
   * menyimpannya berarti satu lagi angka yang bisa melenceng dari ledger.
   */
  private async poinTertunda(customerId: string, tier: CustomerTier): Promise<number> {
    const pesanan = await this.prisma.order.findMany({
      where: { customerId, status: { in: [...SEDANG_BERJALAN] } },
      select: { subtotal: true, diskon: true, potonganPoin: true },
    });

    const pengali = aturanTier(tier).pengali;
    return pesanan.reduce(
      (total, o) => total + poinDariPesanan(o.subtotal - o.diskon - o.potonganPoin, pengali),
      0,
    );
  }

  /** Riwayat mutasi poin, terbaru dulu. */
  async mutasi(customerId: string, params: { page: number; limit: number }) {
    const { page, limit } = params;

    const [items, total] = await Promise.all([
      this.prisma.pointLedger.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
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
      this.prisma.pointLedger.count({ where: { customerId } }),
    ]);

    return {
      data: items.map((m) => ({
        id: m.id,
        tipe: m.tipe,
        jumlah: m.jumlah,
        saldoSesudah: m.saldoSesudah,
        keterangan: m.keterangan,
        kodeVoucher: m.kodeVoucher,
        nomorPesanan: m.order?.nomor ?? null,
        createdAt: m.createdAt,
      })),
      meta: { page, limit, total, totalHalaman: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  /** Penyesuaian manual oleh admin — alasannya wajib dan ikut tercatat. */
  async sesuaikan(customerId: string, jumlah: number, alasan: string, olehEmail: string) {
    if (jumlah === 0) throw new BadRequestException('Jumlah penyesuaian tidak boleh nol');
    if (!alasan.trim()) throw new BadRequestException('Alasan penyesuaian wajib diisi');

    return this.prisma.$transaction(async (tx) => {
      const ada = await tx.customer.findUnique({ where: { id: customerId }, select: { poin: true } });
      if (!ada) throw new NotFoundException('Pelanggan tidak ditemukan');

      if (jumlah < 0 && ada.poin + jumlah < 0) {
        throw new BadRequestException(
          `Saldo pelanggan hanya ${ada.poin.toLocaleString('id-ID')} poin`,
        );
      }

      const pelanggan = await tx.customer.update({
        where: { id: customerId },
        data: { poin: { increment: jumlah } },
        select: { poin: true },
      });

      await tx.pointLedger.create({
        data: {
          customerId,
          tipe: 'ADJUST' satisfies PointType,
          jumlah,
          saldoSesudah: pelanggan.poin,
          keterangan: `${alasan.trim()} — oleh ${olehEmail}`,
        },
      });

      return { poin: pelanggan.poin };
    });
  }

  // --- Pembantu -------------------------------------------------------------

  private pelanggaranUnik(e: unknown): boolean {
    return (
      typeof e === 'object' && e !== null && 'code' in e && (e as { code: unknown }).code === 'P2002'
    );
  }

  /** Kode acak yang tidak mudah ditebak — voucher ini bernilai uang. */
  private async kodeVoucherUnik(tx: Prisma.TransactionClient): Promise<string> {
    // Tanpa huruf/angka yang mudah tertukar saat dibacakan (0/O, 1/I).
    const HURUF = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    for (let percobaan = 0; percobaan < 10; percobaan++) {
      // randomInt, bukan Math.random: kode ini bernilai uang dan tidak boleh
      // bisa ditebak dari kode lain yang pernah terbit.
      const acak = Array.from({ length: 8 }, () => HURUF[randomInt(HURUF.length)]).join('');
      const kode = `POIN${acak}`;

      const bentrok = await tx.voucher.findUnique({ where: { kode }, select: { id: true } });
      if (!bentrok) return kode;
    }

    throw new BadRequestException('Gagal membuat kode voucher. Coba lagi.');
  }
}
