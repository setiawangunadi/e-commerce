import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FormKategori } from '@/components/admin/form-kategori';
import { apiGet } from '@/lib/api';
import { ambilToken } from '@/lib/sesi';
import type { KategoriAdmin } from '@/lib/types';

export const metadata: Metadata = { title: 'Ubah Kategori' };

export default async function HalamanUbahKategori({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const token = await ambilToken();

  // API tidak punya endpoint detail kategori — daftarnya ringan dan tetap
  // dibutuhkan utuh untuk pilihan induk, jadi cukup satu panggilan.
  const semua = await apiGet<KategoriAdmin[]>('/admin/kategori', { token: token ?? undefined });
  const kategori = semua.find((k) => k.id === id);
  if (!kategori) notFound();

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
          {kategori.nama}
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          {kategori.induk && (
            <>
              Sub-kategori dari <strong>{kategori.induk.nama}</strong> &middot;{' '}
            </>
          )}
          {kategori.jumlahProduk} produk
        </p>
      </div>

      <FormKategori kategori={kategori} semua={semua} />
    </div>
  );
}
