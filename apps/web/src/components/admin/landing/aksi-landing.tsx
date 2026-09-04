'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { hapusLanding } from '@/app/admin/actions-landing';

export function AksiLanding({ id, nama }: { id: string; nama: string }) {
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [menunggu, mulai] = useTransition();
  const router = useRouter();

  function jalankan() {
    setGalat(null);
    mulai(async () => {
      const hasil = await hapusLanding(id);
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
          Hapus &ldquo;{nama.length > 16 ? `${nama.slice(0, 16)}...` : nama}&rdquo;?
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
