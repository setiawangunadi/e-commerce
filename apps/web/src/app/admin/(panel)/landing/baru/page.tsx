import type { Metadata } from 'next';
import Link from 'next/link';
import { EditorLanding } from '@/components/admin/landing/editor-landing';
import { apiGetWithMeta } from '@/lib/api';
import type { KartuProduk } from '@/lib/types';

export const metadata: Metadata = { title: 'Buat Landing Page' };

/** Produk terbit dipakai untuk blok produk dan tujuan tombol CTA. */
async function ambilProdukTerbit(): Promise<KartuProduk[]> {
  try {
    const hasil = await apiGetWithMeta<KartuProduk[]>('/catalog/produk?limit=48');
    return hasil.data;
  } catch {
    return [];
  }
}

export default async function HalamanBuatLanding() {
  const produk = await ambilProdukTerbit();

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/admin/landing"
          className="text-sm font-medium text-merek-700 hover:text-merek-800"
        >
          &larr; Kembali ke daftar landing page
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
          Buat Landing Page
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Susun halaman dari blok siap pakai, lalu terbitkan untuk dipakai sebagai tujuan iklan.
        </p>
      </div>

      <EditorLanding produk={produk} />
    </div>
  );
}
