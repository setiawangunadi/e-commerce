import Image from 'next/image';
import Link from 'next/link';
import { rupiah } from '@/lib/format';
import { TombolBeli } from './tombol-beli';
import type { KartuProduk as TipeKartuProduk } from '@/lib/types';

interface Props {
  produk: TipeKartuProduk;
  /** Gambar produk pertama di layar diberi `priority` agar LCP lebih cepat. */
  prioritas?: boolean;
  /** Sembunyikan baris tombol beli — dipakai di daftar yang sudah padat. */
  tanpaTombol?: boolean;
}

export function KartuProduk({ produk, prioritas = false, tanpaTombol = false }: Props) {
  const habis = !produk.tersedia;

  return (
    // Kartu tidak dibungkus <Link> karena di dalamnya ada tombol beli yang
    // menuju tautan lain — menyarangkan tautan di dalam tautan tidak valid HTML
    // dan membuat pembaca layar bingung. Judul produk yang jadi tautannya.
    <article className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white transition-shadow hover:shadow-md focus-within:shadow-md">
      <Link
        href={`/produk/${produk.slug}`}
        tabIndex={-1}
        aria-hidden="true"
        className="relative aspect-square overflow-hidden bg-neutral-100"
      >
        {produk.gambarUtama ? (
          <Image
            src={produk.gambarUtama}
            alt={produk.nama}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={prioritas}
            className={`object-cover transition-transform duration-300 group-hover:scale-105 ${
              habis ? 'opacity-60' : ''
            }`}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-neutral-400">
            Tanpa gambar
          </div>
        )}

        {/* Label promosi & badge diskon ditumpuk di pojok yang sama supaya
            tidak menutupi produknya dari dua sisi berbeda. */}
        {!habis && ((produk.label ?? []).length > 0 || produk.diskonPersen !== null) && (
          <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
            {(produk.label ?? []).map((l) => (
              <span
                key={l.id}
                className="rounded-md px-2 py-1 text-xs font-semibold text-white"
                style={{ backgroundColor: l.warna }}
              >
                {l.nama}
              </span>
            ))}
            {produk.diskonPersen !== null && (
              <span className="rounded-md bg-aksen-500 px-2 py-1 text-xs font-semibold text-merek-900">
                -{produk.diskonPersen}%
              </span>
            )}
          </div>
        )}

        {habis && (
          <span className="absolute left-2 top-2 rounded-md bg-neutral-800 px-2 py-1 text-xs font-semibold text-white">
            Stok habis
          </span>
        )}

        {/* Urgensi stok tipis — hanya ditampilkan bila memang benar-benar tipis. */}
        {!habis && produk.stok > 0 && produk.stok <= 5 && (
          <span className="absolute bottom-2 left-2 rounded-md bg-white/95 px-2 py-1 text-xs font-medium text-aksen-700">
            Sisa {produk.stok}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        {produk.brand && (
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            {produk.brand.nama}
          </p>
        )}
        <h3 className="mt-1 text-sm font-medium leading-snug sm:text-base">
          <Link
            href={`/produk/${produk.slug}`}
            className="line-clamp-2 text-neutral-900 hover:text-merek-700"
          >
            {produk.nama}
          </Link>
        </h3>

        <div className="mt-auto pt-3">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-base font-semibold text-neutral-900 sm:text-lg">
              {rupiah(produk.harga)}
            </span>
            {produk.hargaCoret && (
              <span className="text-xs text-neutral-400 line-through sm:text-sm">
                {rupiah(produk.hargaCoret)}
              </span>
            )}
          </div>

          {!tanpaTombol && (
            <div className="mt-3">
              {produk.punyaVarian ? (
                // Produk bervarian tidak bisa langsung masuk keranjang dari
                // grid — pembeli harus memilih ukuran/warna dulu di detail.
                <Link
                  href={`/produk/${produk.slug}`}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-merek-700 px-2 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-merek-800"
                >
                  Pilih Varian
                </Link>
              ) : (
                <TombolBeli produk={produk} ukuran="ringkas" />
              )}

              {(produk.linkShopee || produk.linkTiktok) && produk.punyaVarian && (
                <div className="mt-1.5">
                  <TombolBeli produk={produk} ukuran="ringkas" tanpaKeranjang />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
