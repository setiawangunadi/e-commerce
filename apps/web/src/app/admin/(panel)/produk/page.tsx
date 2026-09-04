import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { LencanaStatus } from '@/components/admin/lencana-status';
import { TombolHapus } from '@/components/admin/tombol-hapus';
import { apiGetWithMeta } from '@/lib/api';
import { berat as formatBerat, rupiah, waktuRelatif } from '@/lib/format';
import { ambilProfil, ambilToken } from '@/lib/sesi';
import type { MetaPaginasi, ProdukAdmin, StatusProduk } from '@/lib/types';

export const metadata: Metadata = { title: 'Produk' };

const FILTER_STATUS: { nilai: string; label: string }[] = [
  { nilai: '', label: 'Semua' },
  { nilai: 'PUBLISHED', label: 'Terbit' },
  { nilai: 'DRAFT', label: 'Draft' },
  { nilai: 'ARCHIVED', label: 'Arsip' },
];

export default async function HalamanDaftarProduk({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; pesan?: string }>;
}) {
  const sp = await searchParams;
  const [token, profil] = await Promise.all([ambilToken(), ambilProfil()]);

  const halaman = Math.max(1, Number(sp.page ?? '1') || 1);
  const kueri = new URLSearchParams({ page: String(halaman), limit: '20' });
  if (sp.q) kueri.set('q', sp.q);
  if (sp.status) kueri.set('status', sp.status);

  let produk: ProdukAdmin[] = [];
  let meta: MetaPaginasi | null = null;
  let galat: string | null = null;

  try {
    const hasil = await apiGetWithMeta<ProdukAdmin[]>(`/admin/produk?${kueri}`, {
      token: token ?? undefined,
    });
    produk = hasil.data;
    meta = hasil.meta as MetaPaginasi | null;
  } catch (e) {
    galat = e instanceof Error ? e.message : 'Gagal memuat produk';
  }

  const bolehHapus = profil?.role === 'ADMIN';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Produk</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {meta ? `${meta.total} produk di katalog` : 'Kelola katalog toko'}
          </p>
        </div>
        <Link
          href="/admin/produk/baru"
          className="rounded-lg bg-merek-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-merek-800"
        >
          + Tambah Produk
        </Link>
      </div>

      {sp.pesan === 'tersimpan' && (
        <p className="rounded-lg bg-merek-50 px-4 py-3 text-sm text-merek-800">
          Produk berhasil disimpan.
        </p>
      )}

      {/* Filter — form GET biasa, tidak butuh JavaScript sama sekali. */}
      <form className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-white p-3">
        <input
          type="search"
          name="q"
          defaultValue={sp.q ?? ''}
          placeholder="Cari nama, SKU, atau brand..."
          aria-label="Cari produk"
          className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-merek-500 focus:outline-none"
        />
        <select
          name="status"
          defaultValue={sp.status ?? ''}
          aria-label="Filter status"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-merek-500 focus:outline-none"
        >
          {FILTER_STATUS.map((f) => (
            <option key={f.nilai} value={f.nilai}>
              {f.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Terapkan
        </button>
      </form>

      {galat && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{galat}</p>
      )}

      {produk.length === 0 && !galat ? (
        <div className="rounded-xl border border-neutral-200 bg-white py-16 text-center">
          <p className="text-sm text-neutral-600">
            {sp.q || sp.status ? 'Tidak ada produk yang cocok dengan filter.' : 'Belum ada produk.'}
          </p>
          <Link
            href="/admin/produk/baru"
            className="mt-4 inline-block rounded-lg bg-merek-700 px-4 py-2 text-sm font-semibold text-white hover:bg-merek-800"
          >
            Tambah produk pertama
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {/* Tabel di layar lebar */}
          <table className="hidden w-full text-left text-sm lg:table">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Produk</th>
                <th className="px-4 py-3 font-semibold">Harga</th>
                <th className="px-4 py-3 font-semibold">Stok</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Diubah</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {produk.map((p) => (
                <tr key={p.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                        {p.gambar[0] && (
                          <Image
                            src={p.gambar[0].url}
                            alt=""
                            fill
                            sizes="44px"
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/admin/produk/${p.id}`}
                          className="block truncate font-medium text-neutral-900 hover:text-merek-700"
                        >
                          {p.nama}
                        </Link>
                        <p className="truncate text-xs text-neutral-500">
                          {p.sku} &middot; {p.kategori?.nama ?? 'Tanpa kategori'} &middot;{' '}
                          {formatBerat(p.berat)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-neutral-900">{rupiah(p.harga)}</p>
                    {p.hargaCoret && (
                      <p className="text-xs text-neutral-400 line-through">{rupiah(p.hargaCoret)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <SelStok produk={p} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <LencanaStatus status={p.status} />
                      {p.unggulan && (
                        <span className="rounded-md bg-aksen-50 px-2 py-1 text-xs font-semibold text-aksen-700">
                          Unggulan
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-500">
                    {waktuRelatif(p.updatedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/produk/${p.id}`}
                        className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-merek-700 hover:bg-merek-50"
                      >
                        Ubah
                      </Link>
                      {bolehHapus && <TombolHapus id={p.id} nama={p.nama} />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Kartu di layar sempit */}
          <ul className="divide-y divide-neutral-100 lg:hidden">
            {produk.map((p) => (
              <li key={p.id} className="p-4">
                <div className="flex gap-3">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                    {p.gambar[0] && (
                      <Image src={p.gambar[0].url} alt="" fill sizes="64px" className="object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/produk/${p.id}`}
                      className="block font-medium text-neutral-900"
                    >
                      {p.nama}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-neutral-500">{p.sku}</p>
                    <p className="mt-1 text-sm font-semibold text-neutral-900">{rupiah(p.harga)}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <LencanaStatus status={p.status} />
                      <SelStok produk={p} />
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <Link
                    href={`/admin/produk/${p.id}`}
                    className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700"
                  >
                    Ubah
                  </Link>
                  {bolehHapus && <TombolHapus id={p.id} nama={p.nama} />}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {meta && meta.totalHalaman > 1 && (
        <nav className="flex items-center justify-between" aria-label="Paginasi">
          <TautanHalaman sp={sp} halaman={halaman - 1} nonaktif={halaman <= 1}>
            &larr; Sebelumnya
          </TautanHalaman>
          <span className="text-sm text-neutral-600">
            Halaman {meta.page} dari {meta.totalHalaman}
          </span>
          <TautanHalaman sp={sp} halaman={halaman + 1} nonaktif={halaman >= meta.totalHalaman}>
            Berikutnya &rarr;
          </TautanHalaman>
        </nav>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function SelStok({ produk }: { produk: ProdukAdmin }) {
  const punyaVarian = produk.varian.length > 0;

  if (produk.stok === 0) {
    return (
      <span className="rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
        Habis
      </span>
    );
  }

  return (
    <span
      className={`rounded-md px-2 py-1 text-xs font-semibold ${
        produk.stokMenipis ? 'bg-amber-50 text-amber-700' : 'bg-neutral-100 text-neutral-700'
      }`}
    >
      {produk.stok}
      {punyaVarian && ` (${produk.varian.length} varian)`}
    </span>
  );
}

function TautanHalaman({
  sp,
  halaman,
  nonaktif,
  children,
}: {
  sp: { q?: string; status?: string };
  halaman: number;
  nonaktif: boolean;
  children: React.ReactNode;
}) {
  if (nonaktif) {
    return <span className="text-sm text-neutral-400">{children}</span>;
  }

  const kueri = new URLSearchParams({ page: String(halaman) });
  if (sp.q) kueri.set('q', sp.q);
  if (sp.status) kueri.set('status', sp.status);

  return (
    <Link
      href={`/admin/produk?${kueri}`}
      className="text-sm font-medium text-merek-700 hover:text-merek-800"
    >
      {children}
    </Link>
  );
}
