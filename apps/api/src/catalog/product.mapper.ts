import type { Prisma } from "../generated/prisma/client.ts";

/**
 * Bentuk query produk yang dipakai bersama endpoint publik & admin,
 * supaya relasi yang di-load konsisten.
 */
export const productInclude = {
  category: { select: { id: true, nama: true, slug: true } },
  brand: { select: { id: true, nama: true, slug: true } },
  labels: { include: { label: true } },
  images: { orderBy: { urutan: "asc" } },
  variants: {
    orderBy: { urutan: "asc" },
    include: { images: { orderBy: { urutan: "asc" } } },
  },
} satisfies Prisma.ProductInclude;

export type ProductWithRelations = Prisma.ProductGetPayload<{
  include: typeof productInclude;
}>;

/** Stok efektif: kalau produk punya varian, stok produk = total stok varian aktif. */
export function hitungStok(product: ProductWithRelations): number {
  const varianAktif = product.variants.filter((v) => v.aktif);
  if (varianAktif.length > 0) {
    return varianAktif.reduce((total, v) => total + v.stok, 0);
  }
  return product.stok;
}

/**
 * Gambar yang berlaku untuk seluruh produk — yaitu yang tidak ditandai milik
 * varian tertentu. Inilah yang tampil sebelum pembeli memilih varian, dan yang
 * jadi cadangan bagi varian yang tidak punya gambar sendiri.
 */
function gambarUmum(product: ProductWithRelations) {
  return product.images.filter((g) => g.variantId === null);
}

function persenDiskon(harga: number, hargaCoret: number | null): number | null {
  if (!hargaCoret || hargaCoret <= harga) return null;
  return Math.round(((hargaCoret - harga) / hargaCoret) * 100);
}

/**
 * Serialisasi untuk konsumsi publik.
 * `hpp` (harga pokok penjualan) & `stokMinimum` sengaja tidak pernah ikut —
 * itu data internal margin yang tidak boleh bocor ke pembeli.
 */
export function toPublicProduct(product: ProductWithRelations) {
  const stok = hitungStok(product);
  return {
    id: product.id,
    nama: product.nama,
    slug: product.slug,
    deskripsi: product.deskripsi,
    deskripsiSingkat: product.deskripsiSingkat,
    brand: product.brand,
    sku: product.sku,
    harga: product.harga,
    hargaCoret: product.hargaCoret,
    diskonPersen: persenDiskon(product.harga, product.hargaCoret),
    berat: product.berat,
    stok,
    tersedia: stok > 0,
    kategori: product.category,
    gambar: gambarUmum(product).map((g) => ({
      id: g.id,
      url: g.url,
      alt: g.alt ?? product.nama,
    })),
    varian: product.variants
      .filter((v) => v.aktif)
      .map((v) => ({
        id: v.id,
        nama: v.nama,
        sku: v.sku,
        harga: v.harga ?? product.harga,
        stok: v.stok,
        tersedia: v.stok > 0,
        // Kosong berarti varian ini memakai gambar umum produk. Keputusan
        // menampilkan yang mana diambil di sisi tampilan, bukan di sini,
        // supaya API tidak menggandakan URL yang sama untuk tiap varian.
        gambar: v.images.map((g) => ({
          id: g.id,
          url: g.url,
          alt: g.alt ?? `${product.nama} — ${v.nama}`,
        })),
      })),
    metaTitle: product.metaTitle,
    metaDescription: product.metaDescription,
    linkShopee: product.linkShopee,
    linkTiktok: product.linkTiktok,
    label: labelTayang(product),
  };
}

/** Versi ringkas untuk kartu produk di grid (home, kategori, hasil pencarian). */
export function toProductCard(product: ProductWithRelations) {
  const stok = hitungStok(product);
  return {
    id: product.id,
    nama: product.nama,
    slug: product.slug,
    deskripsiSingkat: product.deskripsiSingkat,
    brand: product.brand,
    harga: product.harga,
    hargaCoret: product.hargaCoret,
    diskonPersen: persenDiskon(product.harga, product.hargaCoret),
    stok,
    tersedia: stok > 0,
    kategori: product.category,
    gambarUtama: gambarUmum(product)[0]?.url ?? null,
    linkShopee: product.linkShopee,
    linkTiktok: product.linkTiktok,
    // Produk bervarian tidak bisa langsung dimasukkan keranjang dari grid —
    // pembeli harus memilih varian dulu di halaman detail.
    punyaVarian: product.variants.some((v) => v.aktif),
    label: labelTayang(product),
  };
}

/**
 * Label promosi yang sedang berlaku untuk sebuah produk.
 *
 * Jadwalnya disaring di sini, bukan di query, supaya satu produk yang dimuat
 * bersama produk lain tidak perlu query terpisah — dan lencana Flash Sale
 * hilang sendiri begitu periodenya lewat.
 */
function labelTayang(product: ProductWithRelations) {
  const sekarang = Date.now();
  return product.labels
    .map((pl) => pl.label)
    .filter(
      (l) =>
        l.aktif &&
        (!l.mulai || l.mulai.getTime() <= sekarang) &&
        (!l.selesai || l.selesai.getTime() >= sekarang),
    )
    .sort((a, b) => a.urutan - b.urutan)
    .map((l) => ({ id: l.id, nama: l.nama, slug: l.slug, warna: l.warna }));
}

/** Versi admin — termasuk HPP, status draft, dan info stok internal. */
export function toAdminProduct(product: ProductWithRelations) {
  return {
    ...toPublicProduct(product),
    hpp: product.hpp,
    stokProduk: product.stok,
    stokMinimum: product.stokMinimum,
    stokMenipis: hitungStok(product) <= product.stokMinimum,
    status: product.status,
    unggulan: product.unggulan,
    kenaPpn: product.kenaPpn,
    panjang: product.panjang,
    lebar: product.lebar,
    tinggi: product.tinggi,
    categoryId: product.categoryId,
    labelIds: product.labels.map((l) => l.labelId),
    // Varian ditampilkan apa adanya di admin (termasuk yang nonaktif).
    varian: product.variants.map((v) => ({
      id: v.id,
      nama: v.nama,
      sku: v.sku,
      harga: v.harga,
      stok: v.stok,
      aktif: v.aktif,
      urutan: v.urutan,
      gambar: v.images.map((g) => ({ id: g.id, url: g.url, alt: g.alt })),
    })),
    publishedAt: product.publishedAt,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}
