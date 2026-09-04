'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { IkonCentang, IkonTutup } from '@/components/ikon';

interface Props {
  terbuka: boolean;
  onTutup: () => void;
  /** Nama produk yang baru masuk keranjang, bila komponen pemanggil tahu. */
  namaProduk?: string;
  namaVarian?: string | null;
  /** Total item di keranjang setelah penambahan. */
  jumlahItem?: number;
}

/**
 * Konfirmasi setelah barang masuk keranjang.
 *
 * Memakai elemen `<dialog>` bawaan browser, bukan div bertumpuk: fokus otomatis
 * terkunci di dalam dialog, tombol Esc sudah bekerja, dan dialog dirender di
 * top layer sehingga tidak pernah tertutup header sticky atau slider banner.
 */
export function DialogKeranjang({ terbuka, onTutup, namaProduk, namaVarian, jumlahItem }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (terbuka && !dialog.open) dialog.showModal();
    else if (!terbuka && dialog.open) dialog.close();
  }, [terbuka]);

  // Esc dan `dialog.close()` bawaan browser tidak lewat React, jadi state
  // pemanggil disamakan lewat event `close` agar dialog bisa dibuka lagi.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    dialog.addEventListener('close', onTutup);
    return () => dialog.removeEventListener('close', onTutup);
  }, [onTutup]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="judul-dialog-keranjang"
      // `backdrop:` menata lapisan gelap milik dialog itu sendiri; `m-auto`
      // memusatkan di layar lebar, `open:flex` supaya isinya menumpuk rapi
      // tanpa mengubah `display` saat dialog tertutup.
      className="m-auto w-[calc(100vw-2rem)] max-w-sm rounded-2xl bg-white p-0 text-left shadow-xl backdrop:bg-neutral-900/50 open:flex open:flex-col"
      // Klik di area backdrop (di luar kotak putih) menutup dialog.
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
    >
      <div className="relative p-6">
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label="Tutup"
          className="absolute right-3 top-3 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
        >
          <IkonTutup className="h-5 w-5" />
        </button>

        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-merek-50 text-merek-700">
          <IkonCentang className="h-6 w-6" />
        </div>

        <h2
          id="judul-dialog-keranjang"
          className="mt-4 text-lg font-semibold tracking-tight text-neutral-900"
        >
          Barang sudah ditambahkan ke keranjang
        </h2>

        {namaProduk && (
          <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">
            <span className="font-medium text-neutral-800">{namaProduk}</span>
            {namaVarian && <span className="text-neutral-500"> — {namaVarian}</span>}
          </p>
        )}

        {typeof jumlahItem === 'number' && jumlahItem > 0 && (
          <p className="mt-1 text-sm text-neutral-500">
            Keranjang Anda sekarang berisi {jumlahItem} barang.
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row-reverse">
          <Link
            href="/keranjang"
            className="flex flex-1 items-center justify-center rounded-lg bg-merek-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-merek-800"
          >
            Lihat Keranjang
          </Link>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="flex flex-1 items-center justify-center rounded-lg border border-neutral-300 px-4 py-3 text-sm font-semibold text-neutral-700 transition-colors hover:border-neutral-400 hover:bg-neutral-50"
          >
            Lanjut Belanja
          </button>
        </div>
      </div>
    </dialog>
  );
}
