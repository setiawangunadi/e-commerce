import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FormBanner } from '@/components/admin/form-banner';
import { ApiError, apiGet } from '@/lib/api';
import { waktuRelatif } from '@/lib/format';
import { ambilToken } from '@/lib/sesi';
import type { BannerAdmin } from '@/lib/types';

export const metadata: Metadata = { title: 'Ubah Banner' };

export default async function HalamanUbahBanner({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const token = await ambilToken();

  let banner: BannerAdmin;
  try {
    banner = await apiGet<BannerAdmin>(`/admin/banner/${id}`, { token: token ?? undefined });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/banner" className="text-sm font-medium text-merek-700 hover:text-merek-800">
          &larr; Kembali ke daftar banner
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
          {banner.judul}
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Terakhir diubah {waktuRelatif(banner.updatedAt)}
        </p>
      </div>

      <FormBanner banner={banner} />
    </div>
  );
}
