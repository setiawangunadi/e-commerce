import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LencanaStatus } from '@/components/admin/lencana-status';
import { FormProduk } from '@/components/admin/form-produk';
import { ApiError, apiGet } from '@/lib/api';
import { waktuRelatif } from '@/lib/format';
import { ambilToken } from '@/lib/sesi';
import type { KategoriAdmin, LabelAdmin, MerekAdmin, ProdukAdmin } from '@/lib/types';

export const metadata: Metadata = { title: 'Ubah Produk' };

export default async function HalamanUbahProduk({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const token = await ambilToken();

  let produk: ProdukAdmin;
  try {
    produk = await apiGet<ProdukAdmin>(`/admin/produk/${id}`, { token: token ?? undefined });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  // Abaikan kegagalan: form tetap bisa dipakai tanpa daftar kategori/label.
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

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{produk.nama}</h1>
          <LencanaStatus status={produk.status} />
        </div>

        <p className="mt-1 text-sm text-neutral-600">
          {produk.sku} &middot; terakhir diubah {waktuRelatif(produk.updatedAt)}
          {produk.status === 'PUBLISHED' && (
            <>
              {' '}
              &middot;{' '}
              <Link
                href={`/produk/${produk.slug}`}
                target="_blank"
                className="font-medium text-merek-700 hover:text-merek-800"
              >
                lihat di toko ↗
              </Link>
            </>
          )}
        </p>
      </div>

      <FormProduk produk={produk} kategori={kategori} label={label} merek={merek} />
    </div>
  );
}
