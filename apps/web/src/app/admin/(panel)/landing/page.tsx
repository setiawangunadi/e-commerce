import type { Metadata } from 'next';
import Link from 'next/link';
import { AksiLanding } from '@/components/admin/landing/aksi-landing';
import { apiGet } from '@/lib/api';
import { waktuRelatif } from '@/lib/format';
import { ambilProfil, ambilToken } from '@/lib/sesi';
import type { RingkasanLanding } from '@/lib/types';

export const metadata: Metadata = { title: 'Landing Page' };

const GAYA_STATUS = {
  PUBLISHED: { label: 'Terbit', kelas: 'bg-merek-100 text-merek-800' },
  DRAFT: { label: 'Draft', kelas: 'bg-neutral-100 text-neutral-600' },
  ARCHIVED: { label: 'Arsip', kelas: 'bg-amber-50 text-amber-700' },
} as const;

export default async function HalamanDaftarLanding() {
  const [token, profil] = await Promise.all([ambilToken(), ambilProfil()]);

  let daftar: RingkasanLanding[] = [];
  let galat: string | null = null;

  try {
    daftar = await apiGet<RingkasanLanding[]>('/admin/landing', { token: token ?? undefined });
  } catch (e) {
    galat = e instanceof Error ? e.message : 'Gagal memuat landing page';
  }

  const bolehHapus = profil?.role === 'ADMIN';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Landing Page</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Halaman kampanye untuk tujuan iklan Meta Ads dan Google Ads.
          </p>
        </div>
        <Link
          href="/admin/landing/baru"
          className="rounded-lg bg-merek-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-merek-800"
        >
          + Buat Landing Page
        </Link>
      </div>

      {galat && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{galat}</p>}

      {daftar.length === 0 && !galat ? (
        <div className="rounded-xl border border-neutral-200 bg-white py-16 text-center">
          <p className="text-sm text-neutral-600">Belum ada landing page.</p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-neutral-500">
            Landing page adalah halaman khusus tanpa menu toko, dirancang supaya pengunjung dari
            iklan fokus ke satu penawaran.
          </p>
          <Link
            href="/admin/landing/baru"
            className="mt-4 inline-block rounded-lg bg-merek-700 px-4 py-2 text-sm font-semibold text-white hover:bg-merek-800"
          >
            Buat yang pertama
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {daftar.map((l) => {
            const gaya = GAYA_STATUS[l.status];
            const tracking = [
              l.metaPixelId && 'Meta Pixel',
              l.ga4Id && 'GA4',
              l.googleAdsId && 'Google Ads',
            ].filter(Boolean) as string[];

            return (
              <li
                key={l.id}
                className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/landing/${l.id}`}
                      className="font-medium text-neutral-900 hover:text-merek-700"
                    >
                      {l.nama}
                    </Link>
                    <span
                      className={`rounded-md px-2 py-1 text-xs font-semibold ${gaya.kelas}`}
                    >
                      {gaya.label}
                    </span>
                    <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-medium text-neutral-600">
                      {l.jumlahBlok} blok
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-neutral-500">
                    <code className="text-neutral-700">/lp/{l.slug}</code>
                    {tracking.length > 0 ? (
                      <> &middot; Tracking: {tracking.join(', ')}</>
                    ) : (
                      <> &middot; Belum ada tracking</>
                    )}
                    {' '}&middot; diubah {waktuRelatif(l.updatedAt)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {l.status === 'PUBLISHED' && (
                    <Link
                      href={`/lp/${l.slug}`}
                      target="_blank"
                      className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
                    >
                      Lihat ↗
                    </Link>
                  )}
                  <Link
                    href={`/admin/landing/${l.id}`}
                    className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-merek-700 hover:bg-merek-50"
                  >
                    Ubah
                  </Link>
                  {bolehHapus && <AksiLanding id={l.id} nama={l.nama} />}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
