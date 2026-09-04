import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FormLabel } from '@/components/admin/form-label';
import { apiGet } from '@/lib/api';
import { ambilToken } from '@/lib/sesi';
import type { LabelAdmin } from '@/lib/types';

export const metadata: Metadata = { title: 'Ubah Label' };

export default async function HalamanUbahLabel({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await ambilToken();

  const semua = await apiGet<LabelAdmin[]>('/admin/label', { token: token ?? undefined });
  const label = semua.find((l) => l.id === id);
  if (!label) notFound();

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/label" className="text-sm font-medium text-merek-700 hover:text-merek-800">
          &larr; Kembali ke daftar label
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
          {label.nama}
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Dipakai {label.jumlahProduk} produk &middot; status: {label.keadaan.toLowerCase()}
        </p>
      </div>

      <FormLabel label={label} />
    </div>
  );
}
