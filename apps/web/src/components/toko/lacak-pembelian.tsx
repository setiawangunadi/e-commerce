'use client';

import { useEffect } from 'react';
import { lacakPembelian } from '@/lib/tracking';

/**
 * Mengirim event Purchase saat pesanan sudah lunas.
 *
 * Dijalankan di halaman status pesanan karena di situlah pembeli mendarat
 * setelah membayar. `lacakPembelian` menjaga agar event hanya terkirim sekali
 * per nomor pesanan — halaman ini bisa dibuka ulang kapan saja, dan konversi
 * ganda membuat laporan iklan salah.
 *
 * Catatan: ini pelacakan sisi browser, jadi bisa terhalang pemblokir iklan.
 * Untuk akurasi penuh, langkah berikutnya adalah Meta Conversions API dari
 * webhook pembayaran di sisi server.
 */
export function LacakPembelian({
  nomor,
  nilai,
  lunas,
}: {
  nomor: string;
  nilai: number;
  lunas: boolean;
}) {
  useEffect(() => {
    if (!lunas) return;
    lacakPembelian({ nomor, nilai });
  }, [nomor, nilai, lunas]);

  return null;
}
