'use client';

import { useState, useTransition } from 'react';
import { tambahKeKeranjang } from '@/app/(toko)/actions-keranjang';
import { IkonKeranjang } from '@/components/ikon';
import { beritahuKeranjangBerubah } from './badge-keranjang';
import { DialogKeranjang } from './dialog-keranjang';

interface Props {
  produkId: string;
  varianId?: string | null;
  jumlah?: number;
  tersedia: boolean;
  ukuran?: 'penuh' | 'ringkas';
  /** Ditampilkan saat produk bervarian tapi belum ada varian dipilih. */
  butuhVarian?: boolean;
  /** Dipakai di dialog konfirmasi setelah barang masuk keranjang. */
  namaProduk?: string;
  namaVarian?: string | null;
}

export function TombolKeranjang({
  produkId,
  varianId,
  jumlah = 1,
  tersedia,
  ukuran = 'penuh',
  butuhVarian = false,
  namaProduk,
  namaVarian,
}: Props) {
  const ringkas = ukuran === 'ringkas';
  const [menunggu, mulai] = useTransition();
  const [galat, setGalat] = useState<string | null>(null);
  const [berhasil, setBerhasil] = useState(false);
  const [dialogTerbuka, setDialogTerbuka] = useState(false);
  const [jumlahDiKeranjang, setJumlahDiKeranjang] = useState<number | undefined>(undefined);

  function tambah() {
    setGalat(null);
    mulai(async () => {
      const hasil = await tambahKeKeranjang({ produkId, varianId, jumlah });
      if (hasil.ok) {
        setBerhasil(true);
        setJumlahDiKeranjang(hasil.jumlahItem);
        setDialogTerbuka(true);
        beritahuKeranjangBerubah(hasil.jumlahItem);
        setTimeout(() => setBerhasil(false), 2200);
      } else {
        setGalat(hasil.galat ?? 'Gagal menambahkan');
      }
    });
  }

  if (!tersedia) {
    return (
      <span
        className={
          ringkas
            ? 'flex w-full items-center justify-center rounded-lg bg-neutral-200 px-2 py-2.5 text-xs font-semibold text-neutral-500'
            : 'flex w-full items-center justify-center rounded-lg bg-neutral-200 px-6 py-3.5 text-sm font-semibold text-neutral-500 sm:text-base'
        }
      >
        Stok Habis
      </span>
    );
  }

  const nonaktif = menunggu || butuhVarian;

  return (
    <div className={ringkas ? '' : 'space-y-2'}>
      <button
        type="button"
        onClick={tambah}
        disabled={nonaktif}
        aria-live="polite"
        className={`${
          ringkas
            ? 'flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-xs font-semibold transition-colors'
            : 'flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3.5 text-sm font-semibold transition-colors sm:text-base'
        } ${
          berhasil
            ? 'bg-merek-600 text-white'
            : 'bg-merek-700 text-white hover:bg-merek-800 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500'
        }`}
      >
        <IkonKeranjang className={ringkas ? 'h-3.5 w-3.5 shrink-0' : 'h-5 w-5 shrink-0'} />
        <span className="truncate">
          {berhasil
            ? 'Masuk keranjang'
            : menunggu
              ? 'Menambahkan...'
              : butuhVarian
                ? 'Pilih varian dulu'
                : ringkas
                  ? 'Keranjang'
                  : 'Tambah ke Keranjang'}
        </span>
      </button>

      {galat && (
        <p role="alert" className={`text-red-600 ${ringkas ? 'mt-1 text-[11px]' : 'text-xs'}`}>
          {galat}
        </p>
      )}

      <DialogKeranjang
        terbuka={dialogTerbuka}
        onTutup={() => setDialogTerbuka(false)}
        namaProduk={namaProduk}
        namaVarian={namaVarian}
        jumlahItem={jumlahDiKeranjang}
      />
    </div>
  );
}
