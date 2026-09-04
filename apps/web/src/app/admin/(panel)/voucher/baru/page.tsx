import type { Metadata } from 'next';
import Link from 'next/link';
import { FormVoucher } from '@/components/admin/form-voucher';
import { muatPilihanCakupan } from '../pilihan-cakupan';

export const metadata: Metadata = { title: 'Voucher Baru' };

export default async function HalamanVoucherBaru() {
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
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
          Voucher Baru
        </h1>
      </div>

      <FormVoucher produk={produk} kategori={kategori} terpotong={terpotong} />
    </div>
  );
}
