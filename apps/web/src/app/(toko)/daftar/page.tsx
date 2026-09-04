import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { FormDaftar } from '@/components/toko/akun/form-auth';
import { apiGet } from '@/lib/api';
import { rupiah } from '@/lib/format';
import { ambilPelanggan } from '@/lib/sesi-pelanggan';
import { TOKO } from '@/lib/toko';
import type { AturanTier } from '@/lib/types';

export const metadata: Metadata = { title: 'Daftar Akun' };

export default async function HalamanDaftar({
  searchParams,
}: {
  searchParams: Promise<{ lanjut?: string }>;
}) {
  const [sp, pelanggan] = await Promise.all([searchParams, ambilPelanggan()]);

  const lanjut = sp.lanjut?.startsWith('/') && !sp.lanjut.startsWith('//') ? sp.lanjut : '/akun';
  if (pelanggan) redirect(lanjut);

  // Aturan tier diambil dari API agar angkanya tidak pernah berbeda antara
  // yang dijanjikan di halaman daftar dan yang dihitung saat belanja.
  const tier = await apiGet<AturanTier[]>('/pelanggan/tier', { revalidate: 3600 }).catch(
    () => [] as AturanTier[],
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:py-16">
      <div className="grid gap-10 lg:grid-cols-[1fr_400px]">
        <div className="order-2 lg:order-1">
          <h2 className="text-lg font-semibold text-neutral-900">Kenapa buat akun?</h2>
          <ul className="mt-4 space-y-3 text-sm text-neutral-700">
            <li className="flex gap-3">
              <span aria-hidden="true" className="text-merek-700">
                &#10003;
              </span>
              <span>
                <strong className="font-medium">Kumpulkan poin.</strong> Setiap belanja
                menghasilkan poin yang bisa dipakai jadi potongan atau ditukar voucher.
              </span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true" className="text-merek-700">
                &#10003;
              </span>
              <span>
                <strong className="font-medium">Alamat tersimpan.</strong> Checkout berikutnya
                tinggal pilih, tidak perlu mengetik ulang.
              </span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true" className="text-merek-700">
                &#10003;
              </span>
              <span>
                <strong className="font-medium">Riwayat pesanan.</strong> Lacak resi dan status
                semua pesanan dari satu halaman.
              </span>
            </li>
          </ul>

          {tier.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-semibold text-neutral-900">
                Makin sering belanja, makin cepat poinnya bertambah
              </h3>
              <p className="mt-1 text-xs text-neutral-500">
                Tier dihitung dari belanja 12 bulan terakhir.
              </p>
              <ul className="mt-3 space-y-2">
                {tier.map((t) => (
                  <li
                    key={t.tier}
                    className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: t.warna }}
                      />
                      <span className="text-sm font-medium text-neutral-800">{t.nama}</span>
                    </span>
                    <span className="text-xs text-neutral-600">
                      {t.minBelanja === 0 ? 'mulai di sini' : `dari ${rupiah(t.minBelanja)}`}
                      {' · '}
                      <span className="font-medium text-neutral-800">{t.pengali}× poin</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="order-1 lg:order-2">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Buat akun {TOKO.nama}
          </h1>
          <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-6">
            <FormDaftar lanjut={lanjut} />
          </div>
        </div>
      </div>
    </div>
  );
}
