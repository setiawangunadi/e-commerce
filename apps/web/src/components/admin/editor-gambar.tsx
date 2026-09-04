'use client';

import Image from 'next/image';
import { useRef, useState, useTransition } from 'react';
import { unggahGambar } from '@/app/admin/actions-produk';
import type { Gambar } from '@/lib/types';

export interface GambarForm {
  url: string;
  alt: string | null;
}

/**
 * Daftar gambar. Gambar pertama jadi yang utama, jadi urutannya bisa diubah.
 *
 * Dipakai dua kali: untuk galeri umum produk, dan — dalam mode `ringkas` —
 * untuk gambar milik satu varian di dalam baris editor varian. Satu komponen
 * untuk keduanya supaya logika unggah, batas 10 berkas, dan penanganan
 * galatnya tidak bercabang jadi dua salinan yang bisa menyimpang.
 */
export function EditorGambar({
  awal,
  onBerubah,
  ringkas = false,
  labelUtama = 'Utama',
}: {
  awal: Gambar[];
  onBerubah: (gambar: GambarForm[]) => void;
  ringkas?: boolean;
  labelUtama?: string;
}) {
  const [gambar, setGambar] = useState<GambarForm[]>(
    awal.map((g) => ({ url: g.url, alt: g.alt })),
  );
  const [galat, setGalat] = useState<string | null>(null);
  const [mengunggah, mulai] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function perbarui(baru: GambarForm[]) {
    setGambar(baru);
    onBerubah(baru);
  }

  function pilihBerkas(e: React.ChangeEvent<HTMLInputElement>) {
    const berkas = e.target.files?.[0];
    if (!berkas) return;

    setGalat(null);
    const formData = new FormData();
    formData.append('file', berkas);

    mulai(async () => {
      const hasil = await unggahGambar(formData);
      if (hasil.ok && hasil.url) {
        perbarui([...gambar, { url: hasil.url, alt: null }]);
      } else {
        setGalat(hasil.galat ?? 'Gagal mengunggah gambar');
      }
      if (inputRef.current) inputRef.current.value = '';
    });
  }

  function hapus(indeks: number) {
    perbarui(gambar.filter((_, i) => i !== indeks));
  }

  function geser(indeks: number, arah: -1 | 1) {
    const tujuan = indeks + arah;
    if (tujuan < 0 || tujuan >= gambar.length) return;
    const baru = [...gambar];
    [baru[indeks], baru[tujuan]] = [baru[tujuan]!, baru[indeks]!];
    perbarui(baru);
  }

  return (
    <div>
      {gambar.length > 0 && (
        <ul
          className={
            ringkas
              ? 'mb-2 grid grid-cols-4 gap-2 sm:grid-cols-6'
              : 'mb-3 grid grid-cols-3 gap-3 sm:grid-cols-4'
          }
        >
          {gambar.map((g, i) => (
            <li
              key={`${g.url}-${i}`}
              className="group relative aspect-square overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100"
            >
              <Image
                src={g.url}
                alt={g.alt ?? ''}
                fill
                sizes={ringkas ? '90px' : '140px'}
                className="object-cover"
              />

              {i === 0 && (
                <span className="absolute left-1 top-1 rounded bg-merek-700 px-1 py-0.5 text-[9px] font-semibold text-white">
                  {labelUtama}
                </span>
              )}

              <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-neutral-900/70 p-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <button
                  type="button"
                  onClick={() => geser(i, -1)}
                  disabled={i === 0}
                  className="rounded px-1.5 py-0.5 text-xs text-white hover:bg-white/20 disabled:opacity-30"
                  aria-label="Geser ke kiri"
                >
                  &larr;
                </button>
                <button
                  type="button"
                  onClick={() => geser(i, 1)}
                  disabled={i === gambar.length - 1}
                  className="rounded px-1.5 py-0.5 text-xs text-white hover:bg-white/20 disabled:opacity-30"
                  aria-label="Geser ke kanan"
                >
                  &rarr;
                </button>
                <button
                  type="button"
                  onClick={() => hapus(i)}
                  className="rounded px-1.5 py-0.5 text-xs text-red-300 hover:bg-white/20"
                  aria-label="Hapus gambar"
                >
                  Hapus
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={mengunggah || gambar.length >= 10}
          className={
            ringkas
              ? 'rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50'
              : 'rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50'
          }
        >
          {mengunggah ? 'Mengunggah...' : '+ Unggah gambar'}
        </button>
        <span className="text-xs text-neutral-500">
          {ringkas
            ? `${gambar.length}/10`
            : `${gambar.length}/10 · JPG, PNG, WebP, atau AVIF · maks 5 MB`}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        onChange={pilihBerkas}
        className="hidden"
      />

      {galat && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {galat}
        </p>
      )}
    </div>
  );
}
