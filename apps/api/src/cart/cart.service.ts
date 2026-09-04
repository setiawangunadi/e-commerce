import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '../generated/prisma/client.ts';

const MAKS_JUMLAH_PER_ITEM = 99;

const cartInclude = {
  items: {
    orderBy: { createdAt: 'asc' },
    include: {
      product: {
        include: { images: { orderBy: { urutan: 'asc' }, take: 1 } },
      },
      variant: true,
    },
  },
} satisfies Prisma.CartInclude;

type CartLengkap = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

export interface ItemKeranjang {
  id: string;
  produkId: string;
  /** Dipakai voucher yang cakupannya dibatasi per kategori. */
  kategoriId: string | null;
  varianId: string | null;
  slug: string;
  nama: string;
  namaVarian: string | null;
  sku: string;
  gambarUrl: string | null;
  harga: number;
  jumlah: number;
  subtotal: number;
  berat: number;
  /** Stok yang tersedia untuk baris ini saat keranjang dibaca. */
  stokTersedia: number;
  /** true bila produk sudah tidak terbit atau varian dinonaktifkan. */
  tidakTersedia: boolean;
  /** true bila jumlah di keranjang melebihi stok yang ada sekarang. */
  melebihiStok: boolean;
}

export interface RingkasanKeranjang {
  id: string;
  items: ItemKeranjang[];
  jumlahItem: number;
  subtotal: number;
  beratTotal: number;
  /** true bila ada baris bermasalah — checkout harus diblokir sampai dibereskan. */
  adaMasalah: boolean;
}

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  static buatToken(): string {
    return randomBytes(24).toString('base64url');
  }

  /** Mengambil keranjang berdasarkan token, membuatnya bila belum ada. */
  async ambilAtauBuat(token: string): Promise<RingkasanKeranjang> {
    let cart = await this.prisma.cart.findUnique({ where: { token }, include: cartInclude });

    if (!cart) {
      cart = await this.prisma.cart.create({ data: { token }, include: cartInclude });
    }

    return this.rangkum(cart);
  }

  async tambah(
    token: string,
    dto: { produkId: string; varianId?: string | null; jumlah: number },
  ): Promise<RingkasanKeranjang> {
    const { produk, varian, stok } = await this.validasiTarget(dto.produkId, dto.varianId);

    const cart = await this.prisma.cart.upsert({
      where: { token },
      update: {},
      create: { token },
      select: { id: true },
    });

    const varianId = varian?.id ?? null;
    // `findFirst`, bukan `findUnique`: Prisma tidak menerima `null` pada kolom
    // unik gabungan, padahal produk tanpa varian memang ber-variantId null.
    const sudahAda = await this.prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId: produk.id, variantId: varianId },
      select: { id: true, jumlah: true },
    });

    const jumlahBaru = (sudahAda?.jumlah ?? 0) + dto.jumlah;

    if (jumlahBaru > stok) {
      throw new BadRequestException(
        stok === 0
          ? 'Stok produk ini sudah habis'
          : `Stok tersisa ${stok}. Di keranjang Anda sudah ada ${sudahAda?.jumlah ?? 0}.`,
      );
    }
    if (jumlahBaru > MAKS_JUMLAH_PER_ITEM) {
      throw new BadRequestException(`Maksimal ${MAKS_JUMLAH_PER_ITEM} buah per produk`);
    }

    if (sudahAda) {
      await this.prisma.cartItem.update({ where: { id: sudahAda.id }, data: { jumlah: jumlahBaru } });
    } else {
      await this.prisma.cartItem.create({
        data: { cartId: cart.id, productId: produk.id, variantId: varianId, jumlah: dto.jumlah },
      });
    }

    return this.ambilAtauBuat(token);
  }

  async ubahJumlah(token: string, itemId: string, jumlah: number): Promise<RingkasanKeranjang> {
    const item = await this.itemMilikKeranjang(token, itemId);

    if (jumlah <= 0) return this.hapus(token, itemId);

    const { stok } = await this.validasiTarget(item.productId, item.variantId);
    if (jumlah > stok) {
      throw new BadRequestException(`Stok tersisa hanya ${stok}`);
    }
    if (jumlah > MAKS_JUMLAH_PER_ITEM) {
      throw new BadRequestException(`Maksimal ${MAKS_JUMLAH_PER_ITEM} buah per produk`);
    }

    await this.prisma.cartItem.update({ where: { id: itemId }, data: { jumlah } });
    return this.ambilAtauBuat(token);
  }

  async hapus(token: string, itemId: string): Promise<RingkasanKeranjang> {
    await this.itemMilikKeranjang(token, itemId);
    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.ambilAtauBuat(token);
  }

  async kosongkan(token: string): Promise<RingkasanKeranjang> {
    const cart = await this.prisma.cart.findUnique({ where: { token }, select: { id: true } });
    if (cart) await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return this.ambilAtauBuat(token);
  }

  // -------------------------------------------------------------------------

  /**
   * Menyusun ringkasan dari data mentah, sekaligus menandai baris bermasalah.
   *
   * Baris bermasalah sengaja tidak dihapus otomatis — pembeli berhak tahu apa
   * yang berubah sejak terakhir kali ia menambahkannya
   * (research/business/03-cart-checkout.md).
   */
  private rangkum(cart: CartLengkap): RingkasanKeranjang {
    const items: ItemKeranjang[] = cart.items.map((item) => {
      const produkTerbit = item.product.status === 'PUBLISHED';
      const varianAktif = item.variant ? item.variant.aktif : true;
      const stok = item.variant ? item.variant.stok : item.product.stok;
      const harga = item.variant?.harga ?? item.product.harga;

      return {
        id: item.id,
        produkId: item.productId,
        kategoriId: item.product.categoryId,
        varianId: item.variantId,
        slug: item.product.slug,
        nama: item.product.nama,
        namaVarian: item.variant?.nama ?? null,
        sku: item.variant?.sku ?? item.product.sku,
        gambarUrl: item.product.images[0]?.url ?? null,
        harga,
        jumlah: item.jumlah,
        subtotal: harga * item.jumlah,
        berat: item.product.berat,
        stokTersedia: stok,
        tidakTersedia: !produkTerbit || !varianAktif,
        melebihiStok: item.jumlah > stok,
      };
    });

    const bisaDihitung = items.filter((i) => !i.tidakTersedia);

    return {
      id: cart.id,
      items,
      jumlahItem: items.reduce((t, i) => t + i.jumlah, 0),
      subtotal: bisaDihitung.reduce((t, i) => t + i.subtotal, 0),
      beratTotal: bisaDihitung.reduce((t, i) => t + i.berat * i.jumlah, 0),
      adaMasalah: items.some((i) => i.tidakTersedia || i.melebihiStok),
    };
  }

  private async validasiTarget(produkId: string, varianId?: string | null) {
    const produk = await this.prisma.product.findUnique({
      where: { id: produkId },
      include: { variants: true },
    });

    if (!produk || produk.status !== 'PUBLISHED') {
      throw new NotFoundException('Produk tidak tersedia');
    }

    const punyaVarian = produk.variants.some((v) => v.aktif);

    if (punyaVarian && !varianId) {
      throw new BadRequestException('Pilih varian terlebih dahulu');
    }

    let varian = null;
    if (varianId) {
      varian = produk.variants.find((v) => v.id === varianId) ?? null;
      if (!varian || !varian.aktif) {
        throw new BadRequestException('Varian tidak tersedia');
      }
    }

    return { produk, varian, stok: varian ? varian.stok : produk.stok };
  }

  private async itemMilikKeranjang(token: string, itemId: string) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: { select: { token: true } } },
    });

    // Pengecekan kepemilikan: tanpa ini siapa pun yang menebak id item bisa
    // mengubah keranjang orang lain.
    if (!item || item.cart.token !== token) {
      throw new NotFoundException('Item tidak ada di keranjang Anda');
    }
    return item;
  }
}
