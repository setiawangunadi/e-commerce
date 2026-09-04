import type { Metadata } from 'next';
import Link from 'next/link';
import { AksiMerek } from '@/components/admin/aksi-promo';
import { apiGet } from '@/lib/api';
import { ambilProfil, ambilToken } from '@/lib/sesi';
import type { MerekAdmin } from '@/lib/types';

export const metadata: Metadata = { title: 'Merek' };

export default async function HalamanDaftarMerek({
  searchParams,
}: {
  searchParams: Promise<{ pesan?: string }>;
}) {
  const [sp, token, profil] = await Promise.all([searchParams, ambilToken(), ambilProfil()]);

  let merek: MerekAdmin[] = [];
  let galat: string | null = null;

  try {
    merek = await apiGet<MerekAdmin[]>('/admin/merek', { token: token ?? undefined });
  } catch (e) {
    galat = e instanceof Error ? e.message : 'Gagal memuat merek';
  }

  const bolehUbah = profil?.role === 'ADMIN';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Merek</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Pengelompokan produk berdasarkan merek. Berbeda dari kategori: kategori menjawab
            &ldquo;barang apa&rdquo;, merek menjawab &ldquo;buatan siapa&rdquo;.
          </p>
        </div>
        {bolehUbah && (
          <Link
            href="/admin/merek/baru"
            className="rounded-lg bg-merek-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-merek-800"
          >
            + Tambah Merek
          </Link>
        )}
      </div>

      {sp.pesan === 'tersimpan' && (
        <p className="rounded-lg bg-merek-50 px-4 py-3 text-sm text-merek-800">
          Merek berhasil disimpan.
        </p>
      )}

      {galat && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{galat}</p>}

      {merek.length === 0 && !galat ? (
        <div className="rounded-xl border border-neutral-200 bg-white py-16 text-center">
          <p className="text-sm text-neutral-600">
            Belum ada merek. Buat satu, lalu pilih di form produk.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {merek.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/merek/${m.id}`}
                    className="font-medium text-neutral-900 hover:text-merek-700"
                  >
                    {m.nama}
                  </Link>
                  {!m.aktif && (
                    <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600">
                      Nonaktif
                    </span>
                  )}
                  <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-medium text-neutral-600">
                    urutan {m.urutan}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-neutral-500">
                  <code>/{m.slug}</code> &middot; {m.jumlahProduk} produk
                  {m.deskripsi && ` · ${m.deskripsi}`}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={`/admin/merek/${m.id}`}
                  className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-merek-700 hover:bg-merek-50"
                >
                  Ubah
                </Link>
                {bolehUbah && <AksiMerek id={m.id} nama={m.nama} />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
