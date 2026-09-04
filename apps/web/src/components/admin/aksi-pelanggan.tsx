'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { sesuaikanPoin, ubahAktifPelanggan } from '@/app/admin/actions-pelanggan';

/** Menonaktifkan/mengaktifkan akun langsung dari daftar maupun halaman detail. */
export function SakelarPelanggan({ id, aktif }: { id: string; aktif: boolean }) {
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [menunggu, mulai] = useTransition();
  const router = useRouter();

  function jalankan() {
    setGalat(null);
    mulai(async () => {
      const hasil = await ubahAktifPelanggan(id, !aktif);
      if (hasil.ok) {
        setKonfirmasi(false);
        router.refresh();
      } else {
        setGalat(hasil.galat ?? 'Gagal');
      }
    });
  }

  // Mengaktifkan kembali tidak berbahaya, jadi langsung jalan. Menonaktifkan
  // mengunci orang keluar dari akunnya, jadi perlu satu langkah konfirmasi.
  if (!aktif) {
    return (
      <button
        type="button"
        onClick={jalankan}
        disabled={menunggu}
        title={galat ?? 'Aktifkan kembali akun ini'}
        className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-merek-700 hover:bg-merek-50 disabled:opacity-50"
      >
        {menunggu ? '...' : 'Aktifkan'}
      </button>
    );
  }

  if (!konfirmasi) {
    return (
      <button
        type="button"
        onClick={() => setKonfirmasi(true)}
        className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
      >
        Nonaktifkan
      </button>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {galat ? (
        <span className="text-xs text-red-600">{galat}</span>
      ) : (
        <span className="text-xs text-neutral-600">Kunci akun ini?</span>
      )}
      <button
        type="button"
        onClick={jalankan}
        disabled={menunggu}
        className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
      >
        {menunggu ? '...' : 'Ya, nonaktifkan'}
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

/** Form penyesuaian poin manual di halaman detail pelanggan. */
export function FormPenyesuaianPoin({ id, saldo }: { id: string; saldo: number }) {
  const [terbuka, setTerbuka] = useState(false);
  const [jumlah, setJumlah] = useState('');
  const [alasan, setAlasan] = useState('');
  const [galat, setGalat] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);
  const [menunggu, mulai] = useTransition();
  const router = useRouter();

  const angka = Number(jumlah);
  const valid = Number.isFinite(angka) && angka !== 0 && alasan.trim().length >= 5;
  const saldoBaru = Number.isFinite(angka) ? saldo + Math.round(angka) : saldo;

  function kirim() {
    setGalat(null);
    setPesan(null);
    mulai(async () => {
      const hasil = await sesuaikanPoin(id, angka, alasan);
      if (hasil.ok) {
        setPesan(hasil.pesan ?? 'Tersimpan.');
        setJumlah('');
        setAlasan('');
        setTerbuka(false);
        router.refresh();
      } else {
        setGalat(hasil.galat ?? 'Gagal menyesuaikan poin');
      }
    });
  }

  if (!terbuka) {
    return (
      <div>
        {pesan && <p className="mb-2 text-xs text-merek-700">{pesan}</p>}
        <button
          type="button"
          onClick={() => setTerbuka(true)}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Sesuaikan poin
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200 p-3">
      <p className="text-sm font-medium text-neutral-800">Penyesuaian poin manual</p>
      <p className="mt-0.5 text-xs text-neutral-500">
        Angka positif menambah, negatif mengurangi. Tercatat permanen di riwayat poin bersama
        email Anda.
      </p>

      <div className="mt-3 space-y-2">
        <input
          type="number"
          value={jumlah}
          onChange={(e) => setJumlah(e.target.value)}
          placeholder="mis. 500 atau -200"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-merek-500 focus:outline-none"
        />
        <input
          value={alasan}
          onChange={(e) => setAlasan(e.target.value)}
          maxLength={300}
          placeholder="Alasan, mis. kompensasi keterlambatan kirim"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-merek-500 focus:outline-none"
        />
      </div>

      {jumlah !== '' && Number.isFinite(angka) && angka !== 0 && (
        <p className="mt-2 text-xs text-neutral-600">
          Saldo akan jadi <strong>{saldoBaru.toLocaleString('id-ID')}</strong> poin.
        </p>
      )}

      {galat && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {galat}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={kirim}
          disabled={!valid || menunggu}
          className="rounded-lg bg-merek-700 px-4 py-2 text-sm font-semibold text-white hover:bg-merek-800 disabled:opacity-50"
        >
          {menunggu ? 'Menyimpan...' : 'Simpan'}
        </button>
        <button
          type="button"
          onClick={() => {
            setTerbuka(false);
            setGalat(null);
          }}
          className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
        >
          Batal
        </button>
      </div>
    </div>
  );
}
