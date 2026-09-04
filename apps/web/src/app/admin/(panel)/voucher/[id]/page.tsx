import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FormVoucher } from '@/components/admin/form-voucher';
import { ApiError, apiGet } from '@/lib/api';
import { waktuRelatif } from '@/lib/format';
import { ambilToken } from '@/lib/sesi';
import type { VoucherAdmin } from '@/lib/types';
import { muatPilihanCakupan } from '../pilihan-cakupan';

export const metadata: Metadata = { title: 'Ubah Voucher' };

export default async function HalamanUbahVoucher({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const token = await ambilToken();

  let voucher: VoucherAdmin;
  try {
    voucher = await apiGet<VoucherAdmin>(`/admin/voucher/${id}`, { token: token ?? undefined });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  const { produk, kategori, terpotong } = await muatPilihanCakupan();

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/admin/voucher"
          className="text-sm font-medium text-merek-700 hover:text-merek-800"
        >
          &larr; Kembali ke daftar voucher
        </Link>
        <h1 className="mt-2 font-mono text-2xl font-semibold tracking-wide text-neutral-900">
          {voucher.kode}
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Sudah dipakai {voucher.terpakai}× &middot; terakhir diubah{' '}
          {waktuRelatif(voucher.updatedAt)}
        </p>
      </div>

      <FormVoucher
        voucher={voucher}
        produk={produk}
        kategori={kategori}
        terpotong={terpotong}
      />
    </div>
  );
}
