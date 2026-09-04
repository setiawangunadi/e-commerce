'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { hapusItem, ubahJumlahItem } from '@/app/(toko)/actions-keranjang';
import { beritahuKeranjangBerubah } from './badge-keranjang';
import { rupiah } from '@/lib/format';
import type { ItemKeranjang } from '@/lib/types';

export function BarisKeranjang({ item }: { item: ItemKeranjang }) {
  const [menunggu, mulai] = useTransition();
  const [galat, setGalat] = useState<string | null>(null);
  const router = useRouter();

  function jalankan(aksi: () => Promise<{ ok: boolean; galat?: string; jumlahItem?: number }>) {
    setGalat(null);
    mulai(async () => {
      const hasil = await aksi();
      if (hasil.ok) {
        beritahuKeranjangBerubah(hasil.jumlahItem);
        // Halaman keranjang sendiri Server Component, jadi tetap perlu refresh
        // supaya subtotal & daftar item ikut diperbarui.
        router.refresh();
      } else {
        setGalat(hasil.galat ?? 'Gagal memperbarui keranjang');
      }
    });
  }

  const bermasalah = item.tidakTersedia || item.melebihiStok;

  return (
    <li
      className={`flex gap-4 p-4 ${bermasalah ? 'bg-amber-50/60' : ''} ${
        menunggu ? 'opacity-60' : ''
      }`}
    >
      <Link
        href={`/produk/${item.slug}`}
        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-neutral-100 sm:h-24 sm:w-24"
      >
        {item.gambarUrl && (
          <Image src={item.gambarUrl} alt="" fill sizes="96px" className="object-cover" />
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/produk/${item.slug}`}
              className="line-clamp-2 font-medium text-neutral-900 hover:text-merek-700"
            >
              {item.nama}
            </Link>
            {item.namaVarian && (
              <p className="mt-0.5 text-sm text-neutral-600">{item.namaVarian}</p>
            )}
            <p className="mt-0.5 text-xs text-neutral-400">{item.sku}</p>
          </div>

          <button
            type="button"
            onClick={() => jalankan(() => hapusItem(item.id))}
            disabled={menunggu}
            className="shrink-0 rounded-lg px-2 py-1 text-sm font-medium text-neutral-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          >
            Hapus
          </button>
        </div>

        {item.tidakTersedia && (
          <p className="mt-2 text-sm font-medium text-amber-700">
            Produk ini sudah tidak dijual. Hapus dari keranjang untuk melanjutkan.
          </p>
        )}
        {!item.tidakTersedia && item.melebihiStok && (
          <p className="mt-2 text-sm font-medium text-amber-700">
            Stok tinggal {item.stokTersedia}. Kurangi jumlahnya untuk melanjutkan.
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-3">
          <div className="inline-flex items-center rounded-lg border border-neutral-300">
            <button
              type="button"
              onClick={() => jalankan(() => ubahJumlahItem(item.id, item.jumlah - 1))}
              disabled={menunggu || item.tidakTersedia}
              aria-label="Kurangi jumlah"
              className="px-3 py-1.5 text-lg leading-none text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
            >
              &minus;
            </button>
            <span className="min-w-10 border-x border-neutral-300 px-3 py-1.5 text-center text-sm font-medium tabular-nums">
              {item.jumlah}
            </span>
            <button
              type="button"
              onClick={() => jalankan(() => ubahJumlahItem(item.id, item.jumlah + 1))}
              disabled={menunggu || item.tidakTersedia || item.jumlah >= item.stokTersedia}
              aria-label="Tambah jumlah"
              className="px-3 py-1.5 text-lg leading-none text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
            >
              +
            </button>
          </div>

          <div className="text-right">
            <p className="font-semibold text-neutral-900">{rupiah(item.subtotal)}</p>
            {item.jumlah > 1 && (
              <p className="text-xs text-neutral-500">{rupiah(item.harga)} / buah</p>
            )}
          </div>
        </div>

        {galat && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {galat}
          </p>
        )}
      </div>
    </li>
  );
}
