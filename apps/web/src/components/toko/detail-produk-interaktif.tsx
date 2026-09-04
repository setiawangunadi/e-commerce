'use client';

import Image from 'next/image';
import { useState } from 'react';
import { rupiah } from '@/lib/format';
import { TombolBeli } from './tombol-beli';
import type { ProdukPublik } from '@/lib/types';

type VarianPublik = ProdukPublik['varian'][number];

/**
 * Varian pertama yang masih ada stoknya dipilih otomatis, supaya pembeli
 * tidak perlu menebak mana yang tersedia.
 */
function varianBawaan(produk: ProdukPublik): VarianPublik | null {
  return produk.varian.find((v) => v.tersedia) ?? produk.varian[0] ?? null;
}

/**
 * Bagian detail produk yang butuh interaksi: galeri gambar dan pemilihan varian.
 * Data & teks statis tetap di Server Component induk agar JavaScript yang
 * dikirim ke browser sekecil mungkin (research/tech/01-frontend.md).
 */
export function DetailProdukInteraktif({ produk }: { produk: ProdukPublik }) {
  const [gambarAktif, setGambarAktif] = useState(0);
  // `null` berarti pembeli belum memilih apa pun, jadi varian bawaan dihitung
  // ulang dari props di setiap render. Menyimpan id bawaan ke dalam state akan
  // membekukannya pada data saat mount: halaman ini di-ISR (`revalidate = 60`),
  // sehingga kunjungan pertama setelah entri basi ter-hydrate dengan varian yang
  // ternyata sudah habis, lalu refresh router berikutnya (mis. `revalidatePath`
  // dari server action keranjang) mengunci tombol beli jadi "Varian ini habis"
  // padahal ukuran lain masih ada stoknya.
  const [varianPilihan, setVarianPilihan] = useState<string | null>(null);

  // Pilihan pembeli dihormati apa adanya — termasuk saat varian itu habis di
  // tengah sesi, karena menukar diam-diam ke ukuran lain jauh lebih berbahaya
  // daripada menampilkan "Varian ini habis". Fallback hanya untuk varian yang
  // benar-benar lenyap dari katalog.
  const varian = produk.varian.find((v) => v.id === varianPilihan) ?? varianBawaan(produk);

  // Galeri sengaja mengikuti varian yang *dipilih pembeli*, bukan `varian` di
  // atas yang punya nilai bawaan. Kalau memakai yang bawaan, pembeli yang baru
  // membuka halaman langsung disuguhi foto satu varian tertentu — padahal ia
  // belum memilih apa pun. Varian tanpa foto sendiri jatuh ke gambar umum.
  const dipilih = produk.varian.find((v) => v.id === varianPilihan) ?? null;
  const galeri = dipilih?.gambar?.length ? dipilih.gambar : produk.gambar;

  // Indeks dijaga di dalam rentang: berpindah dari varian berfoto 4 ke varian
  // berfoto 1 tidak boleh menyisakan indeks yang menunjuk ke luar array.
  const indeksGambar = Math.min(gambarAktif, Math.max(0, galeri.length - 1));
  const gambarTampil = galeri[indeksGambar] ?? null;

  function pilihVarian(id: string) {
    setVarianPilihan(id);
    setGambarAktif(0);
  }
  const hargaTampil = varian?.harga ?? produk.harga;
  const stokTampil = varian ? varian.stok : produk.stok;
  const bisaDibeli = produk.varian.length > 0 ? !!varian?.tersedia : produk.tersedia;

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
      {/* Galeri */}
      <div>
        <div className="relative aspect-square overflow-hidden rounded-xl bg-neutral-100">
          {gambarTampil ? (
            <Image
              src={gambarTampil.url}
              alt={gambarTampil.alt ?? produk.nama}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-neutral-400">
              Tanpa gambar
            </div>
          )}

          {produk.diskonPersen !== null && (
            <span className="absolute left-3 top-3 rounded-md bg-aksen-500 px-2.5 py-1 text-sm font-semibold text-merek-900">
              -{produk.diskonPersen}%
            </span>
          )}
        </div>

        {galeri.length > 1 && (
          <div className="mt-3 grid grid-cols-5 gap-2">
            {galeri.map((g, i) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGambarAktif(i)}
                aria-label={`Lihat gambar ${i + 1}`}
                aria-current={i === indeksGambar}
                className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-colors ${
                  i === indeksGambar
                    ? 'border-merek-600'
                    : 'border-transparent hover:border-neutral-300'
                }`}
              >
                <Image src={g.url} alt="" fill sizes="80px" className="object-cover" />
              </button>
            ))}
          </div>
        )}

        {dipilih?.gambar?.length ? (
          <p className="mt-2 text-xs text-neutral-500">
            Menampilkan foto varian <strong className="text-neutral-700">{dipilih.nama}</strong>
          </p>
        ) : null}
      </div>

      {/* Info & aksi */}
      <div>
        {/* `?? []` menjaga halaman tetap tampil saat entri ISR masih berisi
            muatan lama dari sebelum label ada — badge-nya cukup absen semenit,
            jauh lebih baik daripada halaman produk yang gagal render. */}
        {(produk.label ?? []).length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {(produk.label ?? []).map((l) => (
              <span
                key={l.id}
                className="rounded-md px-2.5 py-1 text-xs font-semibold text-white"
                style={{ backgroundColor: l.warna }}
              >
                {l.nama}
              </span>
            ))}
          </div>
        )}

        {produk.brand && (
          <p className="text-sm font-medium uppercase tracking-wide text-neutral-400">
            {produk.brand.nama}
          </p>
        )}

        <h1 className="mt-1 text-2xl font-semibold leading-tight tracking-tight text-neutral-900 sm:text-3xl">
          {produk.nama}
        </h1>

        {produk.deskripsiSingkat && (
          <p className="mt-3 text-base leading-relaxed text-neutral-600">
            {produk.deskripsiSingkat}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-3xl font-semibold text-neutral-900">{rupiah(hargaTampil)}</span>
          {produk.hargaCoret && (
            <span className="text-lg text-neutral-400 line-through">
              {rupiah(produk.hargaCoret)}
            </span>
          )}
        </div>

        {produk.varian.length > 0 && (
          <fieldset className="mt-6">
            <legend className="text-sm font-medium text-neutral-800">Pilih varian</legend>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {produk.varian.map((v) => {
                // Dibandingkan dengan varian hasil fallback, bukan `varianId`
                // mentah, agar tombol yang disorot selalu sama dengan varian
                // yang benar-benar dipakai harga, stok, dan tombol beli.
                const terpilih = v.id === varian?.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => pilihVarian(v.id)}
                    disabled={!v.tersedia}
                    aria-pressed={terpilih}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                      !v.tersedia
                        ? 'cursor-not-allowed border-neutral-200 bg-neutral-50 text-neutral-400 line-through'
                        : terpilih
                          ? 'border-merek-700 bg-merek-50 text-merek-800'
                          : 'border-neutral-300 text-neutral-700 hover:border-merek-400'
                    }`}
                  >
                    {v.nama}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {bisaDibeli ? (
            <span className="font-medium text-merek-700">
              Tersedia
              {stokTampil <= 5 && stokTampil > 0 && (
                <span className="ml-1 font-normal text-aksen-600">— sisa {stokTampil}</span>
              )}
            </span>
          ) : (
            <span className="font-medium text-neutral-500">
              {produk.varian.length > 0 ? 'Varian ini habis' : 'Stok habis'}
            </span>
          )}
          <span className="text-neutral-400">SKU: {varian?.sku ?? produk.sku}</span>
        </div>

        <div className="mt-6">
          <TombolBeli
            produk={{
              id: produk.id,
              nama: produk.nama,
              slug: produk.slug,
              harga: hargaTampil,
              tersedia: bisaDibeli,
              linkShopee: produk.linkShopee,
              linkTiktok: produk.linkTiktok,
            }}
            varianId={varian?.id ?? null}
            namaVarian={varian?.nama ?? null}
            butuhVarian={produk.varian.length > 0 && !varian}
          />
        </div>
      </div>
    </div>
  );
}
