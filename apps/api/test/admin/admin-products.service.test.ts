import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { AdminProductsService } from '../../src/admin/admin-products.service';
import type { CreateProductDto } from '../../src/admin/dto/product.dto';
import type { PrismaService } from '../../src/prisma/prisma.service';
import { buatPrismaPalsu, type PrismaPalsu } from '../bantuan/prisma-palsu';

const dtoDasar: CreateProductDto = {
  nama: 'Kemeja Flanel Lengan Panjang',
  sku: 'KFL-001',
  harga: 189_000,
  berat: 400,
};

function produkTersimpan(ubah: Record<string, unknown> = {}) {
  return {
    id: 'produk-1',
    nama: 'Kemeja Flanel',
    slug: 'kemeja-flanel',
    deskripsi: null,
    deskripsiSingkat: null,
    brand: null,
    sku: 'KFL-001',
    harga: 189_000,
    hargaCoret: null,
    hpp: null,
    berat: 400,
    panjang: null,
    lebar: null,
    tinggi: null,
    stok: 10,
    stokMinimum: 5,
    status: 'DRAFT',
    unggulan: false,
    kenaPpn: true,
    metaTitle: null,
    metaDescription: null,
    linkShopee: null,
    linkTiktok: null,
    categoryId: null,
    publishedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    category: null,
    labels: [],
    images: [],
    variants: [],
    ...ubah,
  };
}

describe('AdminProductsService', () => {
  let prisma: PrismaPalsu;
  let service: AdminProductsService;

  /**
   * `perbarui` membaca produk dua kali: bentuk `select` ringkas untuk
   * pemeriksaan, lalu bentuk `include` lengkap saat menyusun response detail.
   */
  function siapkanProdukAda(ringkas: Record<string, unknown> = {}) {
    prisma.product.findUnique.mockImplementation(async (args: Record<string, unknown>) =>
      args.include
        ? produkTersimpan()
        : {
            id: 'produk-1',
            slug: 'kemeja',
            status: 'PUBLISHED',
            publishedAt: new Date(),
            harga: 189_000,
            hargaCoret: null,
            ...ringkas,
          },
    );
  }

  beforeEach(() => {
    prisma = buatPrismaPalsu();
    service = new AdminProductsService(prisma as unknown as PrismaService);
    prisma.product.create.mockResolvedValue(produkTersimpan());
    // `buat` menulis produk lalu membacanya ulang di dalam transaksi yang sama,
    // karena gambar varian baru bisa disimpan setelah variannya punya id.
    prisma.product.findUniqueOrThrow.mockResolvedValue(produkTersimpan());
  });

  describe('validasi harga', () => {
    it('menolak harga coret yang tidak lebih besar dari harga jual', () => {
      // Harga coret yang lebih kecil menampilkan "diskon" negatif ke pembeli.
      return Promise.all([
        expect(service.buat({ ...dtoDasar, hargaCoret: 100_000 })).rejects.toThrow(
          /harga coret harus lebih besar/i,
        ),
        expect(service.buat({ ...dtoDasar, hargaCoret: 189_000 })).rejects.toThrow(
          /harga coret harus lebih besar/i,
        ),
      ]);
    });

    it('menerima harga coret yang lebih besar', async () => {
      await expect(service.buat({ ...dtoDasar, hargaCoret: 250_000 })).resolves.toBeDefined();
    });

    it('memvalidasi harga terhadap gabungan nilai lama dan baru saat diperbarui', async () => {
      // Menurunkan harga jual di bawah harga coret lama harus tetap sah;
      // menaikkannya melewati harga coret lama tidak.
      siapkanProdukAda({ status: 'DRAFT', publishedAt: null, harga: 100_000, hargaCoret: 150_000 });

      await expect(service.perbarui('produk-1', { harga: 200_000 })).rejects.toThrow(
        /harga coret/i,
      );
    });
  });

  describe('keunikan SKU', () => {
    it('menolak SKU yang sudah dipakai produk lain', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: 'produk-lain' });

      await expect(service.buat(dtoDasar)).rejects.toThrow(/sudah dipakai produk lain/i);
    });

    it('menolak SKU varian yang duplikat di dalam produk yang sama', async () => {
      await expect(
        service.buat({
          ...dtoDasar,
          varian: [
            { nama: 'S', sku: 'KFL-001-S', stok: 3 },
            { nama: 'M', sku: 'KFL-001-S', stok: 4 },
          ],
        }),
      ).rejects.toThrow(/duplikat dalam produk ini/i);
    });

    it('menolak SKU varian yang sudah dipakai produk lain', async () => {
      prisma.productVariant.findFirst.mockResolvedValue({ sku: 'KFL-001-S' });

      await expect(
        service.buat({ ...dtoDasar, varian: [{ nama: 'S', sku: 'KFL-001-S', stok: 3 }] }),
      ).rejects.toThrow(/sudah dipakai produk lain/i);
    });

    it('mengizinkan produk memakai SKU-nya sendiri saat diperbarui', async () => {
      siapkanProdukAda();

      await service.perbarui('produk-1', { sku: 'KFL-001' });

      expect(prisma.product.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { sku: 'KFL-001', NOT: { id: 'produk-1' } } }),
      );
    });
  });

  describe('slug', () => {
    it('membuat slug dari nama produk', async () => {
      await service.buat(dtoDasar);

      expect(prisma.product.create.mock.calls[0]![0].data.slug).toBe(
        'kemeja-flanel-lengan-panjang',
      );
    });

    it('menambahkan sufiks angka bila slugnya sudah terpakai', async () => {
      prisma.product.findFirst
        .mockResolvedValueOnce(null) // pemeriksaan SKU
        .mockResolvedValueOnce({ id: 'produk-lain' }) // slug dasar terpakai
        .mockResolvedValueOnce(null); // slug dengan sufiks bebas

      await service.buat(dtoDasar);

      expect(prisma.product.create.mock.calls[0]![0].data.slug).toBe(
        'kemeja-flanel-lengan-panjang-2',
      );
    });

    it('jatuh ke slug cadangan bila namanya tidak menghasilkan karakter apa pun', async () => {
      await service.buat({ ...dtoDasar, slug: '!!!' });

      expect(prisma.product.create.mock.calls[0]![0].data.slug).toBe('produk');
    });
  });

  describe('status terbit', () => {
    it('menyimpan produk baru sebagai draft secara bawaan', async () => {
      await service.buat(dtoDasar);

      const data = prisma.product.create.mock.calls[0]![0].data;
      expect(data.status).toBe('DRAFT');
      expect(data.publishedAt).toBeNull();
    });

    it('mencatat waktu terbit saat produk langsung dipublikasikan', async () => {
      await service.buat({ ...dtoDasar, status: 'PUBLISHED' });

      expect(prisma.product.create.mock.calls[0]![0].data.publishedAt).toBeInstanceOf(Date);
    });

    it('MEMPERTAHANKAN waktu terbit pertama saat produk diterbitkan ulang', async () => {
      // Urutan katalog memakai publishedAt; mengubahnya akan melempar produk
      // lama ke bagian "terbaru" setiap kali disunting.
      siapkanProdukAda({ status: 'ARCHIVED', publishedAt: new Date('2026-01-01') });

      await service.perbarui('produk-1', { status: 'PUBLISHED' });

      expect(prisma.product.update.mock.calls[0]![0].data.publishedAt).toBeUndefined();
    });
  });

  describe('gambar per varian', () => {
    it('menautkan gambar ke varian lewat SKU, bukan urutan array', async () => {
      // Urutan bisa bergeser; SKU varian unik secara global, jadi itu yang
      // dipakai memetakan gambar ke variannya.
      prisma.productVariant.findMany.mockResolvedValue([
        { id: 'v-merah', sku: 'KFL-001-M' },
        { id: 'v-biru', sku: 'KFL-001-B' },
      ]);

      await service.buat({
        ...dtoDasar,
        varian: [
          { nama: 'Biru', sku: 'KFL-001-B', stok: 3, gambar: [{ url: '/biru.jpg' }] },
          { nama: 'Merah', sku: 'KFL-001-M', stok: 5, gambar: [{ url: '/merah.jpg' }] },
        ],
      });

      expect(prisma.productImage.createMany.mock.calls[0]![0].data).toEqual([
        { productId: 'produk-1', variantId: 'v-biru', url: '/biru.jpg', alt: null, urutan: 0 },
        { productId: 'produk-1', variantId: 'v-merah', url: '/merah.jpg', alt: null, urutan: 0 },
      ]);
    });

    it('tidak menyentuh tabel gambar bila tidak ada varian yang berfoto', async () => {
      await service.buat({
        ...dtoDasar,
        varian: [{ nama: 'Merah', sku: 'KFL-001-M', stok: 5 }],
      });

      expect(prisma.productImage.createMany).not.toHaveBeenCalled();
    });

    it('melewati varian yang SKU-nya tidak ditemukan setelah tersimpan', async () => {
      // Bisa terjadi bila satu varian ditolak di tengah jalan. Yang penting
      // sisanya tetap tersimpan, bukan seluruh proses gagal karena id kosong.
      prisma.productVariant.findMany.mockResolvedValue([{ id: 'v-merah', sku: 'KFL-001-M' }]);

      await service.buat({
        ...dtoDasar,
        varian: [
          { nama: 'Merah', sku: 'KFL-001-M', stok: 5, gambar: [{ url: '/merah.jpg' }] },
          { nama: 'Hantu', sku: 'KFL-001-X', stok: 1, gambar: [{ url: '/hantu.jpg' }] },
        ],
      });

      const baris = prisma.productImage.createMany.mock.calls[0]![0].data;
      expect(baris).toEqual([
        { productId: 'produk-1', variantId: 'v-merah', url: '/merah.jpg', alt: null, urutan: 0 },
      ]);
    });
  });

  describe('perbarui — gambar, label, dan varian diganti seluruhnya', () => {
    beforeEach(() => {
      siapkanProdukAda();
    });

    it('mengganti seluruh daftar gambar, bukan menambahkan', async () => {
      // Editor admin mengirim daftar utuh; menambahkan akan menggandakan gambar.
      await service.perbarui('produk-1', { gambar: [{ url: '/uploads/baru.jpg' }] });

      // Dibatasi ke variantId null: gambar milik varian punya siklus hidup
      // sendiri dan tidak boleh ikut tersapu saat galeri utama disunting.
      expect(prisma.productImage.deleteMany).toHaveBeenCalledWith({
        where: { productId: 'produk-1', variantId: null },
      });
      expect(prisma.productImage.createMany).toHaveBeenCalled();
    });

    it('mengurutkan gambar sesuai posisinya di form', async () => {
      await service.perbarui('produk-1', {
        gambar: [{ url: '/a.jpg' }, { url: '/b.jpg' }],
      });

      expect(prisma.productImage.createMany.mock.calls[0]![0].data).toEqual([
        { productId: 'produk-1', url: '/a.jpg', alt: null, urutan: 0 },
        { productId: 'produk-1', url: '/b.jpg', alt: null, urutan: 1 },
      ]);
    });

    it('menghapus semua gambar saat daftarnya dikosongkan', async () => {
      await service.perbarui('produk-1', { gambar: [] });

      expect(prisma.productImage.deleteMany).toHaveBeenCalled();
      expect(prisma.productImage.createMany).not.toHaveBeenCalled();
    });

    it('tidak menyentuh gambar bila kolomnya tidak dikirim sama sekali', async () => {
      await service.perbarui('produk-1', { nama: 'Nama Baru' });

      expect(prisma.productImage.deleteMany).not.toHaveBeenCalled();
    });

    it('mengganti seluruh daftar varian dan label dengan cara yang sama', async () => {
      await service.perbarui('produk-1', {
        varian: [{ nama: 'S', sku: 'S-1', stok: 3 }],
        labelIds: ['label-1'],
      });

      expect(prisma.productVariant.deleteMany).toHaveBeenCalled();
      expect(prisma.productLabel.deleteMany).toHaveBeenCalled();
    });
  });

  describe('hapus', () => {
    it('menolak produk yang tidak ada', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.hapus('hantu')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('menghapus permanen produk yang ada', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'produk-1' });

      await expect(service.hapus('produk-1')).resolves.toEqual({ id: 'produk-1', dihapus: true });
    });
  });

  describe('daftar', () => {
    it('menampilkan draft dan arsip juga — ini panel admin, bukan etalase', async () => {
      await service.daftar({ page: 1, limit: 20 });

      const where = prisma.product.findMany.mock.calls[0]![0].where;
      expect(where.status).toBeUndefined();
    });

    it('menyaring berdasarkan status bila diminta', async () => {
      await service.daftar({ page: 1, limit: 20, status: 'DRAFT' });

      expect(prisma.product.findMany.mock.calls[0]![0].where.status).toBe('DRAFT');
    });

    it('mencari di nama, SKU, dan brand sekaligus', async () => {
      await service.daftar({ page: 1, limit: 20, q: 'flanel' });

      const or = prisma.product.findMany.mock.calls[0]![0].where.OR;
      expect(or.map((k: Record<string, unknown>) => Object.keys(k)[0])).toEqual([
        'nama',
        'sku',
        'brand',
      ]);
    });

    it('melompati halaman sesuai paginasi', async () => {
      await service.daftar({ page: 3, limit: 20 });

      expect(prisma.product.findMany.mock.calls[0]![0].skip).toBe(40);
    });
  });

  describe('detail', () => {
    it('menolak produk yang tidak ada', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.detail('hantu')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('menyertakan HPP untuk admin', async () => {
      prisma.product.findUnique.mockResolvedValue(produkTersimpan({ hpp: 90_000 }));

      expect((await service.detail('produk-1')).hpp).toBe(90_000);
    });
  });

  it('mengembalikan BadRequestException untuk seluruh galat validasi', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 'lain' });

    await expect(service.buat(dtoDasar)).rejects.toBeInstanceOf(BadRequestException);
  });
});
