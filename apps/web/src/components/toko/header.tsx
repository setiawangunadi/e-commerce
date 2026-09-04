'use client';

import Link from 'next/link';
import { useState } from 'react';
import { IkonAkun, IkonCari, IkonKeranjang, IkonMenu, IkonTutup } from '@/components/ikon';
import { BadgeKeranjang } from './badge-keranjang';
import { TOKO } from '@/lib/toko';
import type { Kategori } from '@/lib/types';

/**
 * Header dibuat Client Component hanya karena menu mobile butuh state buka/tutup.
 * Data kategori tetap di-fetch di Server Component induk lalu dioper sebagai prop —
 * pola "push 'use client' ke bawah" dari research/tech/01-frontend.md.
 */
export function Header({ kategori }: { kategori: Kategori[] }) {
  const [menuTerbuka, setMenuTerbuka] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur">
      {/* Bar pengumuman — kanal kepercayaan pertama yang dilihat pembeli. */}
      <div className="bg-merek-800 px-4 py-2 text-center text-xs text-merek-50 sm:text-sm">
        Gratis ongkir untuk pembelian di atas Rp300.000 &middot; Kirim ke seluruh Indonesia
      </div>

      <div className="kontainer-toko">
        <div className="flex h-16 items-center gap-3 sm:h-20 sm:gap-6">
          <button
            type="button"
            onClick={() => setMenuTerbuka(true)}
            className="-ml-2 rounded-lg p-2 text-neutral-700 hover:bg-neutral-100 lg:hidden"
            aria-label="Buka menu navigasi"
          >
            <IkonMenu className="h-6 w-6" />
          </button>

          <Link href="/" className="shrink-0">
            <span className="text-xl font-semibold tracking-tight text-merek-800 sm:text-2xl">
              {TOKO.nama}
            </span>
          </Link>

          <nav className="hidden lg:flex lg:items-center lg:gap-1" aria-label="Kategori produk">
            {kategori.slice(0, 5).map((k) => (
              <Link
                key={k.id}
                href={`/kategori/${k.slug}`}
                className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-merek-50 hover:text-merek-700"
              >
                {k.nama}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <form action="/cari" className="hidden md:block">
              <div className="relative">
                <IkonCari className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  type="search"
                  name="q"
                  placeholder="Cari produk..."
                  aria-label="Cari produk"
                  className="w-44 rounded-full border border-neutral-300 py-2 pl-9 pr-4 text-sm transition-all placeholder:text-neutral-400 focus:w-60 focus:border-merek-500 focus:outline-none lg:w-56 lg:focus:w-72"
                />
              </div>
            </form>

            <Link
              href="/cari"
              className="rounded-lg p-2 text-neutral-700 hover:bg-neutral-100 md:hidden"
              aria-label="Cari produk"
            >
              <IkonCari className="h-6 w-6" />
            </Link>
            <Link
              href="/akun"
              className="rounded-lg p-2 text-neutral-700 hover:bg-neutral-100"
              aria-label="Akun saya"
            >
              <IkonAkun className="h-6 w-6" />
            </Link>
            <Link
              href="/keranjang"
              className="relative rounded-lg p-2 text-neutral-700 hover:bg-neutral-100"
              aria-label="Keranjang belanja"
            >
              <IkonKeranjang className="h-6 w-6" />
              <BadgeKeranjang />
            </Link>
          </div>
        </div>
      </div>

      {/* Menu mobile */}
      {menuTerbuka && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-neutral-900/40"
            onClick={() => setMenuTerbuka(false)}
            aria-label="Tutup menu"
          />
          <div className="absolute inset-y-0 left-0 flex w-80 max-w-[85vw] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
              <span className="text-lg font-semibold text-merek-800">{TOKO.nama}</span>
              <button
                type="button"
                onClick={() => setMenuTerbuka(false)}
                className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100"
                aria-label="Tutup menu"
              >
                <IkonTutup className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4">
              <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Kategori
              </p>
              {kategori.map((k) => (
                <Link
                  key={k.id}
                  href={`/kategori/${k.slug}`}
                  onClick={() => setMenuTerbuka(false)}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 text-neutral-800 hover:bg-merek-50"
                >
                  <span>{k.nama}</span>
                  <span className="text-xs text-neutral-400">{k.jumlahProduk}</span>
                </Link>
              ))}

              <div className="my-4 border-t border-neutral-200" />
              <Link
                href="/produk"
                onClick={() => setMenuTerbuka(false)}
                className="block rounded-lg px-3 py-2.5 text-neutral-800 hover:bg-merek-50"
              >
                Semua Produk
              </Link>
              <Link
                href="/akun"
                onClick={() => setMenuTerbuka(false)}
                className="block rounded-lg px-3 py-2.5 text-neutral-800 hover:bg-merek-50"
              >
                Akun Saya
              </Link>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
