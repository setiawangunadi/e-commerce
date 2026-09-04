import { describe, expect, it } from 'vitest';
import {
  hitungStok,
  toAdminProduct,
  toProductCard,
  toPublicProduct,
  type ProductWithRelations,
} from '../../src/catalog/product.mapper';

const KEMARIN = new Date(Date.now() - 86_400_000);
const BESOK = new Date(Date.now() + 86_400_000);

function label(ubah: Record<string, unknown> = {}) {
  return {
    labelId: 'label-1',
    label: {
      id: 'label-1',
      nama: 'Flash Sale',
      slug: 'flash-sale',
      warna: '#c96442',
      urutan: 0,
      aktif: true,
      mulai: null,
      selesai: null,
      ...ubah,
    },
  };
}

function produk(ubah: Record<string, unknown> = {}): ProductWithRelations {
  return {
    id: 'produk-1',
    nama: 'Kemeja Flanel',
    slug: 'kemeja-flanel',
    deskripsi: 'Kemeja flanel katun',
    deskripsiSingkat: 'Hangat dan nyaman',
    brand: 'SRN Cullezione',
    sku: 'SKU-1',
    harga: 189_000,
    hargaCoret: null,
    hpp: 90_000,
    berat: 400,
    panjang: null,
    lebar: null,
    tinggi: null,
    stok: 12,
    stokMinimum: 5,
    status: 'PUBLISHED',
    unggulan: false,
    kenaPpn: true,
    metaTitle: null,
    metaDescription: null,
    linkShopee: null,
    linkTiktok: null,
    categoryId: 'kategori-1',
    publishedAt: KEMARIN,
    createdAt: KEMARIN,
    updatedAt: KEMARIN,
    category: { id: 'kategori-1', nama: 'Pakaian Pria', slug: 'pakaian-pria' },
    labels: [],
    images: [
      { id: 'g1', url: '/uploads/a.jpg', alt: null, urutan: 0, productId: 'produk-1', variantId: null },
    ],
    variants: [],
    ...ubah,
  } as unknown as ProductWithRelations;
}

function varian(ubah: Record<string, unknown> = {}) {
  return {
    id: 'varian-1',
    productId: 'produk-1',
    nama: 'L',
    sku: 'SKU-1-L',
    harga: null,
    stok: 4,
    aktif: true,
    urutan: 0,
    // productInclude ikut memuat gambar varian, jadi fixture harus punya ini
    // supaya bentuknya sama dengan yang benar-benar dikembalikan Prisma.
    images: [],
    ...ubah,
  };
}

describe('hitungStok', () => {
  it('memakai stok produk bila tidak ada varian', () => {
    expect(hitungStok(produk({ stok: 12 }))).toBe(12);
  });

  it('menjumlahkan stok varian aktif dan mengabaikan isian stok produk', () => {
    // Stok melekat pada varian; angka di tingkat produk tidak punya arti di sini.
    const p = produk({
      stok: 999,
      variants: [varian({ stok: 4 }), varian({ id: 'v2', stok: 6 })],
    });

    expect(hitungStok(p)).toBe(10);
  });

  it('tidak menghitung varian yang dinonaktifkan', () => {
    const p = produk({
      variants: [varian({ stok: 4 }), varian({ id: 'v2', stok: 100, aktif: false })],
    });

    expect(hitungStok(p)).toBe(4);
  });

  it('kembali memakai stok produk bila semua variannya nonaktif', () => {
    const p = produk({ stok: 7, variants: [varian({ aktif: false })] });

    expect(hitungStok(p)).toBe(7);
  });
});

describe('toPublicProduct', () => {
  it('tidak pernah membocorkan HPP dan stok minimum ke pembeli', () => {
    // Ini data margin internal — bocor sekali berarti bocor ke seluruh internet.
    const hasil = toPublicProduct(produk());

    expect(hasil).not.toHaveProperty('hpp');
    expect(hasil).not.toHaveProperty('stokMinimum');
    expect(hasil).not.toHaveProperty('stokProduk');
    expect(hasil).not.toHaveProperty('status');
  });

  it('menghitung persentase diskon dari harga coret', () => {
    const hasil = toPublicProduct(produk({ harga: 150_000, hargaCoret: 200_000 }));

    expect(hasil.diskonPersen).toBe(25);
  });

  it('tidak menampilkan diskon bila harga coretnya tidak masuk akal', () => {
    expect(toPublicProduct(produk({ harga: 200_000, hargaCoret: 200_000 })).diskonPersen).toBeNull();
    expect(toPublicProduct(produk({ harga: 200_000, hargaCoret: 100_000 })).diskonPersen).toBeNull();
    expect(toPublicProduct(produk({ hargaCoret: null })).diskonPersen).toBeNull();
  });

  it('menandai produk tanpa stok sebagai tidak tersedia', () => {
    expect(toPublicProduct(produk({ stok: 0 })).tersedia).toBe(false);
    expect(toPublicProduct(produk({ stok: 1 })).tersedia).toBe(true);
  });

  it('memakai nama produk sebagai alt gambar bila alt-nya kosong', () => {
    const hasil = toPublicProduct(produk());

    expect(hasil.gambar[0]!.alt).toBe('Kemeja Flanel');
  });

  it('hanya menampilkan varian yang aktif', () => {
    const hasil = toPublicProduct(
      produk({ variants: [varian(), varian({ id: 'v2', aktif: false })] }),
    );

    expect(hasil.varian).toHaveLength(1);
  });

  it('mewarisi harga produk untuk varian yang tidak punya harga sendiri', () => {
    const hasil = toPublicProduct(
      produk({ harga: 189_000, variants: [varian({ harga: null }), varian({ id: 'v2', harga: 210_000 })] }),
    );

    expect(hasil.varian[0]!.harga).toBe(189_000);
    expect(hasil.varian[1]!.harga).toBe(210_000);
  });

  it('menandai varian yang stoknya habis', () => {
    const hasil = toPublicProduct(produk({ variants: [varian({ stok: 0 })] }));

    expect(hasil.varian[0]!.tersedia).toBe(false);
  });
});

describe('label promosi', () => {
  it('menampilkan label aktif tanpa jadwal', () => {
    expect(toPublicProduct(produk({ labels: [label()] })).label).toEqual([
      { id: 'label-1', nama: 'Flash Sale', slug: 'flash-sale', warna: '#c96442' },
    ]);
  });

  it('menyembunyikan label yang dinonaktifkan', () => {
    expect(toPublicProduct(produk({ labels: [label({ aktif: false })] })).label).toEqual([]);
  });

  it('menyembunyikan label yang belum mulai', () => {
    expect(toPublicProduct(produk({ labels: [label({ mulai: BESOK })] })).label).toEqual([]);
  });

  it('menghilangkan lencana Flash Sale sendiri begitu periodenya lewat', () => {
    // Tanpa penyaringan ini, admin harus mematikannya manual satu per satu.
    expect(toPublicProduct(produk({ labels: [label({ selesai: KEMARIN })] })).label).toEqual([]);
  });

  it('menampilkan label yang sedang berada dalam jadwalnya', () => {
    const hasil = toPublicProduct(produk({ labels: [label({ mulai: KEMARIN, selesai: BESOK })] }));

    expect(hasil.label).toHaveLength(1);
  });

  it('mengurutkan label sesuai urutan yang ditentukan admin', () => {
    const hasil = toPublicProduct(
      produk({
        labels: [
          label({ id: 'b', nama: 'Baru', urutan: 2 }),
          label({ id: 'a', nama: 'Terlaris', urutan: 1 }),
        ],
      }),
    );

    expect(hasil.label.map((l) => l.nama)).toEqual(['Terlaris', 'Baru']);
  });
});

describe('gambar per varian', () => {
  it('galeri umum tidak ikut memuat gambar milik varian', () => {
    // Kalau ikut terbawa, pembeli yang belum memilih apa pun langsung disuguhi
    // foto satu warna tertentu bercampur foto umum.
    const hasil = toPublicProduct(
      produk({
        images: [
          { id: 'g1', url: '/umum.jpg', alt: null, urutan: 0, variantId: null },
          { id: 'g2', url: '/merah.jpg', alt: null, urutan: 0, variantId: 'varian-1' },
        ],
      }),
    );

    expect(hasil.gambar.map((g) => g.url)).toEqual(['/umum.jpg']);
  });

  it('varian membawa gambarnya sendiri', () => {
    const hasil = toPublicProduct(
      produk({
        variants: [
          varian({
            images: [{ id: 'g2', url: '/merah.jpg', alt: null, urutan: 0, variantId: 'varian-1' }],
          }),
        ],
      }),
    );

    expect(hasil.varian[0]!.gambar.map((g) => g.url)).toEqual(['/merah.jpg']);
  });

  it('varian tanpa gambar mengembalikan array kosong, bukan menyalin gambar umum', () => {
    // Penyalinan dilakukan di sisi tampilan. Kalau API yang menyalin, setiap
    // varian mengulang URL yang sama dan muatan responsnya membengkak sia-sia.
    const hasil = toPublicProduct(produk({ variants: [varian()] }));

    expect(hasil.varian[0]!.gambar).toEqual([]);
  });

  it('memberi alt bawaan yang menyebut nama varian', () => {
    const hasil = toPublicProduct(
      produk({
        nama: 'Kemeja Flanel',
        variants: [
          varian({
            nama: 'Merah',
            images: [{ id: 'g2', url: '/merah.jpg', alt: null, urutan: 0, variantId: 'varian-1' }],
          }),
        ],
      }),
    );

    expect(hasil.varian[0]!.gambar[0]!.alt).toBe('Kemeja Flanel — Merah');
  });

  it('gambarUtama kartu katalog hanya diambil dari gambar umum', () => {
    const hasil = toProductCard(
      produk({
        images: [
          { id: 'g2', url: '/merah.jpg', alt: null, urutan: 0, variantId: 'varian-1' },
          { id: 'g1', url: '/umum.jpg', alt: null, urutan: 1, variantId: null },
        ],
      }),
    );

    expect(hasil.gambarUtama).toBe('/umum.jpg');
  });
});

describe('toProductCard', () => {
  it('hanya mengirim gambar pertama — kartu grid tidak butuh sisanya', () => {
    const hasil = toProductCard(
      produk({
        images: [
          { id: 'g1', url: '/uploads/a.jpg', alt: null, urutan: 0, variantId: null },
          { id: 'g2', url: '/uploads/b.jpg', alt: null, urutan: 1, variantId: null },
        ],
      }),
    );

    expect(hasil.gambarUtama).toBe('/uploads/a.jpg');
    expect(hasil).not.toHaveProperty('gambar');
  });

  it('mengembalikan null bila produknya belum punya gambar', () => {
    expect(toProductCard(produk({ images: [] })).gambarUtama).toBeNull();
  });

  it('menandai produk bervarian supaya tombol grid jadi "Pilih Varian"', () => {
    // Produk bervarian tidak bisa langsung masuk keranjang dari grid katalog.
    expect(toProductCard(produk({ variants: [varian()] })).punyaVarian).toBe(true);
    expect(toProductCard(produk()).punyaVarian).toBe(false);
  });

  it('tidak menganggap produk bervarian bila semua variannya nonaktif', () => {
    expect(toProductCard(produk({ variants: [varian({ aktif: false })] })).punyaVarian).toBe(false);
  });

  it('tidak membocorkan HPP di kartu grid', () => {
    expect(toProductCard(produk())).not.toHaveProperty('hpp');
  });

  it('menyertakan tautan marketplace supaya tombolnya bisa dirender', () => {
    const hasil = toProductCard(
      produk({ linkShopee: 'https://shopee.co.id/x', linkTiktok: null }),
    );

    expect(hasil.linkShopee).toBe('https://shopee.co.id/x');
    expect(hasil.linkTiktok).toBeNull();
  });
});

describe('toAdminProduct', () => {
  it('menyertakan HPP dan data internal lain', () => {
    const hasil = toAdminProduct(produk());

    expect(hasil.hpp).toBe(90_000);
    expect(hasil.stokMinimum).toBe(5);
    expect(hasil.status).toBe('PUBLISHED');
  });

  it('menandai produk yang stoknya sudah menyentuh batas minimum', () => {
    expect(toAdminProduct(produk({ stok: 5, stokMinimum: 5 })).stokMenipis).toBe(true);
    expect(toAdminProduct(produk({ stok: 6, stokMinimum: 5 })).stokMenipis).toBe(false);
  });

  it('menampilkan varian nonaktif juga — admin perlu bisa mengaktifkannya lagi', () => {
    const hasil = toAdminProduct(
      produk({ variants: [varian(), varian({ id: 'v2', aktif: false })] }),
    );

    expect(hasil.varian).toHaveLength(2);
    expect(hasil.varian[1]!.aktif).toBe(false);
  });

  it('mengirim daftar id label untuk mengisi ulang form', () => {
    expect(toAdminProduct(produk({ labels: [label()] })).labelIds).toEqual(['label-1']);
  });
});
