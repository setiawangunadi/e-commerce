'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState, useTransition } from 'react';
import { segarkanPesanan, siapkanPembayaran } from '@/app/(toko)/actions-pembayaran';

/** Bentuk minimal API Snap yang disuntikkan skrip Midtrans ke `window`. */
declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        opsi: {
          onSuccess?: (hasil: unknown) => void;
          onPending?: (hasil: unknown) => void;
          onError?: (hasil: unknown) => void;
          onClose?: () => void;
        },
      ) => void;
    };
  }
}

const URL_SNAP_SANDBOX = 'https://app.sandbox.midtrans.com/snap/snap.js';
const URL_SNAP_PRODUKSI = 'https://app.midtrans.com/snap/snap.js';

export function TombolBayar({
  nomor,
  token,
  produksi,
}: {
  nomor: string;
  token: string;
  produksi: boolean;
}) {
  const [menunggu, mulai] = useTransition();
  const [galat, setGalat] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);
  const skripDimuat = useRef(false);
  const router = useRouter();

  /**
   * Skrip Snap dimuat saat dibutuhkan, bukan di setiap halaman — pembeli yang
   * hanya melihat-lihat tidak perlu mengunduh JavaScript pihak ketiga.
   */
  const muatSnap = useCallback(
    (clientKey: string) =>
      new Promise<void>((resolve, reject) => {
        if (skripDimuat.current && window.snap) return resolve();

        const src = produksi ? URL_SNAP_PRODUKSI : URL_SNAP_SANDBOX;
        const adaSkrip = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
        if (adaSkrip && window.snap) {
          skripDimuat.current = true;
          return resolve();
        }

        const skrip = adaSkrip ?? document.createElement('script');
        skrip.src = src;
        skrip.setAttribute('data-client-key', clientKey);
        skrip.async = true;
        skrip.onload = () => {
          skripDimuat.current = true;
          resolve();
        };
        skrip.onerror = () => reject(new Error('Gagal memuat halaman pembayaran Midtrans'));
        if (!adaSkrip) document.body.appendChild(skrip);
      }),
    [produksi],
  );

  function bayar() {
    setGalat(null);
    setPesan(null);

    mulai(async () => {
      const hasil = await siapkanPembayaran(nomor, token);

      if (!hasil.ok || !hasil.snapToken || !hasil.clientKey) {
        setGalat(hasil.galat ?? 'Gagal menyiapkan pembayaran');
        return;
      }

      try {
        await muatSnap(hasil.clientKey);
      } catch {
        // Bila skrip popup gagal dimuat, halaman pembayaran Midtrans tetap
        // bisa dibuka lewat redirect biasa.
        if (hasil.redirectUrl) {
          window.location.href = hasil.redirectUrl;
          return;
        }
        setGalat('Gagal memuat halaman pembayaran. Periksa koneksi Anda.');
        return;
      }

      if (!window.snap) {
        if (hasil.redirectUrl) window.location.href = hasil.redirectUrl;
        else setGalat('Halaman pembayaran tidak bisa dibuka');
        return;
      }

      window.snap.pay(hasil.snapToken, {
        onSuccess: async () => {
          setPesan('Pembayaran diterima. Memuat status terbaru...');
          await segarkanPesanan(nomor);
          router.refresh();
        },
        onPending: async () => {
          setPesan('Pembayaran menunggu penyelesaian. Ikuti instruksi yang diberikan.');
          await segarkanPesanan(nomor);
          router.refresh();
        },
        onError: () => setGalat('Pembayaran gagal diproses. Silakan coba lagi.'),
        onClose: () => setPesan('Jendela pembayaran ditutup. Pesanan Anda masih menunggu bayar.'),
      });
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={bayar}
        disabled={menunggu}
        className="w-full rounded-lg bg-merek-700 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-merek-800 disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
      >
        {menunggu ? 'Menyiapkan pembayaran...' : 'Bayar Sekarang'}
      </button>

      {galat && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {galat}
        </p>
      )}
      {pesan && (
        <p className="mt-3 rounded-lg bg-neutral-100 px-4 py-2.5 text-sm text-neutral-700">
          {pesan}
        </p>
      )}
    </div>
  );
}
