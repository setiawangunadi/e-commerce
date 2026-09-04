import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { AksiBanner, SakelarAktif } from '@/components/admin/aksi-banner';
import { apiGet } from '@/lib/api';
import { tanggal } from '@/lib/format';
import { ambilProfil, ambilToken } from '@/lib/sesi';
import type { BannerAdmin } from '@/lib/types';

export const metadata: Metadata = { title: 'Banner' };

export default async function HalamanDaftarBanner({
  searchParams,
}: {
  searchParams: Promise<{ pesan?: string }>;
}) {
  const [sp, token, profil] = await Promise.all([searchParams, ambilToken(), ambilProfil()]);

  let banner: BannerAdmin[] = [];
  let galat: string | null = null;

  try {
    banner = await apiGet<BannerAdmin[]>('/admin/banner', { token: token ?? undefined });
  } catch (e) {
    galat = e instanceof Error ? e.message : 'Gagal memuat banner';
  }

  const bolehHapus = profil?.role === 'ADMIN';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Banner</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Slider promosi di bagian paling atas halaman home.
          </p>
        </div>
        <Link
          href="/admin/banner/baru"
          className="rounded-lg bg-merek-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-merek-800"
        >
          + Tambah Banner
        </Link>
      </div>

      {sp.pesan === 'tersimpan' && (
        <p className="rounded-lg bg-merek-50 px-4 py-3 text-sm text-merek-800">
          Banner berhasil disimpan.
        </p>
      )}

      {galat && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{galat}</p>}

      {banner.length === 0 && !galat ? (
        <div className="rounded-xl border border-neutral-200 bg-white py-16 text-center">
          <p className="text-sm text-neutral-600">
            Belum ada banner. Selama belum ada, home menampilkan hero bawaan.
          </p>
          <Link
            href="/admin/banner/baru"
            className="mt-4 inline-block rounded-lg bg-merek-700 px-4 py-2 text-sm font-semibold text-white hover:bg-merek-800"
          >
            Buat banner pertama
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {banner.map((b) => (
            <li
              key={b.id}
              className="overflow-hidden rounded-xl border border-neutral-200 bg-white sm:flex"
            >
              <div className="relative aspect-[8/3] shrink-0 bg-neutral-100 sm:aspect-auto sm:w-64">
                <Image
                  src={b.gambarUrl}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, 256px"
                  className="object-cover"
                />
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/banner/${b.id}`}
                      className="font-medium text-neutral-900 hover:text-merek-700"
                    >
                      {b.judul}
                    </Link>
                    <StatusTayang banner={b} />
                    <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-medium text-neutral-600">
                      urutan {b.urutan}
                    </span>
                  </div>

                  {b.subjudul && (
                    <p className="mt-1 line-clamp-1 text-sm text-neutral-600">{b.subjudul}</p>
                  )}

                  <p className="mt-1.5 text-xs text-neutral-500">
                    {b.teksTombol && b.tautanTombol ? (
                      <>
                        Tombol: &ldquo;{b.teksTombol}&rdquo; &rarr;{' '}
                        <code className="text-neutral-700">{b.tautanTombol}</code>
                      </>
                    ) : (
                      'Tanpa tombol'
                    )}
                    {(b.mulaiTayang || b.selesaiTayang) && (
                      <>
                        {' '}
                        &middot; Jadwal: {b.mulaiTayang ? tanggal(b.mulaiTayang) : 'sekarang'} –{' '}
                        {b.selesaiTayang ? tanggal(b.selesaiTayang) : 'seterusnya'}
                      </>
                    )}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <SakelarAktif id={b.id} aktif={b.aktif} />
                  <Link
                    href={`/admin/banner/${b.id}`}
                    className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-merek-700 hover:bg-merek-50"
                  >
                    Ubah
                  </Link>
                  {bolehHapus && <AksiBanner id={b.id} judul={b.judul} />}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Menjelaskan kenapa sebuah banner tampil atau tidak tampil saat ini. */
function StatusTayang({ banner }: { banner: BannerAdmin }) {
  if (!banner.aktif) {
    return (
      <span className="rounded-md bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-600">
        Nonaktif
      </span>
    );
  }

  const sekarang = Date.now();
  const mulai = banner.mulaiTayang ? new Date(banner.mulaiTayang).getTime() : null;
  const selesai = banner.selesaiTayang ? new Date(banner.selesaiTayang).getTime() : null;

  if (mulai && sekarang < mulai) {
    return (
      <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
        Terjadwal
      </span>
    );
  }
  if (selesai && sekarang > selesai) {
    return (
      <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
        Kedaluwarsa
      </span>
    );
  }
  return (
    <span className="rounded-md bg-merek-100 px-2 py-1 text-xs font-semibold text-merek-800">
      Tayang
    </span>
  );
}
