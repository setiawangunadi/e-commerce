import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EditorLanding } from '@/components/admin/landing/editor-landing';
import { ApiError, apiGet, apiGetWithMeta } from '@/lib/api';
import { waktuRelatif } from '@/lib/format';
import { ambilToken } from '@/lib/sesi';
import type { KartuProduk, LandingAdmin } from '@/lib/types';

export const metadata: Metadata = { title: 'Ubah Landing Page' };

export default async function HalamanUbahLanding({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pesan?: string }>;
}) {
  const [{ id }, sp, token] = await Promise.all([params, searchParams, ambilToken()]);

  let landing: LandingAdmin;
  try {
    landing = await apiGet<LandingAdmin>(`/admin/landing/${id}`, { token: token ?? undefined });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  let produk: KartuProduk[] = [];
  try {
    const hasil = await apiGetWithMeta<KartuProduk[]>('/catalog/produk?limit=48');
    produk = hasil.data;
  } catch {
    // Editor tetap bisa dipakai; blok produk saja yang kosong pilihannya.
  }

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
          {landing.nama}
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          <code className="text-neutral-700">/lp/{landing.slug}</code> &middot; terakhir diubah{' '}
          {waktuRelatif(landing.updatedAt)}
        </p>
      </div>

      {sp.pesan === 'tersimpan' && (
        <p className="rounded-lg bg-merek-50 px-4 py-3 text-sm text-merek-800">
          Landing page berhasil dibuat.
        </p>
      )}

      <EditorLanding landing={landing} produk={produk} />
    </div>
  );
}
