import type { Metadata } from 'next';
import Link from 'next/link';
import { FormProduk } from '@/components/admin/form-produk';
import { apiGet } from '@/lib/api';
import { ambilToken } from '@/lib/sesi';
import type { KategoriAdmin, LabelAdmin, MerekAdmin } from '@/lib/types';

export const metadata: Metadata = { title: 'Tambah Produk' };

export default async function HalamanTambahProduk() {
  const token = await ambilToken();

  // Keduanya opsional: produk boleh tanpa kategori maupun tanpa label, jadi
  // kegagalan memuat daftarnya tidak boleh memblokir form.
  const [kategori, label, merek] = await Promise.all([
    apiGet<KategoriAdmin[]>('/admin/kategori', { token: token ?? undefined }).catch(
      () => [] as KategoriAdmin[],
    ),
    apiGet<LabelAdmin[]>('/admin/label', { token: token ?? undefined }).catch(
      () => [] as LabelAdmin[],
    ),
    apiGet<MerekAdmin[]>('/admin/merek', { token: token ?? undefined }).catch(
      () => [] as MerekAdmin[],
    ),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/produk" className="text-sm font-medium text-merek-700 hover:text-merek-800">
          &larr; Kembali ke daftar produk
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
          Tambah Produk
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Simpan sebagai draft dulu bila datanya belum lengkap.
        </p>
      </div>

      <FormProduk kategori={kategori} label={label} merek={merek} />
    </div>
  );
}
