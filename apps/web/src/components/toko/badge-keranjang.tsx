'use client';

import { useEffect, useState } from 'react';
import { ambilJumlahItemKeranjang } from '@/app/(toko)/actions-keranjang';

/** Nama event yang dipancarkan setiap kali isi keranjang berubah. */
export const EVENT_KERANJANG = 'keranjang:berubah';

/** Dipanggil komponen mana pun setelah berhasil mengubah keranjang. */
export function beritahuKeranjangBerubah(jumlahItem?: number): void {
  window.dispatchEvent(new CustomEvent(EVENT_KERANJANG, { detail: jumlahItem }));
}

/**
 * Badge jumlah item di ikon keranjang.
 *
 * Dibaca dari client agar halaman etalase tetap bisa di-prerender statis —
 * membaca cookie di Server Component induk akan mematikan ISR untuk seluruh
 * etalase, termasuk home dan katalog.
 */
export function BadgeKeranjang() {
  const [jumlah, setJumlah] = useState<number | null>(null);

  useEffect(() => {
    let dibatalkan = false;

    async function muat() {
      try {
        const n = await ambilJumlahItemKeranjang();
        if (!dibatalkan) setJumlah(n);
      } catch {
        // Badge bersifat pelengkap — kegagalannya tidak perlu ditampilkan.
      }
    }

    void muat();

    function tanganiPerubahan(e: Event) {
      const detail = (e as CustomEvent<number | undefined>).detail;
      // Jumlah dari hasil aksi dipakai langsung bila ada, supaya badge berubah
      // seketika tanpa menunggu satu putaran permintaan lagi.
      if (typeof detail === 'number') setJumlah(detail);
      else void muat();
    }

    window.addEventListener(EVENT_KERANJANG, tanganiPerubahan);
    return () => {
      dibatalkan = true;
      window.removeEventListener(EVENT_KERANJANG, tanganiPerubahan);
    };
  }, []);

  if (jumlah === null || jumlah === 0) return null;

  return (
    <span
      aria-label={`${jumlah} item di keranjang`}
      className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-aksen-500 px-1 text-[11px] font-semibold text-merek-900"
    >
      {jumlah > 99 ? '99+' : jumlah}
    </span>
  );
}
