import type { Metadata } from 'next';
import Link from 'next/link';
import { FormLabel } from '@/components/admin/form-label';

export const metadata: Metadata = { title: 'Label Baru' };

export default function HalamanLabelBaru() {
  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/label" className="text-sm font-medium text-merek-700 hover:text-merek-800">
          &larr; Kembali ke daftar label
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">Label Baru</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Setelah disimpan, tempelkan label ini ke produk lewat form produk.
        </p>
      </div>

      <FormLabel />
    </div>
  );
}
