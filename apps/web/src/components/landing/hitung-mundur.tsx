'use client';

import { useEffect, useState } from 'react';

interface SisaWaktu {
  hari: number;
  jam: number;
  menit: number;
  detik: number;
}

function hitungSisa(target: number): SisaWaktu | null {
  const selisih = target - Date.now();
  if (selisih <= 0) return null;

  return {
    hari: Math.floor(selisih / 86_400_000),
    jam: Math.floor((selisih / 3_600_000) % 24),
    menit: Math.floor((selisih / 60_000) % 60),
    detik: Math.floor((selisih / 1000) % 60),
  };
}

/**
 * Hitung mundur promo.
 *
 * Angka baru dihitung setelah komponen terpasang di browser, bukan saat render
 * di server — kalau tidak, hasil render server dan client berbeda dan React
 * melaporkan ketidakcocokan hidrasi.
 */
export function HitungMundur({
  berakhirPada,
  teksSetelahHabis,
  warnaAksen,
}: {
  berakhirPada: string;
  teksSetelahHabis: string | null;
  warnaAksen: string;
}) {
  const target = new Date(berakhirPada).getTime();
  const [sisa, setSisa] = useState<SisaWaktu | null | undefined>(undefined);

  useEffect(() => {
    setSisa(hitungSisa(target));
    const timer = setInterval(() => setSisa(hitungSisa(target)), 1000);
    return () => clearInterval(timer);
  }, [target]);

  if (sisa === undefined) {
    // Ruang kosong seukuran hasil akhir supaya tata letak tidak melompat.
    return <div className="h-20" aria-hidden="true" />;
  }

  if (sisa === null) {
    return (
      <p className="text-lg font-medium text-neutral-600">
        {teksSetelahHabis ?? 'Promo sudah berakhir'}
      </p>
    );
  }

  const bagian: [string, number][] = [
    ['Hari', sisa.hari],
    ['Jam', sisa.jam],
    ['Menit', sisa.menit],
    ['Detik', sisa.detik],
  ];

  return (
    <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
      {bagian.map(([label, nilai]) => (
        <div
          key={label}
          className="min-w-18 rounded-xl px-4 py-3 text-center text-white sm:min-w-24 sm:px-6"
          style={{ backgroundColor: warnaAksen }}
        >
          <div className="text-2xl font-semibold tabular-nums sm:text-4xl">
            {String(nilai).padStart(2, '0')}
          </div>
          <div className="mt-0.5 text-[11px] uppercase tracking-wide opacity-80 sm:text-xs">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
