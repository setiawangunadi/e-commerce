import type { Metadata } from 'next';
import Link from 'next/link';
import { FormKategori } from '@/components/admin/form-kategori';
import { apiGet } from '@/lib/api';
import { ambilToken } from '@/lib/sesi';
import type { KategoriAdmin } from '@/lib/types';

export const metadata: Metadata = { title: 'Kategori Baru' };

export default async function HalamanKategoriBaru() {
  const token = await ambilToken();
  const semua = await apiGet<KategoriAdmin[]>('/admin/kategori', {
    token: token ?? undefined,
  }).catch(() => [] as KategoriAdmin[]);

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/admin/kategori"
          className="text-sm font-medium text-merek-700 hover:text-merek-800"
        >
          &larr; Kembali ke daftar kategori
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
          Kategori Baru
        </h1>
      </div>

      <FormKategori semua={semua} />
    </div>
  );
}
