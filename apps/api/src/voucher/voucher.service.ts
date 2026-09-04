import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buatSlug } from '../common/slug';
import type { CreateVoucherDto, UpdateVoucherDto } from './dto/voucher.dto';
import type { Prisma } from '../generated/prisma/client.ts';

/** Baris keranjang yang dibutuhkan untuk menghitung potongan. */
export interface ItemUntukVoucher {
  produkId: string;
  kategoriId: string | null;
  subtotal: number;
}

export interface HasilVoucher {
  kode: string;
  deskripsi: string | null;
  /** Nilai potongan dalam Rupiah. */
  potongan: number;
  /** Subtotal yang dikenai voucher (bisa lebih kecil dari subtotal keranjang). */
  subtotalBerlaku: number;
}

const voucherInclude = {
  produk: { select: { productId: true } },
  kategori: { select: { categoryId: true } },
} satisfies Prisma.VoucherInclude;

@Injectable()
export class VoucherService {
  private readonly logger = new Logger(VoucherService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Memeriksa voucher dan menghitung potongannya.
   *
   * Dipanggil dua kali: sekali untuk pratinjau di checkout, sekali lagi saat
   * pesanan dibuat. Nilai potongan tidak pernah diterima dari client —
   * client hanya mengirim kodenya.
   */
  async hitungPotongan(kode: string, items: ItemUntukVoucher[]): Promise<HasilVoucher> {
    const bersih = kode.trim().toUpperCase();
    if (!bersih) throw new BadRequestException('Kode voucher kosong');

    const voucher = await this.prisma.voucher.findUnique({
      where: { kode: bersih },
      include: voucherInclude,
    });

    // Pesan sengaja sama untuk kode tidak ada dan kode nonaktif, supaya
    // orang tidak bisa menebak-nebak kode yang valid tapi sedang dimatikan.
    if (!voucher || !voucher.aktif) {
      throw new BadRequestException('Kode voucher tidak berlaku');
    }

    const sekarang = new Date();
    if (voucher.mulai && sekarang < voucher.mulai) {
      throw new BadRequestException('Voucher ini belum bisa dipakai');
    }
    if (voucher.selesai && sekarang > voucher.selesai) {
      throw new BadRequestException('Masa berlaku voucher ini sudah lewat');
    }
    if (voucher.kuota !== null && voucher.terpakai >= voucher.kuota) {
      throw new BadRequestException('Kuota voucher ini sudah habis');
    }

    // Cakupan: kosong = berlaku untuk semua isi keranjang.
    const produkTerbatas = new Set(voucher.produk.map((p) => p.productId));
    const kategoriTerbatas = await this.perluasKeAnak(
      voucher.kategori.map((k) => k.categoryId),
    );
    const adaBatasan = produkTerbatas.size > 0 || kategoriTerbatas.size > 0;

    const itemBerlaku = adaBatasan
      ? items.filter(
          (i) =>
            produkTerbatas.has(i.produkId) ||
            (i.kategoriId !== null && kategoriTerbatas.has(i.kategoriId)),
        )
      : items;

    if (itemBerlaku.length === 0) {
      throw new BadRequestException(
        'Voucher ini tidak berlaku untuk produk yang ada di keranjang Anda',
      );
    }

    const subtotalBerlaku = itemBerlaku.reduce((t, i) => t + i.subtotal, 0);

    // Minimal belanja diukur dari subtotal yang dikenai voucher, bukan seluruh
    // keranjang — kalau tidak, voucher khusus satu produk bisa "dibuka" dengan
    // menambah barang lain yang tidak termasuk cakupannya.
    if (subtotalBerlaku < voucher.minBelanja) {
      throw new BadRequestException(
        `Minimal belanja untuk voucher ini Rp${voucher.minBelanja.toLocaleString('id-ID')}`,
      );
    }

    let potongan =
      voucher.tipe === 'PERSEN'
        ? Math.floor((subtotalBerlaku * voucher.nilai) / 100)
        : voucher.nilai;

    if (voucher.tipe === 'PERSEN' && voucher.maksPotongan !== null) {
      potongan = Math.min(potongan, voucher.maksPotongan);
    }

    // Potongan tidak boleh melebihi nilai barang — pembeli tidak pernah
    // "ditagih minus", dan ongkir tetap harus dibayar.
    potongan = Math.min(potongan, subtotalBerlaku);

    return {
      kode: voucher.kode,
      deskripsi: voucher.deskripsi,
      potongan,
      subtotalBerlaku,
    };
  }

  /**
   * Kategori induk mewakili sub-kategorinya. Voucher yang dipasang ke
   * "Fashion" harus ikut berlaku untuk produk di "Pakaian Pria" — kalau tidak,
   * admin yang memilih induk akan mengira voucher aktif padahal tidak pernah
   * kena satu produk pun.
   */
  private async perluasKeAnak(kategoriIds: string[]): Promise<Set<string>> {
    if (kategoriIds.length === 0) return new Set();

    const anak = await this.prisma.category.findMany({
      where: { parentId: { in: kategoriIds } },
      select: { id: true },
    });

    return new Set([...kategoriIds, ...anak.map((a) => a.id)]);
  }

  /**
   * Menaikkan hitungan pemakaian setelah pesanan benar-benar dibuat.
   *
   * Dipanggil di dalam transaksi pembuatan pesanan, dengan pengecekan kuota
   * sekali lagi supaya dua pembeli yang menekan bayar bersamaan tidak sama-sama
   * lolos pada kuota terakhir.
   */
  async pakai(tx: Prisma.TransactionClient, kode: string): Promise<void> {
    const voucher = await tx.voucher.findUnique({
      where: { kode },
      select: { id: true, kuota: true, terpakai: true },
    });
    if (!voucher) return;

    if (voucher.kuota !== null && voucher.terpakai >= voucher.kuota) {
      throw new BadRequestException('Kuota voucher ini baru saja habis');
    }

    await tx.voucher.update({
      where: { id: voucher.id },
      data: { terpakai: { increment: 1 } },
    });
  }

  // --- Admin ----------------------------------------------------------------

  async daftar() {
    const semua = await this.prisma.voucher.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { produk: true, kategori: true } } },
    });

    const sekarang = new Date();
    return semua.map((v) => ({
      id: v.id,
      kode: v.kode,
      deskripsi: v.deskripsi,
      tipe: v.tipe,
      nilai: v.nilai,
      maksPotongan: v.maksPotongan,
      minBelanja: v.minBelanja,
      kuota: v.kuota,
      terpakai: v.terpakai,
      mulai: v.mulai,
      selesai: v.selesai,
      aktif: v.aktif,
      cakupan:
        v._count.produk + v._count.kategori === 0
          ? 'Semua produk'
          : `${v._count.produk} produk, ${v._count.kategori} kategori`,
      keadaan: this.keadaan(v, sekarang),
    }));
  }

  async detail(id: string) {
    const v = await this.prisma.voucher.findUnique({ where: { id }, include: voucherInclude });
    if (!v) throw new NotFoundException('Voucher tidak ditemukan');

    return {
      id: v.id,
      kode: v.kode,
      deskripsi: v.deskripsi,
      tipe: v.tipe,
      nilai: v.nilai,
      maksPotongan: v.maksPotongan,
      minBelanja: v.minBelanja,
      kuota: v.kuota,
      terpakai: v.terpakai,
      mulai: v.mulai,
      selesai: v.selesai,
      aktif: v.aktif,
      produkIds: v.produk.map((p) => p.productId),
      kategoriIds: v.kategori.map((k) => k.categoryId),
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    };
  }

  async buat(dto: CreateVoucherDto) {
    const kode = this.normalkanKode(dto.kode);
    this.validasiNilai(dto);

    const bentrok = await this.prisma.voucher.findUnique({ where: { kode }, select: { id: true } });
    if (bentrok) throw new BadRequestException(`Kode "${kode}" sudah dipakai voucher lain`);

    const jadwal = this.validasiJadwal(dto.mulai, dto.selesai);

    const v = await this.prisma.voucher.create({
      data: {
        kode,
        deskripsi: dto.deskripsi ?? null,
        tipe: dto.tipe,
        nilai: dto.nilai,
        maksPotongan: dto.tipe === 'PERSEN' ? (dto.maksPotongan ?? null) : null,
        minBelanja: dto.minBelanja ?? 0,
        kuota: dto.kuota ?? null,
        aktif: dto.aktif ?? true,
        ...jadwal,
        produk: dto.produkIds?.length
          ? { create: dto.produkIds.map((productId) => ({ productId })) }
          : undefined,
        kategori: dto.kategoriIds?.length
          ? { create: dto.kategoriIds.map((categoryId) => ({ categoryId })) }
          : undefined,
      },
    });

    this.logger.log(`Voucher ${v.kode} dibuat`);
    return this.detail(v.id);
  }

  async perbarui(id: string, dto: UpdateVoucherDto) {
    const ada = await this.prisma.voucher.findUnique({
      where: { id },
      select: { id: true, kode: true, tipe: true, mulai: true, selesai: true },
    });
    if (!ada) throw new NotFoundException('Voucher tidak ditemukan');

    const kode = dto.kode ? this.normalkanKode(dto.kode) : undefined;
    if (kode && kode !== ada.kode) {
      const bentrok = await this.prisma.voucher.findFirst({
        where: { kode, NOT: { id } },
        select: { id: true },
      });
      if (bentrok) throw new BadRequestException(`Kode "${kode}" sudah dipakai voucher lain`);
    }

    const tipe = dto.tipe ?? ada.tipe;
    if (dto.nilai !== undefined || dto.tipe !== undefined) {
      this.validasiNilai({ tipe, nilai: dto.nilai ?? 0, maksPotongan: dto.maksPotongan });
    }

    const jadwal = this.validasiJadwal(
      dto.mulai === undefined ? (ada.mulai?.toISOString() ?? null) : dto.mulai,
      dto.selesai === undefined ? (ada.selesai?.toISOString() ?? null) : dto.selesai,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.voucher.update({
        where: { id },
        data: {
          ...(kode ? { kode } : {}),
          ...(dto.deskripsi !== undefined ? { deskripsi: dto.deskripsi } : {}),
          ...(dto.tipe !== undefined ? { tipe: dto.tipe } : {}),
          ...(dto.nilai !== undefined ? { nilai: dto.nilai } : {}),
          ...(dto.maksPotongan !== undefined
            ? { maksPotongan: tipe === 'PERSEN' ? dto.maksPotongan : null }
            : {}),
          ...(dto.minBelanja !== undefined ? { minBelanja: dto.minBelanja } : {}),
          ...(dto.kuota !== undefined ? { kuota: dto.kuota } : {}),
          ...(dto.aktif !== undefined ? { aktif: dto.aktif } : {}),
          ...(dto.mulai !== undefined || dto.selesai !== undefined ? jadwal : {}),
        },
      });

      // Cakupan dikirim sebagai daftar utuh dari form admin.
      if (dto.produkIds) {
        await tx.voucherProduct.deleteMany({ where: { voucherId: id } });
        if (dto.produkIds.length) {
          await tx.voucherProduct.createMany({
            data: dto.produkIds.map((productId) => ({ voucherId: id, productId })),
          });
        }
      }
      if (dto.kategoriIds) {
        await tx.voucherCategory.deleteMany({ where: { voucherId: id } });
        if (dto.kategoriIds.length) {
          await tx.voucherCategory.createMany({
            data: dto.kategoriIds.map((categoryId) => ({ voucherId: id, categoryId })),
          });
        }
      }
    });

    return this.detail(id);
  }

  async hapus(id: string) {
    const ada = await this.prisma.voucher.findUnique({ where: { id }, select: { id: true } });
    if (!ada) throw new NotFoundException('Voucher tidak ditemukan');
    await this.prisma.voucher.delete({ where: { id } });
    return { id, dihapus: true };
  }

  // -------------------------------------------------------------------------

  private normalkanKode(kode: string): string {
    const bersih = kode.trim().toUpperCase().replace(/\s+/g, '');
    if (!/^[A-Z0-9-]{3,32}$/.test(bersih)) {
      throw new BadRequestException(
        'Kode voucher hanya boleh huruf, angka, dan tanda hubung (3–32 karakter)',
      );
    }
    return bersih;
  }

  private validasiNilai(dto: {
    tipe: 'PERSEN' | 'NOMINAL';
    nilai: number;
    maksPotongan?: number | null;
  }): void {
    if (dto.tipe === 'PERSEN') {
      if (dto.nilai < 1 || dto.nilai > 100) {
        throw new BadRequestException('Diskon persen harus antara 1 dan 100');
      }
      if (dto.maksPotongan != null && dto.maksPotongan < 1) {
        throw new BadRequestException('Batas maksimal potongan tidak valid');
      }
    } else if (dto.nilai < 1) {
      throw new BadRequestException('Nominal potongan harus lebih dari 0');
    }
  }

  private validasiJadwal(mulai?: string | null, selesai?: string | null) {
    const m = mulai ? new Date(mulai) : null;
    const s = selesai ? new Date(selesai) : null;
    if (m && s && s <= m) {
      throw new BadRequestException('Tanggal selesai harus setelah tanggal mulai');
    }
    return { mulai: m, selesai: s };
  }

  /** Penjelasan singkat kenapa voucher sedang bisa/tidak bisa dipakai. */
  private keadaan(
    v: { aktif: boolean; mulai: Date | null; selesai: Date | null; kuota: number | null; terpakai: number },
    sekarang: Date,
  ): string {
    if (!v.aktif) return 'Nonaktif';
    if (v.mulai && sekarang < v.mulai) return 'Terjadwal';
    if (v.selesai && sekarang > v.selesai) return 'Kedaluwarsa';
    if (v.kuota !== null && v.terpakai >= v.kuota) return 'Kuota habis';
    return 'Aktif';
  }
}
