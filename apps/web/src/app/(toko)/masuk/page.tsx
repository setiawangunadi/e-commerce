import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FormMasuk } from '@/components/toko/akun/form-auth';
import { ambilPelanggan } from '@/lib/sesi-pelanggan';
import { TOKO } from '@/lib/toko';

export const metadata: Metadata = { title: 'Masuk' };

export default async function HalamanMasuk({
  searchParams,
}: {
  searchParams: Promise<{ lanjut?: string }>;
}) {
  const [sp, pelanggan] = await Promise.all([searchParams, ambilPelanggan()]);

  // Sudah masuk tapi membuka halaman ini → langsung ke tujuan.
  const lanjut = sp.lanjut?.startsWith('/') && !sp.lanjut.startsWith('//') ? sp.lanjut : '/akun';
  if (pelanggan) redirect(lanjut);

  return (
    <div className="mx-auto w-full max-w-md px-4 py-12 sm:py-16">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Masuk ke {TOKO.nama}
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Riwayat pesanan, alamat tersimpan, dan poin belanja Anda ada di sini.
        </p>
      </div>

      <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-6">
        <FormMasuk lanjut={lanjut} />
      </div>

      <p className="mt-6 text-center text-xs text-neutral-500">
        Belum mau bikin akun? Anda tetap bisa{' '}
        <Link href="/produk" className="font-medium text-merek-700 hover:text-merek-800">
          belanja tanpa akun
        </Link>
        .
      </p>
    </div>
  );
}
