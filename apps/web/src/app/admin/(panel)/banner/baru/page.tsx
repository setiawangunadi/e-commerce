import type { Metadata } from 'next';
import Link from 'next/link';
import { FormBanner } from '@/components/admin/form-banner';

export const metadata: Metadata = { title: 'Tambah Banner' };

export default function HalamanTambahBanner() {
  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/banner" className="text-sm font-medium text-merek-700 hover:text-merek-800">
          &larr; Kembali ke daftar banner
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
          Tambah Banner
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Banner tampil di slider paling atas halaman home, diurutkan dari angka terkecil.
        </p>
      </div>

      <FormBanner />
    </div>
  );
}
