'use client';

import { useState } from 'react';
import { EditorGambar, type GambarForm } from './editor-gambar';
import type { Varian } from '@/lib/types';

export interface VarianForm {
  nama: string;
  sku: string;
  harga: number | null;
  stok: number;
  aktif: boolean;
  /** Kosong = varian ini memakai gambar umum produk. */
  gambar: GambarForm[];
}

/**
 * Varian produk (ukuran, warna, kombinasi). Tiap varian punya SKU & stok sendiri
 * sesuai research/business/02-catalog-inventory.md. Bila produk punya varian,
 * stok produk induk diabaikan dan dihitung dari total stok varian.
 */
export function EditorVarian({
  awal,
  skuProduk,
  onBerubah,
}: {
  awal: Varian[];
  skuProduk: string;
  onBerubah: (varian: VarianForm[]) => void;
}) {
  const [varian, setVarian] = useState<VarianForm[]>(
    awal.map((v) => ({
      nama: v.nama,
      sku: v.sku,
      harga: v.harga,
      stok: v.stok,
      aktif: v.aktif ?? true,
      gambar: (v.gambar ?? []).map((g) => ({ url: g.url, alt: g.alt })),
    })),
  );


  function perbarui(baru: VarianForm[]) {
    setVarian(baru);
    onBerubah(baru);
  }

  function tambah() {
    const dasar = skuProduk.trim() || 'SKU';
    perbarui([
      ...varian,
      {
        nama: '',
        sku: `${dasar}-${varian.length + 1}`,
        harga: null,
        stok: 0,
        aktif: true,
        gambar: [],
      },
    ]);
  }

  function ubah(indeks: number, tambalan: Partial<VarianForm>) {
    perbarui(varian.map((v, i) => (i === indeks ? { ...v, ...tambalan } : v)));
  }

  const totalStok = varian.filter((v) => v.aktif).reduce((t, v) => t + (v.stok || 0), 0);

  return (
    <div>
      {varian.length === 0 ? (
        <p className="rounded-lg bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
          Produk ini tidak punya varian. Stok diambil dari isian &ldquo;Stok&rdquo; di atas.
        </p>
      ) : (
        <div className="space-y-3">
          {varian.map((v, i) => (
            <div key={i} className="rounded-lg border border-neutral-200 p-3">
              <div className="grid gap-3 sm:grid-cols-[1.5fr_1.5fr_1fr_0.8fr_auto] sm:items-end">
                <label className="block">
                  <span className="text-xs font-medium text-neutral-600">Nama varian</span>
                  <input
                    value={v.nama}
                    onChange={(e) => ubah(i, { nama: e.target.value })}
                    placeholder="Ukuran L"
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-merek-500 focus:outline-none"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-neutral-600">SKU</span>
                  <input
                    value={v.sku}
                    onChange={(e) => ubah(i, { sku: e.target.value })}
                    placeholder="NSK-001-L"
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-merek-500 focus:outline-none"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-neutral-600">Harga</span>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={v.harga ?? ''}
                    onChange={(e) =>
                      ubah(i, { harga: e.target.value === '' ? null : Number(e.target.value) })
                    }
                    placeholder="ikut induk"
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-merek-500 focus:outline-none"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-neutral-600">Stok</span>
                  <input
                    type="number"
                    min={0}
                    value={v.stok}
                    onChange={(e) => ubah(i, { stok: Number(e.target.value) || 0 })}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-merek-500 focus:outline-none"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => perbarui(varian.filter((_, x) => x !== i))}
                  className="h-9 rounded-lg px-3 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Hapus
                </button>
              </div>

              <label className="mt-2 inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={v.aktif}
                  onChange={(e) => ubah(i, { aktif: e.target.checked })}
                  className="h-3.5 w-3.5 rounded border-neutral-300 text-merek-600"
                />
                <span className="text-xs text-neutral-600">
                  Aktif (varian nonaktif tidak tampil ke pembeli)
                </span>
              </label>

              {/* Selalu tampil, tidak disembunyikan di balik tombol buka-tutup:
                  kontrol unggah yang harus dicari dulu sama saja dengan tidak
                  tersedia bagi orang yang belum tahu ia ada. */}
              <div className="mt-3 border-t border-neutral-200 pt-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="text-xs font-semibold text-neutral-700">Foto varian ini</span>
                  <span className="text-xs text-neutral-500">
                    {v.gambar.length > 0
                      ? `${v.gambar.length} foto · tampil saat pembeli memilih "${v.nama || 'varian ini'}"`
                      : 'Belum ada — pembeli akan melihat gambar umum produk'}
                  </span>
                </div>

                <div className="mt-2">
                  <EditorGambar
                    awal={v.gambar.map((g, gi) => ({ id: `${i}-${gi}`, url: g.url, alt: g.alt }))}
                    onBerubah={(gambar) => ubah(i, { gambar })}
                    ringkas
                    labelUtama="1st"
                  />
                </div>
              </div>
            </div>
          ))}

          <p className="text-sm text-neutral-600">
            Total stok dari varian aktif: <strong className="text-neutral-900">{totalStok}</strong>
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={tambah}
        className="mt-3 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
      >
        + Tambah varian
      </button>
    </div>
  );
}
