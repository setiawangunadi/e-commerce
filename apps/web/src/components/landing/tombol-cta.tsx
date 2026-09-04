'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { tambahKeKeranjang } from '@/app/(toko)/actions-keranjang';
import { beritahuKeranjangBerubah } from '@/components/toko/badge-keranjang';
import { lacakMulaiCheckout, lacakTambahKeranjang } from '@/lib/tracking';
import type { KartuProduk, TombolCta } from '@/lib/types';

/**
 * Tombol aksi landing page. Perilakunya ditentukan admin per tombol:
 *
 * - `checkout`  — masukkan ke keranjang lalu langsung ke halaman checkout.
 *                 Melewati halaman keranjang; untuk kampanye iklan, setiap
 *                 langkah tambahan menurunkan konversi.
 * - `keranjang` — masukkan ke keranjang, pembeli lanjut sendiri.
 * - `tautan`    — pindah ke halaman internal.
 */
export function TombolCtaLanding({
  tombol,
  produk,
  warnaAksen,
  penuh = false,
}: {
  tombol: TombolCta;
  /** Produk yang ikut dimuat halaman, untuk data event & validasi. */
  produk: KartuProduk[];
  warnaAksen: string;
  penuh?: boolean;
}) {
  const [menunggu, mulai] = useTransition();
  const [galat, setGalat] = useState<string | null>(null);
  const router = useRouter();

  const aksi = tombol.aksi;
  const kelas = `inline-flex items-center justify-center rounded-lg px-8 py-4 text-base font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 ${
    penuh ? 'w-full' : ''
  }`;

  if (aksi.tipe === 'tautan') {
    return (
      <Link href={aksi.url ?? '/produk'} className={kelas} style={{ backgroundColor: warnaAksen }}>
        {tombol.teks}
      </Link>
    );
  }

  const target = produk.find((p) => p.id === aksi.produkId) ?? null;

  function jalankan() {
    setGalat(null);

    mulai(async () => {
      const hasil = await tambahKeKeranjang({
        produkId: aksi.produkId!,
        varianId: aksi.varianId,
        jumlah: aksi.jumlah,
      });

      if (!hasil.ok) {
        setGalat(hasil.galat ?? 'Gagal memproses. Coba lagi.');
        return;
      }

      beritahuKeranjangBerubah(hasil.jumlahItem);

      if (target) {
        lacakTambahKeranjang({
          id: target.id,
          nama: target.nama,
          harga: target.harga,
          jumlah: aksi.jumlah,
        });
      }

      if (aksi.tipe === 'checkout') {
        if (target) lacakMulaiCheckout(target.harga * aksi.jumlah);
        router.push('/checkout');
      } else {
        router.push('/keranjang');
      }
    });
  }

  const habis = target ? !target.tersedia : false;

  return (
    <div className={penuh ? 'w-full' : ''}>
      <button
        type="button"
        onClick={jalankan}
        disabled={menunggu || habis}
        className={kelas}
        style={{ backgroundColor: habis ? '#a3a3a3' : warnaAksen }}
      >
        {habis ? 'Stok Habis' : menunggu ? 'Memproses...' : tombol.teks}
      </button>

      {galat && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {galat}
        </p>
      )}
    </div>
  );
}
