import type { Metadata } from 'next';
import Link from 'next/link';
import { FormMerek } from '@/components/admin/form-merek';

export const metadata: Metadata = { title: 'Merek Baru' };

export default function HalamanMerekBaru() {
  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/merek" className="text-sm font-medium text-merek-700 hover:text-merek-800">
          &larr; Kembali ke daftar merek
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">Merek Baru</h1>
      </div>

      <FormMerek />
    </div>
  );
}
