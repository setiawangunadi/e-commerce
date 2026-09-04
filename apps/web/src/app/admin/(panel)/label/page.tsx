import type { Metadata } from 'next';
import Link from 'next/link';
import { AksiLabel, SakelarLabel } from '@/components/admin/aksi-promo';
import { apiGet } from '@/lib/api';
import { tanggal } from '@/lib/format';
import { ambilProfil, ambilToken } from '@/lib/sesi';
import type { LabelAdmin } from '@/lib/types';

export const metadata: Metadata = { title: 'Label Promosi' };

const KELAS_KEADAAN: Record<string, string> = {
  Tayang: 'bg-merek-100 text-merek-800',
  Terjadwal: 'bg-blue-50 text-blue-700',
  Berakhir: 'bg-amber-50 text-amber-700',
  Nonaktif: 'bg-neutral-100 text-neutral-600',
};

export default async function HalamanDaftarLabel({
  searchParams,
}: {
  searchParams: Promise<{ pesan?: string }>;
}) {
  const [sp, token, profil] = await Promise.all([searchParams, ambilToken(), ambilProfil()]);

  let label: LabelAdmin[] = [];
  let galat: string | null = null;

  try {
    label = await apiGet<LabelAdmin[]>('/admin/label', { token: token ?? undefined });
  } catch (e) {
    galat = e instanceof Error ? e.message : 'Gagal memuat label';
  }

  const bolehHapus = profil?.role === 'ADMIN';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Label Promosi</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Lencana seperti Flash Sale atau Diskon yang menempel di kartu produk. Berbeda dari
            kategori — satu produk boleh punya beberapa label sekaligus.
          </p>
        </div>
        <Link
          href="/admin/label/baru"
          className="rounded-lg bg-merek-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-merek-800"
        >
          + Tambah Label
        </Link>
      </div>

      {sp.pesan === 'tersimpan' && (
        <p className="rounded-lg bg-merek-50 px-4 py-3 text-sm text-merek-800">
          Label berhasil disimpan.
        </p>
      )}

      {galat && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{galat}</p>}

      {label.length === 0 && !galat ? (
        <div className="rounded-xl border border-neutral-200 bg-white py-16 text-center">
          <p className="text-sm text-neutral-600">
            Belum ada label promosi. Buat satu, lalu tempelkan ke produk lewat form produk.
          </p>
          <Link
            href="/admin/label/baru"
            className="mt-4 inline-block rounded-lg bg-merek-700 px-4 py-2 text-sm font-semibold text-white hover:bg-merek-800"
          >
            Buat label pertama
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {label.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-md px-2 py-1 text-xs font-semibold text-white"
                    style={{ backgroundColor: l.warna }}
                  >
                    {l.nama}
                  </span>
                  <span
                    className={`rounded-md px-2 py-1 text-xs font-semibold ${
                      KELAS_KEADAAN[l.keadaan] ?? 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    {l.keadaan}
                  </span>
                  <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-medium text-neutral-600">
                    urutan {l.urutan}
                  </span>
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  Dipakai {l.jumlahProduk} produk
                  {(l.mulai || l.selesai) && (
                    <>
                      {' '}
                      &middot; Jadwal: {l.mulai ? tanggal(l.mulai) : 'sekarang'} &ndash;{' '}
                      {l.selesai ? tanggal(l.selesai) : 'seterusnya'}
                    </>
                  )}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <SakelarLabel id={l.id} aktif={l.aktif} />
                <Link
                  href={`/admin/label/${l.id}`}
                  className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-merek-700 hover:bg-merek-50"
                >
                  Ubah
                </Link>
                {bolehHapus && <AksiLabel id={l.id} nama={l.nama} />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
