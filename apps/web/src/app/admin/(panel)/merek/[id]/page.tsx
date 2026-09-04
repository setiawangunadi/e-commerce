import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FormMerek } from '@/components/admin/form-merek';
import { apiGet } from '@/lib/api';
import { ambilToken } from '@/lib/sesi';
import type { MerekAdmin } from '@/lib/types';

export const metadata: Metadata = { title: 'Ubah Merek' };

export default async function HalamanUbahMerek({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await ambilToken();

  // API tidak punya endpoint detail merek — daftarnya ringan, jadi cukup satu panggilan.
  const semua = await apiGet<MerekAdmin[]>('/admin/merek', { token: token ?? undefined });
  const merek = semua.find((m) => m.id === id);
  if (!merek) notFound();

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/merek" className="text-sm font-medium text-merek-700 hover:text-merek-800">
          &larr; Kembali ke daftar merek
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">{merek.nama}</h1>
        <p className="mt-1 text-sm text-neutral-600">{merek.jumlahProduk} produk memakai merek ini</p>
      </div>

      <FormMerek merek={merek} />
    </div>
  );
}
