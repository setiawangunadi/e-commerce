'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  hapusKategori,
  hapusMerek,
  hapusLabel,
  hapusVoucher,
  ubahAktifLabel,
  ubahAktifVoucher,
} from '@/app/admin/actions-promo';

/**
 * Hapus dengan konfirmasi dua langkah. Dipakai bersama oleh kategori, label,
 * dan voucher supaya perilakunya persis sama di ketiga daftar.
 */
function TombolHapusPromo({
  nama,
  aksi,
}: {
  nama: string;
  aksi: () => Promise<{ ok: boolean; galat?: string }>;
}) {
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [menunggu, mulai] = useTransition();
  const router = useRouter();

  function jalankan() {
    setGalat(null);
    mulai(async () => {
      const hasil = await aksi();
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
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {galat ? (
        <span className="text-xs text-red-600">{galat}</span>
      ) : (
        <span className="text-xs text-neutral-600">
          Hapus &ldquo;{nama.length > 18 ? `${nama.slice(0, 18)}...` : nama}&rdquo;?
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

export function AksiKategori({ id, nama }: { id: string; nama: string }) {
  return <TombolHapusPromo nama={nama} aksi={() => hapusKategori(id)} />;
}

export function AksiMerek({ id, nama }: { id: string; nama: string }) {
  return <TombolHapusPromo nama={nama} aksi={() => hapusMerek(id)} />;
}

export function AksiLabel({ id, nama }: { id: string; nama: string }) {
  return <TombolHapusPromo nama={nama} aksi={() => hapusLabel(id)} />;
}

export function AksiVoucher({ id, kode }: { id: string; kode: string }) {
  return <TombolHapusPromo nama={kode} aksi={() => hapusVoucher(id)} />;
}

/** Sakelar aktif/nonaktif langsung dari daftar, tanpa membuka form. */
function SakelarAktif({
  aktif,
  aksi,
  judulAktif,
  judulNonaktif,
}: {
  aktif: boolean;
  aksi: (aktif: boolean) => Promise<{ ok: boolean; galat?: string }>;
  judulAktif: string;
  judulNonaktif: string;
}) {
  const [menunggu, mulai] = useTransition();
  const [galat, setGalat] = useState<string | null>(null);
  const router = useRouter();

  function alihkan() {
    setGalat(null);
    mulai(async () => {
      const hasil = await aksi(!aktif);
      if (hasil.ok) router.refresh();
      else setGalat(hasil.galat ?? 'Gagal');
    });
  }

  return (
    <button
      type="button"
      onClick={alihkan}
      disabled={menunggu}
      title={galat ?? (aktif ? judulAktif : judulNonaktif)}
      aria-pressed={aktif}
      className={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
        aktif ? 'text-neutral-600 hover:bg-neutral-100' : 'text-merek-700 hover:bg-merek-50'
      }`}
    >
      {menunggu ? '...' : aktif ? 'Nonaktifkan' : 'Aktifkan'}
    </button>
  );
}

export function SakelarLabel({ id, aktif }: { id: string; aktif: boolean }) {
  return (
    <SakelarAktif
      aktif={aktif}
      aksi={(nilai) => ubahAktifLabel(id, nilai)}
      judulAktif="Klik untuk menyembunyikan lencana ini dari semua produk"
      judulNonaktif="Klik untuk menampilkan lencana ini"
    />
  );
}

export function SakelarVoucher({ id, aktif }: { id: string; aktif: boolean }) {
  return (
    <SakelarAktif
      aktif={aktif}
      aksi={(nilai) => ubahAktifVoucher(id, nilai)}
      judulAktif="Klik untuk menghentikan kode ini di checkout"
      judulNonaktif="Klik untuk mengaktifkan kembali kode ini"
    />
  );
}
