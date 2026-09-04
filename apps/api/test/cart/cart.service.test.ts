import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { CartService } from '../../src/cart/cart.service';
import type { PrismaService } from '../../src/prisma/prisma.service';
import { buatPrismaPalsu, type PrismaPalsu } from '../bantuan/prisma-palsu';

const TOKEN = 'token-keranjang';

function produk(ubah: Record<string, unknown> = {}) {
  return {
    id: 'produk-1',
    slug: 'kemeja-flanel',
    nama: 'Kemeja Flanel',
    sku: 'SKU-1',
    status: 'PUBLISHED',
    categoryId: 'kategori-1',
    harga: 100_000,
    berat: 400,
    stok: 10,
    images: [{ url: '/uploads/kemeja.jpg' }],
    variants: [],
    ...ubah,
  };
}

function barisKeranjang(ubah: Record<string, unknown> = {}) {
  return {
    id: 'item-1',
    productId: 'produk-1',
    variantId: null,
    jumlah: 2,
    product: produk(),
    variant: null,
    ...ubah,
  };
}

describe('CartService.buatToken', () => {
  it('membuat token acak yang aman disimpan di cookie', () => {
    const a = CartService.buatToken();
    const b = CartService.buatToken();

    expect(a).toMatch(/^[\w-]{32}$/);
    expect(a).not.toBe(b);
  });
});

describe('CartService — ringkasan keranjang', () => {
  let prisma: PrismaPalsu;
  let service: CartService;

  beforeEach(() => {
    prisma = buatPrismaPalsu();
    service = new CartService(prisma as unknown as PrismaService);
  });

  it('membuat keranjang baru bila tokennya belum dikenal', async () => {
    prisma.cart.findUnique.mockResolvedValue(null);
    prisma.cart.create.mockResolvedValue({ id: 'cart-1', items: [] });

    const hasil = await service.ambilAtauBuat(TOKEN);

    expect(prisma.cart.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { token: TOKEN } }),
    );
    expect(hasil.items).toEqual([]);
    expect(hasil.subtotal).toBe(0);
  });

  it('menghitung subtotal, jumlah item, dan berat total', async () => {
    prisma.cart.findUnique.mockResolvedValue({
      id: 'cart-1',
      items: [
        barisKeranjang(),
        barisKeranjang({ id: 'item-2', jumlah: 1, product: produk({ harga: 50_000, berat: 200 }) }),
      ],
    });

    const hasil = await service.ambilAtauBuat(TOKEN);

    expect(hasil.jumlahItem).toBe(3);
    expect(hasil.subtotal).toBe(250_000);
    expect(hasil.beratTotal).toBe(1_000); // 400×2 + 200×1
  });

  it('memakai harga dan SKU varian bila itemnya bervarian', async () => {
    prisma.cart.findUnique.mockResolvedValue({
      id: 'cart-1',
      items: [
        barisKeranjang({
          variantId: 'varian-1',
          variant: { id: 'varian-1', nama: 'L', sku: 'SKU-1-L', harga: 120_000, stok: 5, aktif: true },
        }),
      ],
    });

    const [item] = (await service.ambilAtauBuat(TOKEN)).items;

    expect(item!.harga).toBe(120_000);
    expect(item!.sku).toBe('SKU-1-L');
    expect(item!.namaVarian).toBe('L');
    expect(item!.subtotal).toBe(240_000);
  });

  it('jatuh ke harga produk bila varian tidak punya harga sendiri', async () => {
    prisma.cart.findUnique.mockResolvedValue({
      id: 'cart-1',
      items: [
        barisKeranjang({
          variantId: 'varian-1',
          variant: { id: 'varian-1', nama: 'L', sku: 'SKU-L', harga: null, stok: 5, aktif: true },
        }),
      ],
    });

    expect((await service.ambilAtauBuat(TOKEN)).items[0]!.harga).toBe(100_000);
  });

  it('menandai item yang produknya sudah tidak terbit', async () => {
    prisma.cart.findUnique.mockResolvedValue({
      id: 'cart-1',
      items: [barisKeranjang({ product: produk({ status: 'ARCHIVED' }) })],
    });

    const hasil = await service.ambilAtauBuat(TOKEN);

    expect(hasil.items[0]!.tidakTersedia).toBe(true);
    expect(hasil.adaMasalah).toBe(true);
  });

  it('menandai item yang variannya dinonaktifkan', async () => {
    prisma.cart.findUnique.mockResolvedValue({
      id: 'cart-1',
      items: [
        barisKeranjang({
          variantId: 'varian-1',
          variant: { id: 'varian-1', nama: 'L', sku: 'S', harga: null, stok: 5, aktif: false },
        }),
      ],
    });

    expect((await service.ambilAtauBuat(TOKEN)).items[0]!.tidakTersedia).toBe(true);
  });

  it('menandai item yang jumlahnya sudah melebihi stok sekarang', async () => {
    prisma.cart.findUnique.mockResolvedValue({
      id: 'cart-1',
      items: [barisKeranjang({ jumlah: 20, product: produk({ stok: 3 }) })],
    });

    const hasil = await service.ambilAtauBuat(TOKEN);

    expect(hasil.items[0]!.melebihiStok).toBe(true);
    expect(hasil.items[0]!.stokTersedia).toBe(3);
    expect(hasil.adaMasalah).toBe(true);
  });

  it('tidak menghapus item bermasalah secara diam-diam — pembeli berhak tahu apa yang berubah', async () => {
    prisma.cart.findUnique.mockResolvedValue({
      id: 'cart-1',
      items: [barisKeranjang({ product: produk({ status: 'ARCHIVED' }) })],
    });

    expect((await service.ambilAtauBuat(TOKEN)).items).toHaveLength(1);
    expect(prisma.cartItem.delete).not.toHaveBeenCalled();
  });

  it('mengeluarkan item yang tidak tersedia dari subtotal dan berat', async () => {
    prisma.cart.findUnique.mockResolvedValue({
      id: 'cart-1',
      items: [
        barisKeranjang(),
        barisKeranjang({ id: 'item-2', product: produk({ status: 'DRAFT' }) }),
      ],
    });

    const hasil = await service.ambilAtauBuat(TOKEN);

    expect(hasil.subtotal).toBe(200_000);
    expect(hasil.beratTotal).toBe(800);
  });

  it('menyertakan kategori untuk keperluan voucher bercakupan kategori', async () => {
    prisma.cart.findUnique.mockResolvedValue({ id: 'cart-1', items: [barisKeranjang()] });

    expect((await service.ambilAtauBuat(TOKEN)).items[0]!.kategoriId).toBe('kategori-1');
  });
});

describe('CartService.tambah', () => {
  let prisma: PrismaPalsu;
  let service: CartService;

  beforeEach(() => {
    prisma = buatPrismaPalsu();
    service = new CartService(prisma as unknown as PrismaService);
    prisma.product.findUnique.mockResolvedValue(produk());
    prisma.cart.upsert.mockResolvedValue({ id: 'cart-1' });
    prisma.cart.findUnique.mockResolvedValue({ id: 'cart-1', items: [] });
  });

  it('menolak produk yang tidak ada', async () => {
    prisma.product.findUnique.mockResolvedValue(null);

    await expect(
      service.tambah(TOKEN, { produkId: 'hantu', jumlah: 1 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('menolak produk yang belum terbit — draft tidak boleh bisa dibeli lewat API', async () => {
    prisma.product.findUnique.mockResolvedValue(produk({ status: 'DRAFT' }));

    await expect(
      service.tambah(TOKEN, { produkId: 'produk-1', jumlah: 1 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('menuntut pilihan varian untuk produk bervarian', async () => {
    // Stok dan SKU melekat pada varian, jadi produk induknya tidak bisa dibeli.
    prisma.product.findUnique.mockResolvedValue(
      produk({ variants: [{ id: 'v1', aktif: true, stok: 5, harga: null }] }),
    );

    await expect(service.tambah(TOKEN, { produkId: 'produk-1', jumlah: 1 })).rejects.toThrow(
      /pilih varian/i,
    );
  });

  it('menolak varian yang tidak ada atau sudah dinonaktifkan', async () => {
    prisma.product.findUnique.mockResolvedValue(
      produk({ variants: [{ id: 'v1', aktif: false, stok: 5, harga: null }] }),
    );

    await expect(
      service.tambah(TOKEN, { produkId: 'produk-1', varianId: 'v1', jumlah: 1 }),
    ).rejects.toThrow(/varian tidak tersedia/i);
    await expect(
      service.tambah(TOKEN, { produkId: 'produk-1', varianId: 'entah', jumlah: 1 }),
    ).rejects.toThrow(/varian tidak tersedia/i);
  });

  it('menolak jumlah yang melebihi stok', async () => {
    prisma.product.findUnique.mockResolvedValue(produk({ stok: 3 }));

    await expect(service.tambah(TOKEN, { produkId: 'produk-1', jumlah: 5 })).rejects.toThrow(
      /stok tersisa 3/i,
    );
  });

  it('memberi pesan berbeda saat stoknya memang sudah habis', async () => {
    prisma.product.findUnique.mockResolvedValue(produk({ stok: 0 }));

    await expect(service.tambah(TOKEN, { produkId: 'produk-1', jumlah: 1 })).rejects.toThrow(
      /sudah habis/i,
    );
  });

  it('menjumlahkan dengan yang sudah ada di keranjang saat memeriksa stok', async () => {
    // Menambah 3 lagi padahal 8 sudah di keranjang dan stok hanya 10.
    prisma.product.findUnique.mockResolvedValue(produk({ stok: 10 }));
    prisma.cartItem.findFirst.mockResolvedValue({ id: 'item-1', jumlah: 8 });

    await expect(service.tambah(TOKEN, { produkId: 'produk-1', jumlah: 3 })).rejects.toThrow(
      /sudah ada 8/,
    );
  });

  it('menaikkan jumlah item yang sudah ada, bukan membuat baris kedua', async () => {
    prisma.cartItem.findFirst.mockResolvedValue({ id: 'item-1', jumlah: 2 });

    await service.tambah(TOKEN, { produkId: 'produk-1', jumlah: 3 });

    expect(prisma.cartItem.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: { jumlah: 5 },
    });
    expect(prisma.cartItem.create).not.toHaveBeenCalled();
  });

  it('membuat baris baru bila produknya belum ada di keranjang', async () => {
    prisma.cartItem.findFirst.mockResolvedValue(null);

    await service.tambah(TOKEN, { produkId: 'produk-1', jumlah: 2 });

    expect(prisma.cartItem.create).toHaveBeenCalledWith({
      data: { cartId: 'cart-1', productId: 'produk-1', variantId: null, jumlah: 2 },
    });
  });

  it('membatasi jumlah per produk di 99 buah', async () => {
    prisma.product.findUnique.mockResolvedValue(produk({ stok: 1_000 }));

    await expect(service.tambah(TOKEN, { produkId: 'produk-1', jumlah: 100 })).rejects.toThrow(
      /maksimal 99/i,
    );
  });
});

describe('CartService.ubahJumlah & hapus', () => {
  let prisma: PrismaPalsu;
  let service: CartService;

  beforeEach(() => {
    prisma = buatPrismaPalsu();
    service = new CartService(prisma as unknown as PrismaService);
    prisma.cartItem.findUnique.mockResolvedValue({
      id: 'item-1',
      productId: 'produk-1',
      variantId: null,
      cart: { token: TOKEN },
    });
    prisma.product.findUnique.mockResolvedValue(produk());
    prisma.cart.findUnique.mockResolvedValue({ id: 'cart-1', items: [] });
  });

  it('menolak mengubah item milik keranjang orang lain', async () => {
    // Tanpa ini, siapa pun yang menebak id item bisa mengubah keranjang orang lain.
    prisma.cartItem.findUnique.mockResolvedValue({
      id: 'item-1',
      productId: 'produk-1',
      variantId: null,
      cart: { token: 'token-orang-lain' },
    });

    await expect(service.ubahJumlah(TOKEN, 'item-1', 3)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.hapus(TOKEN, 'item-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('menolak item yang tidak ada', async () => {
    prisma.cartItem.findUnique.mockResolvedValue(null);

    await expect(service.ubahJumlah(TOKEN, 'hantu', 3)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('menghapus baris bila jumlahnya diturunkan ke nol', async () => {
    await service.ubahJumlah(TOKEN, 'item-1', 0);

    expect(prisma.cartItem.delete).toHaveBeenCalledWith({ where: { id: 'item-1' } });
  });

  it('menolak jumlah baru yang melebihi stok', async () => {
    prisma.product.findUnique.mockResolvedValue(produk({ stok: 2 }));

    await expect(service.ubahJumlah(TOKEN, 'item-1', 5)).rejects.toThrow(/stok tersisa hanya 2/i);
  });

  it('menyimpan jumlah baru yang sah', async () => {
    await service.ubahJumlah(TOKEN, 'item-1', 4);

    expect(prisma.cartItem.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: { jumlah: 4 },
    });
  });

  it('mengosongkan seluruh keranjang', async () => {
    prisma.cart.findUnique.mockResolvedValue({ id: 'cart-1', items: [] });

    await service.kosongkan(TOKEN);

    expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({ where: { cartId: 'cart-1' } });
  });

  it('tidak gagal saat mengosongkan keranjang yang belum pernah ada', async () => {
    prisma.cart.findUnique.mockResolvedValueOnce(null).mockResolvedValue({ id: 'c', items: [] });
    prisma.cart.create.mockResolvedValue({ id: 'cart-baru', items: [] });

    await expect(service.kosongkan(TOKEN)).resolves.toBeDefined();
    expect(prisma.cartItem.deleteMany).not.toHaveBeenCalled();
  });
});
