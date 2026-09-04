'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { hapusBanner, ubahAktifBanner } from '@/app/admin/actions-banner';

/** Menyalakan/mematikan banner langsung dari daftar. */
export function SakelarAktif({ id, aktif }: { id: string; aktif: boolean }) {
  const [menunggu, mulai] = useTransition();
  const [galat, setGalat] = useState<string | null>(null);
  const router = useRouter();

  function alihkan() {
    setGalat(null);
    mulai(async () => {
      const hasil = await ubahAktifBanner(id, !aktif);
      if (hasil.ok) router.refresh();
      else setGalat(hasil.galat ?? 'Gagal');
    });
  }

  return (
    <button
      type="button"
      onClick={alihkan}
      disabled={menunggu}
      title={galat ?? (aktif ? 'Klik untuk menonaktifkan' : 'Klik untuk menayangkan')}
      aria-pressed={aktif}
      className={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
        aktif
          ? 'text-neutral-600 hover:bg-neutral-100'
          : 'text-merek-700 hover:bg-merek-50'
      }`}
    >
      {menunggu ? '...' : aktif ? 'Nonaktifkan' : 'Tayangkan'}
    </button>
  );
}

export function AksiBanner({ id, judul }: { id: string; judul: string }) {
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [menunggu, mulai] = useTransition();
  const router = useRouter();

  function jalankan() {
    setGalat(null);
    mulai(async () => {
      const hasil = await hapusBanner(id);
      if (hasil.ok) {
        setKonfirmasi(false);
        router.refresh();
      } else {
        setGalat(hasil.galat ?? 'Gagal menghapus');
      }
    });
  }

  if (!konfirmasi) {
    return (
      <button
        type="button"
        onClick={() => setKonfirmasi(true)}
        className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
      >
        Hapus
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      {galat ? (
        <span className="text-xs text-red-600">{galat}</span>
      ) : (
        <span className="text-xs text-neutral-600">
          Hapus &ldquo;{judul.length > 18 ? `${judul.slice(0, 18)}...` : judul}&rdquo;?
        </span>
      )}
      <button
        type="button"
        onClick={jalankan}
        disabled={menunggu}
        className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
      >
        {menunggu ? 'Menghapus...' : 'Ya, hapus'}
      </button>
      <button
        type="button"
        onClick={() => {
          setKonfirmasi(false);
          setGalat(null);
        }}
        className="rounded-lg px-2 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
      >
        Batal
      </button>
    </span>
  );
}
