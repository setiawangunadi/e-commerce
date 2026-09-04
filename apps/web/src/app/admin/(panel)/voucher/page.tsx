import type { Metadata } from 'next';
import Link from 'next/link';
import { AksiVoucher, SakelarVoucher } from '@/components/admin/aksi-promo';
import { apiGet } from '@/lib/api';
import { rupiah, tanggal } from '@/lib/format';
import { ambilProfil, ambilToken } from '@/lib/sesi';
import type { RingkasanVoucher } from '@/lib/types';

export const metadata: Metadata = { title: 'Voucher' };

const KELAS_KEADAAN: Record<string, string> = {
  Aktif: 'bg-merek-100 text-merek-800',
  Terjadwal: 'bg-blue-50 text-blue-700',
  Kedaluwarsa: 'bg-amber-50 text-amber-700',
  'Kuota habis': 'bg-amber-50 text-amber-700',
  Nonaktif: 'bg-neutral-100 text-neutral-600',
};

export default async function HalamanDaftarVoucher({
  searchParams,
}: {
  searchParams: Promise<{ pesan?: string }>;
}) {
  const [sp, token, profil] = await Promise.all([searchParams, ambilToken(), ambilProfil()]);

  let voucher: RingkasanVoucher[] = [];
  let galat: string | null = null;

  try {
    voucher = await apiGet<RingkasanVoucher[]>('/admin/voucher', { token: token ?? undefined });
  } catch (e) {
    galat = e instanceof Error ? e.message : 'Gagal memuat voucher';
  }

  const bolehHapus = profil?.role === 'ADMIN';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Voucher</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Kode diskon yang dimasukkan pembeli di halaman checkout. Besar potongan dihitung ulang
            di server setiap kali dipakai.
          </p>
        </div>
        <Link
          href="/admin/voucher/baru"
          className="rounded-lg bg-merek-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-merek-800"
        >
          + Tambah Voucher
        </Link>
      </div>

      {sp.pesan === 'tersimpan' && (
        <p className="rounded-lg bg-merek-50 px-4 py-3 text-sm text-merek-800">
          Voucher berhasil disimpan.
        </p>
      )}

      {galat && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{galat}</p>}

      {voucher.length === 0 && !galat ? (
        <div className="rounded-xl border border-neutral-200 bg-white py-16 text-center">
          <p className="text-sm text-neutral-600">
            Belum ada voucher. Buat kode pertama untuk dipakai di kampanye iklan.
          </p>
          <Link
            href="/admin/voucher/baru"
            className="mt-4 inline-block rounded-lg bg-merek-700 px-4 py-2 text-sm font-semibold text-white hover:bg-merek-800"
          >
            Buat voucher pertama
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {voucher.map((v) => (
            <li
              key={v.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/voucher/${v.id}`}
                    className="font-mono text-base font-semibold tracking-wide text-neutral-900 hover:text-merek-700"
                  >
                    {v.kode}
                  </Link>
                  <span
                    className={`rounded-md px-2 py-1 text-xs font-semibold ${
                      KELAS_KEADAAN[v.keadaan] ?? 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    {v.keadaan}
                  </span>
                </div>

                <p className="mt-1 text-sm text-neutral-700">
                  {v.tipe === 'PERSEN' ? (
                    <>
                      Diskon {v.nilai}%
                      {v.maksPotongan !== null && ` (maks ${rupiah(v.maksPotongan)})`}
                    </>
                  ) : (
                    <>Potongan {rupiah(v.nilai)}</>
                  )}
                  {v.minBelanja > 0 && ` · min. belanja ${rupiah(v.minBelanja)}`}
                </p>

                {v.deskripsi && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-neutral-500">{v.deskripsi}</p>
                )}

                <p className="mt-1.5 text-xs text-neutral-500">
                  {v.cakupan} &middot; Terpakai {v.terpakai}
                  {v.kuota !== null ? ` dari ${v.kuota}` : '× (tanpa batas)'}
                  {(v.mulai || v.selesai) && (
                    <>
                      {' '}
                      &middot; {v.mulai ? tanggal(v.mulai) : 'sekarang'} &ndash;{' '}
                      {v.selesai ? tanggal(v.selesai) : 'seterusnya'}
                    </>
                  )}
                </p>

                {v.kuota !== null && (
                  <div className="mt-2 h-1.5 w-48 max-w-full overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full rounded-full bg-merek-600"
                      style={{ width: `${Math.min(100, (v.terpakai / v.kuota) * 100)}%` }}
                    />
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <SakelarVoucher id={v.id} aktif={v.aktif} />
                <Link
                  href={`/admin/voucher/${v.id}`}
                  className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-merek-700 hover:bg-merek-50"
                >
                  Ubah
                </Link>
                {bolehHapus && <AksiVoucher id={v.id} kode={v.kode} />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
