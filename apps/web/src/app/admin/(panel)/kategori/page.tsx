import type { Metadata } from 'next';
import Link from 'next/link';
import { AksiKategori } from '@/components/admin/aksi-promo';
import { apiGet } from '@/lib/api';
import { ambilProfil, ambilToken } from '@/lib/sesi';
import type { KategoriAdmin } from '@/lib/types';

export const metadata: Metadata = { title: 'Kategori' };

export default async function HalamanDaftarKategori({
  searchParams,
}: {
  searchParams: Promise<{ pesan?: string }>;
}) {
  const [sp, token, profil] = await Promise.all([searchParams, ambilToken(), ambilProfil()]);

  let kategori: KategoriAdmin[] = [];
  let galat: string | null = null;

  try {
    kategori = await apiGet<KategoriAdmin[]>('/admin/kategori', { token: token ?? undefined });
  } catch (e) {
    galat = e instanceof Error ? e.message : 'Gagal memuat kategori';
  }

  const bolehHapus = profil?.role === 'ADMIN';

  // Disusun induk dulu, lalu anaknya tepat di bawahnya — supaya hierarki
  // terbaca tanpa perlu komponen pohon.
  const induk = kategori.filter((k) => !k.parentId);
  const yatim = kategori.filter((k) => k.parentId && !induk.some((i) => i.id === k.parentId));
  const tersusun: { item: KategoriAdmin; anak: boolean }[] = [
    ...induk.flatMap((i) => [
      { item: i, anak: false },
      ...kategori.filter((k) => k.parentId === i.id).map((k) => ({ item: k, anak: true })),
    ]),
    ...yatim.map((k) => ({ item: k, anak: false })),
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Kategori</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Pengelompokan produk untuk navigasi pembeli. Bisa dua tingkat, mis. Fashion &rsaquo;
            Pakaian Pria.
          </p>
        </div>
        <Link
          href="/admin/kategori/baru"
          className="rounded-lg bg-merek-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-merek-800"
        >
          + Tambah Kategori
        </Link>
      </div>

      {sp.pesan === 'tersimpan' && (
        <p className="rounded-lg bg-merek-50 px-4 py-3 text-sm text-merek-800">
          Kategori berhasil disimpan.
        </p>
      )}

      {galat && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{galat}</p>}

      {kategori.length === 0 && !galat ? (
        <div className="rounded-xl border border-neutral-200 bg-white py-16 text-center">
          <p className="text-sm text-neutral-600">
            Belum ada kategori. Buat kategori induk dulu, mis. &ldquo;Fashion&rdquo;.
          </p>
          <Link
            href="/admin/kategori/baru"
            className="mt-4 inline-block rounded-lg bg-merek-700 px-4 py-2 text-sm font-semibold text-white hover:bg-merek-800"
          >
            Buat kategori pertama
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {tersusun.map(({ item, anak }) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className={`min-w-0 ${anak ? 'pl-5 sm:pl-8' : ''}`}>
                <div className="flex flex-wrap items-center gap-2">
                  {anak && <span className="text-neutral-300">&#8627;</span>}
                  <Link
                    href={`/admin/kategori/${item.id}`}
                    className="font-medium text-neutral-900 hover:text-merek-700"
                  >
                    {item.nama}
                  </Link>
                  {!item.aktif && (
                    <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600">
                      Nonaktif
                    </span>
                  )}
                  <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-medium text-neutral-600">
                    urutan {item.urutan}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-neutral-500">
                  <code>/{item.slug}</code> &middot; {item.jumlahProduk} produk
                  {item.jumlahAnak > 0 && ` · ${item.jumlahAnak} sub-kategori`}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={`/admin/kategori/${item.id}`}
                  className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-merek-700 hover:bg-merek-50"
                >
                  Ubah
                </Link>
                {bolehHapus && <AksiKategori id={item.id} nama={item.nama} />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
