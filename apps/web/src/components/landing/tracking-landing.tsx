'use client';

import { useEffect, useState } from 'react';
import {
  EVENT_CONSENT,
  bacaPersetujuan,
  pasangTracking,
  rekamAtribusi,
  simpanPersetujuan,
} from '@/lib/tracking';
import type { TrackingLanding } from '@/lib/types';

/**
 * Memasang pixel iklan setelah pengunjung menyetujui cookie, dan menampilkan
 * banner persetujuannya.
 *
 * Skrip Meta/Google TIDAK dimuat sebelum ada persetujuan — memasangnya lebih
 * dulu berarti data pengunjung sudah terkirim ke pihak ketiga sebelum ia
 * sempat memilih (UU PDP, research/business/11-legal-compliance.md).
 */
export function TrackingLandingPage({
  tracking,
  slug,
}: {
  tracking: TrackingLanding;
  slug: string;
}) {
  const [persetujuan, setPersetujuan] = useState<'diterima' | 'ditolak' | null | undefined>(
    undefined,
  );

  const adaTracking = Object.values(tracking).some(Boolean);

  useEffect(() => {
    // Atribusi kampanye direkam terlepas dari persetujuan — ini catatan
    // internal asal pesanan, bukan pelacakan lintas situs.
    rekamAtribusi(slug);

    const awal = bacaPersetujuan();
    setPersetujuan(awal);
    if (awal === 'diterima' && adaTracking) pasangTracking(tracking);

    function tangani(e: Event) {
      const nilai = (e as CustomEvent<'diterima' | 'ditolak'>).detail;
      setPersetujuan(nilai);
      if (nilai === 'diterima' && adaTracking) pasangTracking(tracking);
    }

    window.addEventListener(EVENT_CONSENT, tangani);
    return () => window.removeEventListener(EVENT_CONSENT, tangani);
  }, [tracking, slug, adaTracking]);

  // `undefined` = belum dibaca dari localStorage; jangan berkedip di render awal.
  if (persetujuan !== null || !adaTracking) return null;

  return (
    <div
      role="dialog"
      aria-label="Persetujuan cookie"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-200 bg-white p-4 shadow-lg"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-neutral-700">
          Kami memakai cookie untuk mengukur efektivitas iklan. Anda bisa menolak tanpa kehilangan
          fungsi apa pun di halaman ini.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => simpanPersetujuan('ditolak')}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Tolak
          </button>
          <button
            type="button"
            onClick={() => simpanPersetujuan('diterima')}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            Setuju
          </button>
        </div>
      </div>
    </div>
  );
}
