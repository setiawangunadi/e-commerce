import { apiGet, apiGetWithMeta } from '@/lib/api';
import { ambilToken } from '@/lib/sesi';
import type { ProdukRingkas } from '@/components/admin/form-voucher';
import type { KategoriAdmin, MetaPaginasi, ProdukAdmin } from '@/lib/types';

/** API membatasi limit per permintaan di 100, jadi daftar panjang diambil bertahap. */
const PER_HALAMAN = 100;
const MAKS_HALAMAN = 10;

/**
 * Daftar produk & kategori untuk pemilih cakupan voucher.
 *
 * Pemilih butuh daftar utuh: kalau sebagian produk tidak ikut termuat, produk
 * yang sudah tercakup voucher tidak akan tampil tercentang dan diam-diam
 * terlepas saat form disimpan. Karena itu halamannya ditelusuri sampai habis,
 * dengan batas atas agar katalog yang membesar tidak menggantung halaman admin.
 */
export async function muatPilihanCakupan(): Promise<{
  produk: ProdukRingkas[];
  kategori: KategoriAdmin[];
  terpotong: boolean;
}> {
  const token = await ambilToken();

  const [hasilProduk, kategori] = await Promise.all([
    ambilSemuaProduk(token ?? undefined),
    apiGet<KategoriAdmin[]>('/admin/kategori', { token: token ?? undefined }).catch(
      () => [] as KategoriAdmin[],
    ),
  ]);

  return {
    produk: hasilProduk.produk.map((p) => ({
      id: p.id,
      nama: p.nama,
      sku: p.sku,
      harga: p.harga,
    })),
    kategori,
    terpotong: hasilProduk.terpotong,
  };
}

async function ambilSemuaProduk(
  token: string | undefined,
): Promise<{ produk: ProdukAdmin[]; terpotong: boolean }> {
  const kumpulan: ProdukAdmin[] = [];

  for (let halaman = 1; halaman <= MAKS_HALAMAN; halaman++) {
    let hasil: { data: ProdukAdmin[]; meta: unknown };
    try {
      hasil = await apiGetWithMeta<ProdukAdmin[]>(
        `/admin/produk?page=${halaman}&limit=${PER_HALAMAN}`,
        { token },
      );
    } catch {
      return { produk: kumpulan, terpotong: kumpulan.length > 0 };
    }

    kumpulan.push(...hasil.data);

    const meta = hasil.meta as MetaPaginasi | null;
    if (!meta || halaman >= meta.totalHalaman) return { produk: kumpulan, terpotong: false };
  }

  return { produk: kumpulan, terpotong: true };
}
