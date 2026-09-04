import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { IkonChat, IkonKembali, IkonPerisai, IkonTruk } from '@/components/ikon';
import { BannerSlider } from '@/components/toko/banner-slider';
import { JudulBagian } from '@/components/toko/judul-bagian';
import { KartuProduk } from '@/components/toko/kartu-produk';
import { apiGet } from '@/lib/api';
import { TOKO } from '@/lib/toko';
import type { DataBeranda } from '@/lib/types';

export const metadata: Metadata = {
  // `absolute` agar tidak ikut template "%s | Nama Toko" dari root layout.
  title: { absolute: `${TOKO.nama} — ${TOKO.tagline}` },
  description: `Belanja ${TOKO.tagline.toLowerCase()} di ${TOKO.nama}. Kirim ke seluruh Indonesia, bayar lewat QRIS, transfer bank, e-wallet, atau COD.`,
  alternates: { canonical: '/' },
};

/**
 * Home di-render statis dengan revalidasi 60 detik (ISR), sesuai strategi
 * rendering di research/tech/01-frontend.md — halaman ini butuh cepat dan
 * SEO-friendly, sementara harga/stok tidak perlu real-time detik demi detik.
 */
export const revalidate = 60;

export default async function HalamanBeranda() {
  let data: DataBeranda | null = null;
  let galat: string | null = null;

  try {
    data = await apiGet<DataBeranda>('/catalog/beranda', {
      revalidate: 60,
      tags: ['beranda', 'produk'],
    });
  } catch (e) {
    galat = e instanceof Error ? e.message : 'Gagal memuat data';
  }

  if (!data) {
    return (
      <div className="kontainer-toko py-24 text-center">
        <h1 className="text-2xl font-semibold text-neutral-900">Katalog belum bisa dimuat</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-neutral-600">
          Pastikan API sedang berjalan di <code className="rounded bg-neutral-100 px-1.5 py-0.5">{process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}</code>.
        </p>
        {galat && <p className="mt-2 text-xs text-neutral-400">Detail: {galat}</p>}
      </div>
    );
  }

  const { banner, kategori, produkUnggulan, produkTerbaru, totalProduk } = data;

  return (
    <>
      {/* Hero statis dipakai sebagai cadangan bila admin belum membuat banner
          apa pun — home tidak boleh tampil kosong di bagian paling atas. */}
      {banner.length > 0 ? (
        <BannerSlider banner={banner} />
      ) : (
        <Hero totalProduk={totalProduk} jumlahKategori={kategori.length} />
      )}
      <PitaKepercayaan />

      {kategori.length > 0 && (
        <section className="kontainer-toko py-12 sm:py-16">
          <JudulBagian
            judul="Belanja per Kategori"
            deskripsi="Temukan yang Anda cari lebih cepat"
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
            {kategori.map((k) => (
              <Link
                key={k.id}
                href={`/kategori/${k.slug}`}
                className="group relative aspect-4/3 overflow-hidden rounded-xl bg-neutral-100"
              >
                {k.gambarUrl && (
                  <Image
                    src={k.gambarUrl}
                    alt={k.nama}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-linear-to-t from-neutral-900/75 to-neutral-900/10" />
                <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                  <p className="text-sm font-semibold text-white sm:text-base">{k.nama}</p>
                  <p className="text-xs text-white/75">{k.jumlahProduk} produk</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {produkUnggulan.length > 0 && (
        <section className="kontainer-toko py-12 sm:py-16">
          <JudulBagian
            judul="Produk Unggulan"
            deskripsi="Pilihan terbaik yang paling sering dibeli"
            tautan={{ href: '/produk', label: 'Lihat semua produk' }}
          />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {produkUnggulan.map((p, i) => (
              <KartuProduk key={p.id} produk={p} prioritas={i < 2} />
            ))}
          </div>
        </section>
      )}

      <PromoSpanduk />

      {produkTerbaru.length > 0 && (
        <section className="kontainer-toko py-12 sm:py-16">
          <JudulBagian
            judul="Baru Masuk"
            deskripsi="Produk yang baru saja ditambahkan ke katalog"
            tautan={{ href: '/produk', label: 'Lihat semua produk' }}
          />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {produkTerbaru.map((p) => (
              <KartuProduk key={p.id} produk={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------

function Hero({ totalProduk, jumlahKategori }: { totalProduk: number; jumlahKategori: number }) {
  return (
    <section className="relative overflow-hidden bg-merek-800">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 30%, #5b9b7e 0%, transparent 45%), radial-gradient(circle at 80% 70%, #c96442 0%, transparent 40%)',
        }}
        aria-hidden="true"
      />

      <div className="kontainer-toko relative py-16 sm:py-24 lg:py-28">
        <div className="max-w-2xl">
          <p className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-merek-50 sm:text-sm">
            Buatan lokal &middot; Kirim ke seluruh Indonesia
          </p>

          <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
            {TOKO.tagline}
          </h1>

          <p className="mt-4 max-w-xl text-base leading-relaxed text-merek-100 sm:text-lg">
            Produk dipilih sendiri, dikirim langsung dari gudang kami. Tanpa perantara, tanpa
            markup marketplace.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/produk"
              className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-merek-800 transition-colors hover:bg-merek-50 sm:text-base"
            >
              Mulai Belanja
            </Link>
            <Link
              href="/bantuan/cara-belanja"
              className="rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:text-base"
            >
              Cara Belanja
            </Link>
          </div>

          <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
            <div>
              <dt className="text-xs uppercase tracking-wide text-merek-200">Produk</dt>
              <dd className="text-2xl font-semibold text-white">{totalProduk}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-merek-200">Kategori</dt>
              <dd className="text-2xl font-semibold text-white">{jumlahKategori}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-merek-200">Pengiriman</dt>
              <dd className="text-2xl font-semibold text-white">34 provinsi</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}

/**
 * Sinyal kepercayaan diletakkan tepat di bawah hero — untuk toko non-marketplace,
 * kepercayaan adalah hambatan konversi utama (research/business/01-customer-journey.md).
 */
function PitaKepercayaan() {
  const poin = [
    { Ikon: IkonTruk, judul: 'Kirim dari gudang sendiri', isi: 'Dikemas & dikirim H+1 hari kerja' },
    { Ikon: IkonKembali, judul: 'Retur 7 hari', isi: 'Barang tidak sesuai? Bisa dikembalikan' },
    { Ikon: IkonPerisai, judul: 'Pembayaran aman', isi: 'QRIS, VA bank, e-wallet, dan COD' },
    { Ikon: IkonChat, judul: 'Dibalas cepat', isi: 'Tanya via WhatsApp, jam 08.00–20.00 WIB' },
  ];

  return (
    <section className="border-b border-neutral-200 bg-neutral-50">
      <div className="kontainer-toko py-6 sm:py-8">
        <ul className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {poin.map(({ Ikon, judul, isi }) => (
            <li key={judul} className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0 rounded-lg bg-merek-100 p-2 text-merek-700">
                <Ikon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-900">{judul}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-neutral-600">{isi}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function PromoSpanduk() {
  return (
    <section className="kontainer-toko">
      <div className="overflow-hidden rounded-2xl bg-aksen-500">
        <div className="flex flex-col items-start gap-6 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-12">
          <div className="max-w-xl">
            <h2 className="text-2xl font-semibold tracking-tight text-merek-900 sm:text-3xl">
              Gratis ongkir mulai Rp300.000
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-merek-800 sm:text-base">
              Berlaku untuk pengiriman reguler ke seluruh Indonesia. Ongkir dihitung otomatis
              saat checkout berdasarkan berat dan alamat tujuan.
            </p>
          </div>
          <Link
            href="/produk"
            className="shrink-0 rounded-lg bg-merek-800 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-merek-900 sm:text-base"
          >
            Belanja Sekarang
          </Link>
        </div>
      </div>
    </section>
  );
}
