import Link from 'next/link';
import { KartuProduk } from './kartu-produk';
import { apiGet, apiGetWithMeta } from '@/lib/api';
import type {
  Kategori,
  KartuProduk as TipeKartuProduk,
  MerekEtalase,
  MetaPaginasi,
} from '@/lib/types';

export interface FilterKatalog {
  q?: string;
  kategori?: string;
  merek?: string;
  page?: string;
}

/**
 * Grid katalog beserta filter kategori, pencarian, dan paginasi.
 *
 * Dipakai bersama oleh /produk, /kategori/[slug], dan /cari agar ketiganya
 * tidak punya salinan logika yang bisa menyimpang satu sama lain.
 */
export async function DaftarProduk({
  filter,
  basePath = '/produk',
  /** Kategori yang sudah dikunci oleh route (mis. /kategori/tas-dompet). */
  kategoriTerkunci,
}: {
  filter: FilterKatalog;
  basePath?: string;
  kategoriTerkunci?: string;
}) {
  const halaman = Math.max(1, Number(filter.page ?? '1') || 1);
  const slugKategori = kategoriTerkunci ?? filter.kategori;

  const kueri = new URLSearchParams({ page: String(halaman), limit: '12' });
  if (filter.q) kueri.set('q', filter.q);
  if (slugKategori) kueri.set('kategori', slugKategori);
  if (filter.merek) kueri.set('merek', filter.merek);

  const [hasil, kategori, merek] = await Promise.all([
    apiGetWithMeta<TipeKartuProduk[]>(`/catalog/produk?${kueri}`, { revalidate: 60, tags: ['produk'] })
      .then((r) => ({ data: r.data, meta: r.meta as MetaPaginasi | null }))
      .catch(() => ({ data: [] as TipeKartuProduk[], meta: null })),
    apiGet<Kategori[]>('/catalog/kategori', { revalidate: 300, tags: ['kategori'] }).catch(
      () => [] as Kategori[],
    ),
    apiGet<MerekEtalase[]>('/catalog/merek', { revalidate: 300, tags: ['merek'] }).catch(
      () => [] as MerekEtalase[],
    ),
  ]);

  const produk = hasil.data;
  const meta = hasil.meta;

  /** Membentuk URL yang mempertahankan filter lain saat satu filter berubah. */
  const tautan = (ubah: Partial<FilterKatalog>) => {
    const p = new URLSearchParams();
    const q = ubah.q !== undefined ? ubah.q : filter.q;
    const k = ubah.kategori !== undefined ? ubah.kategori : filter.kategori;
    const m = ubah.merek !== undefined ? ubah.merek : filter.merek;
    if (q) p.set('q', q);
    if (k && !kategoriTerkunci) p.set('kategori', k);
    if (m) p.set('merek', m);
    if (ubah.page && ubah.page !== '1') p.set('page', ubah.page);
    const s = p.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  return (
    <div className="kontainer-toko py-8 sm:py-10">
      <form action={basePath} className="mb-6">
        {kategoriTerkunci && <input type="hidden" name="kategori" value={kategoriTerkunci} />}
        {filter.merek && <input type="hidden" name="merek" value={filter.merek} />}
        <div className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={filter.q ?? ''}
            placeholder="Cari nama produk atau merek..."
            aria-label="Cari produk"
            className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm focus:border-merek-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-merek-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-merek-800"
          >
            Cari
          </button>
        </div>
      </form>

      {!kategoriTerkunci && kategori.length > 0 && (
        <nav
          className="tanpa-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0"
          aria-label="Saring berdasarkan kategori"
        >
          <PilKategori href={tautan({ kategori: '', page: '1' })} aktif={!filter.kategori}>
            Semua
          </PilKategori>
          {kategori.map((k) => (
            <PilKategori
              key={k.id}
              href={tautan({ kategori: k.slug, page: '1' })}
              aktif={filter.kategori === k.slug}
            >
              {k.nama}
              <span className="ml-1.5 text-xs opacity-60">{k.jumlahProduk}</span>
            </PilKategori>
          ))}
        </nav>
      )}

      {/* Penyaring merek hanya berguna kalau ada lebih dari satu merek yang
          benar-benar punya produk — toko satu merek tidak perlu barisan ini. */}
      {merek.filter((m) => m.jumlahProduk > 0).length > 1 && (
        <nav
          className="tanpa-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0"
          aria-label="Saring berdasarkan merek"
        >
          <PilKategori href={tautan({ merek: '', page: '1' })} aktif={!filter.merek}>
            Semua Merek
          </PilKategori>
          {merek
            .filter((m) => m.jumlahProduk > 0)
            .map((m) => (
              <PilKategori
                key={m.id}
                href={tautan({ merek: m.slug, page: '1' })}
                aktif={filter.merek === m.slug}
              >
                {m.nama}
                <span className="ml-1.5 text-xs opacity-60">{m.jumlahProduk}</span>
              </PilKategori>
            ))}
        </nav>
      )}

      {meta && (
        <p className="mb-4 text-sm text-neutral-600">
          {meta.total === 0
            ? 'Tidak ada produk yang cocok'
            : `Menampilkan ${produk.length} dari ${meta.total} produk`}
          {filter.q && (
            <>
              {' '}
              untuk &ldquo;<strong className="text-neutral-900">{filter.q}</strong>&rdquo;
            </>
          )}
        </p>
      )}

      {produk.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 py-16 text-center">
          <p className="text-sm text-neutral-600">
            {filter.q
              ? 'Coba kata kunci lain, atau lihat semua produk kami.'
              : 'Belum ada produk di bagian ini.'}
          </p>
          <Link
            href="/produk"
            className="mt-4 inline-block rounded-lg bg-merek-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-merek-800"
          >
            Lihat semua produk
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {produk.map((p, i) => (
            <KartuProduk key={p.id} produk={p} prioritas={i < 4} />
          ))}
        </div>
      )}

      {meta && meta.totalHalaman > 1 && (
        <nav className="mt-10 flex items-center justify-between" aria-label="Paginasi">
          {halaman > 1 ? (
            <Link
              href={tautan({ page: String(halaman - 1) })}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              &larr; Sebelumnya
            </Link>
          ) : (
            <span />
          )}

          <span className="text-sm text-neutral-600">
            Halaman {meta.page} dari {meta.totalHalaman}
          </span>

          {halaman < meta.totalHalaman ? (
            <Link
              href={tautan({ page: String(halaman + 1) })}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Berikutnya &rarr;
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}

function PilKategori({
  href,
  aktif,
  children,
}: {
  href: string;
  aktif: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={aktif ? 'page' : undefined}
      className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
        aktif
          ? 'border-merek-700 bg-merek-700 text-white'
          : 'border-neutral-300 bg-white text-neutral-700 hover:border-merek-400 hover:text-merek-700'
      }`}
    >
      {children}
    </Link>
  );
}
