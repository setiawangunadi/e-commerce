import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { IkonKembali, IkonPerisai, IkonTruk } from '@/components/ikon';
import { DetailProdukInteraktif } from '@/components/toko/detail-produk-interaktif';
import { JudulBagian } from '@/components/toko/judul-bagian';
import { KartuProduk } from '@/components/toko/kartu-produk';
import { ApiError, apiGet, apiGetWithMeta } from '@/lib/api';
import { berat as formatBerat } from '@/lib/format';
import { TOKO } from '@/lib/toko';
import type { KartuProduk as TipeKartuProduk, ProdukPublik } from '@/lib/types';

export const revalidate = 60;

async function ambilProduk(slug: string): Promise<ProdukPublik | null> {
  try {
    return await apiGet<ProdukPublik>(`/catalog/produk/${slug}`, {
      revalidate: 60,
      tags: ['produk', `produk-${slug}`],
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const produk = await ambilProduk(slug);
  if (!produk) return { title: 'Produk tidak ditemukan' };

  const deskripsi =
    produk.metaDescription ?? produk.deskripsiSingkat ?? `${produk.nama} — tersedia di ${TOKO.nama}.`;

  return {
    // Meta title yang diisi admin dipakai utuh (`absolute`) karena biasanya
    // sudah memuat nama toko; kalau kosong, nama produk dilewatkan ke template
    // "%s | Nama Toko" dari root layout.
    title: produk.metaTitle ? { absolute: produk.metaTitle } : produk.nama,
    description: deskripsi,
    alternates: { canonical: `/produk/${produk.slug}` },
    openGraph: {
      title: produk.metaTitle ?? produk.nama,
      description: deskripsi,
      type: 'website',
      images: produk.gambar[0] ? [{ url: produk.gambar[0].url, alt: produk.nama }] : undefined,
    },
  };
}

export default async function HalamanDetailProduk({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const produk = await ambilProduk(slug);
  if (!produk) notFound();

  // Produk lain dari kategori yang sama, untuk cross-sell sederhana.
  let terkait: TipeKartuProduk[] = [];
  if (produk.kategori) {
    try {
      const hasil = await apiGetWithMeta<TipeKartuProduk[]>(
        `/catalog/produk?kategori=${produk.kategori.slug}&limit=5`,
        { revalidate: 60, tags: ['produk'] },
      );
      terkait = hasil.data.filter((p) => p.id !== produk.id).slice(0, 4);
    } catch {
      // Produk terkait bersifat pelengkap — kegagalannya tidak boleh
      // menjatuhkan halaman detail yang jadi tujuan utama pembeli.
    }
  }

  return (
    <>
      <script
        type="application/ld+json"
        // Structured data agar harga & ketersediaan muncul di hasil pencarian Google
        // (research/tech/14-performance-seo-technical.md).
        dangerouslySetInnerHTML={{ __html: JSON.stringify(dataTerstruktur(produk)) }}
      />

      <div className="border-b border-neutral-200 bg-neutral-50">
        <div className="kontainer-toko py-4">
          <nav className="text-sm text-neutral-500" aria-label="Remah roti">
            <Link href="/" className="hover:text-merek-700">
              Beranda
            </Link>
            <span className="mx-2">/</span>
            <Link href="/produk" className="hover:text-merek-700">
              Produk
            </Link>
            {produk.kategori && (
              <>
                <span className="mx-2">/</span>
                <Link href={`/kategori/${produk.kategori.slug}`} className="hover:text-merek-700">
                  {produk.kategori.nama}
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>

      <div className="kontainer-toko py-8 sm:py-12">
        <DetailProdukInteraktif produk={produk} />

        <div className="mt-10 grid gap-8 lg:mt-14 lg:grid-cols-3 lg:gap-12">
          <div className="lg:col-span-2">
            {produk.deskripsi && (
              <section>
                <h2 className="text-lg font-semibold text-neutral-900">Deskripsi Produk</h2>
                <div className="mt-3 space-y-3 text-sm leading-relaxed text-neutral-700 sm:text-base">
                  {produk.deskripsi.split('\n').map((paragraf, i) => (
                    <p key={i}>{paragraf}</p>
                  ))}
                </div>
              </section>
            )}

            <section className="mt-8">
              <h2 className="text-lg font-semibold text-neutral-900">Spesifikasi</h2>
              <dl className="mt-3 divide-y divide-neutral-100 border-y border-neutral-100 text-sm">
                <Spesifikasi label="SKU" nilai={produk.sku} />
                {produk.brand && <Spesifikasi label="Merek" nilai={produk.brand.nama} />}
                {produk.kategori && <Spesifikasi label="Kategori" nilai={produk.kategori.nama} />}
                <Spesifikasi label="Berat" nilai={formatBerat(produk.berat)} />
                {produk.varian.length > 0 && (
                  <Spesifikasi
                    label="Varian tersedia"
                    nilai={produk.varian
                      .filter((v) => v.tersedia)
                      .map((v) => v.nama)
                      .join(', ')}
                  />
                )}
              </dl>
            </section>
          </div>

          <aside className="space-y-4">
            <JaminanToko />
          </aside>
        </div>

        {terkait.length > 0 && (
          <section className="mt-14 border-t border-neutral-200 pt-10">
            <JudulBagian
              judul="Produk Serupa"
              deskripsi={`Pilihan lain dari kategori ${produk.kategori?.nama ?? 'ini'}`}
              tautan={
                produk.kategori
                  ? { href: `/kategori/${produk.kategori.slug}`, label: 'Lihat kategori' }
                  : undefined
              }
            />
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {terkait.map((p) => (
                <KartuProduk key={p.id} produk={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------

function Spesifikasi({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="flex gap-4 py-2.5">
      <dt className="w-36 shrink-0 text-neutral-500">{label}</dt>
      <dd className="text-neutral-800">{nilai}</dd>
    </div>
  );
}

function JaminanToko() {
  const poin = [
    { Ikon: IkonTruk, judul: 'Dikirim H+1 hari kerja', isi: 'Dari gudang kami, ke seluruh Indonesia' },
    { Ikon: IkonKembali, judul: 'Retur 7 hari', isi: 'Barang tidak sesuai bisa dikembalikan' },
    { Ikon: IkonPerisai, judul: 'Pembayaran aman', isi: 'QRIS, VA bank, e-wallet, dan COD' },
  ];

  return (
    <ul className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      {poin.map(({ Ikon, judul, isi }) => (
        <li key={judul} className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0 rounded-lg bg-white p-2 text-merek-700">
            <Ikon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-neutral-900">{judul}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-neutral-600">{isi}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function dataTerstruktur(produk: ProdukPublik) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: produk.nama,
    description: produk.deskripsiSingkat ?? produk.deskripsi ?? undefined,
    sku: produk.sku,
    brand: produk.brand ? { '@type': 'Brand', name: produk.brand.nama } : undefined,
    image: produk.gambar.map((g) => g.url),
    offers: {
      '@type': 'Offer',
      url: `${TOKO.url}/produk/${produk.slug}`,
      priceCurrency: 'IDR',
      price: produk.harga,
      availability: produk.tersedia
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: TOKO.nama },
    },
  };
}
