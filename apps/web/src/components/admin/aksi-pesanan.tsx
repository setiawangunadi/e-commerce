'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { sinkronPesanan, ubahResiPesanan, ubahStatusPesanan } from '@/app/admin/actions-pesanan';
import type { StatusPesanan } from '@/lib/types';

interface Props {
  id: string;
  statusSekarang: StatusPesanan;
  statusBerikutnya: { status: StatusPesanan; label: string }[];
  nomorResi: string | null;
}

/**
 * Tombol perpindahan status pesanan.
 *
 * Pilihan yang ditampilkan datang dari API (`statusBerikutnya`), bukan
 * ditentukan di sini — aturan alur pesanan hanya boleh ada di satu tempat,
 * dan API tetap menolak transisi tidak sah walau tombolnya dipaksa muncul.
 */
export function AksiPesanan({ id, statusSekarang, statusBerikutnya, nomorResi }: Props) {
  const [menunggu, mulai] = useTransition();
  const [galat, setGalat] = useState<string | null>(null);
  const [resi, setResi] = useState('');
  const [konfirmasiBatal, setKonfirmasiBatal] = useState(false);
  const router = useRouter();

  const majuKe = statusBerikutnya.find((s) => s.status !== 'ORDER_CANCELLED');
  const bisaBatal = statusBerikutnya.some((s) => s.status === 'ORDER_CANCELLED');
  const perluResi = majuKe?.status === 'ORDER_SEND';

  function jalankan(status: StatusPesanan, nomorResiBaru?: string) {
    setGalat(null);
    mulai(async () => {
      const hasil = await ubahStatusPesanan(id, status, nomorResiBaru);
      if (hasil.ok) {
        setResi('');
        setKonfirmasiBatal(false);
        router.refresh();
      } else {
        setGalat(hasil.galat ?? 'Gagal mengubah status');
      }
    });
  }

  if (statusBerikutnya.length === 0) {
    return (
      <div className="space-y-3">
        <p className="rounded-lg bg-neutral-100 px-4 py-3 text-sm text-neutral-600">
          Pesanan ini sudah final dan tidak bisa diubah lagi.
        </p>
        {statusSekarang === 'ORDER_RECEIPT' && (
          <UbahResi id={id} nomorResi={nomorResi} onSelesai={() => router.refresh()} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {galat && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {galat}
        </p>
      )}

      {statusSekarang === 'WAITING_PAYMENT' && (
        <>
          <p className="rounded-lg bg-neutral-100 px-4 py-2.5 text-xs leading-relaxed text-neutral-600">
            Pelunasan dicatat dari Midtrans, bukan diubah manual. Kalau pembeli mengaku sudah
            bayar tapi status belum berubah, cek langsung ke Midtrans di bawah.
          </p>
          <TombolSinkron id={id} />
        </>
      )}

      {majuKe && (
        <div className="space-y-2">
          {perluResi && (
            <label className="block">
              <span className="text-xs font-medium text-neutral-600">
                Nomor resi <span className="text-red-500">*</span>
              </span>
              <input
                value={resi}
                onChange={(e) => setResi(e.target.value)}
                placeholder="JNE1234567890"
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-merek-500 focus:outline-none"
              />
              <span className="mt-1 block text-xs text-neutral-500">
                Pembeli memakai nomor ini untuk melacak kirimannya.
              </span>
            </label>
          )}

          <button
            type="button"
            onClick={() => jalankan(majuKe.status, perluResi ? resi : undefined)}
            disabled={menunggu || (perluResi && resi.trim().length < 4)}
            className="w-full rounded-lg bg-merek-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-merek-800 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500"
          >
            {menunggu ? 'Memproses...' : `Tandai ${majuKe.label}`}
          </button>
        </div>
      )}

      {bisaBatal &&
        (konfirmasiBatal ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-800">
              Batalkan pesanan ini?
              {statusSekarang !== 'WAITING_PAYMENT' && ' Stok barangnya akan dikembalikan.'}
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => jalankan('ORDER_CANCELLED')}
                disabled={menunggu}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {menunggu ? 'Membatalkan...' : 'Ya, batalkan'}
              </button>
              <button
                type="button"
                onClick={() => setKonfirmasiBatal(false)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-white"
              >
                Tidak jadi
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setKonfirmasiBatal(true)}
            className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Batalkan Pesanan
          </button>
        ))}

      {statusSekarang === 'ORDER_SEND' && (
        <UbahResi id={id} nomorResi={nomorResi} onSelesai={() => router.refresh()} />
      )}
    </div>
  );
}

/** Perbaikan nomor resi setelah pesanan terlanjur dikirim. */
function UbahResi({
  id,
  nomorResi,
  onSelesai,
}: {
  id: string;
  nomorResi: string | null;
  onSelesai: () => void;
}) {
  const [buka, setBuka] = useState(false);
  const [nilai, setNilai] = useState(nomorResi ?? '');
  const [galat, setGalat] = useState<string | null>(null);
  const [menunggu, mulai] = useTransition();

  if (!buka) {
    return (
      <button
        type="button"
        onClick={() => setBuka(true)}
        className="w-full rounded-lg px-4 py-2 text-sm font-medium text-merek-700 hover:bg-merek-50"
      >
        Perbaiki nomor resi
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200 p-3">
      <label className="block">
        <span className="text-xs font-medium text-neutral-600">Nomor resi</span>
        <input
          value={nilai}
          onChange={(e) => setNilai(e.target.value)}
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-merek-500 focus:outline-none"
        />
      </label>

      {galat && <p className="mt-1.5 text-xs text-red-600">{galat}</p>}

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={menunggu || nilai.trim().length < 4}
          onClick={() =>
            mulai(async () => {
              const hasil = await ubahResiPesanan(id, nilai);
              if (hasil.ok) {
                setBuka(false);
                onSelesai();
              } else {
                setGalat(hasil.galat ?? 'Gagal menyimpan');
              }
            })
          }
          className="rounded-lg bg-merek-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-merek-800 disabled:opacity-50"
        >
          {menunggu ? 'Menyimpan...' : 'Simpan'}
        </button>
        <button
          type="button"
          onClick={() => setBuka(false)}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
        >
          Batal
        </button>
      </div>
    </div>
  );
}

/** Menarik status terbaru dari Midtrans untuk pesanan yang webhook-nya terlewat. */
function TombolSinkron({ id }: { id: string }) {
  const [menunggu, mulai] = useTransition();
  const [pesan, setPesan] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div>
      <button
        type="button"
        disabled={menunggu}
        onClick={() =>
          mulai(async () => {
            setPesan(null);
            const hasil = await sinkronPesanan(id);
            if (!hasil.ok) {
              setPesan(hasil.galat ?? 'Gagal menghubungi Midtrans');
              return;
            }
            if (hasil.diperbarui) {
              router.refresh();
            } else {
              setPesan(
                hasil.statusMidtrans === 'BELUM_ADA_TRANSAKSI'
                  ? 'Pembeli belum memulai pembayaran di Midtrans.'
                  : 'Status di Midtrans masih sama — belum ada pembayaran masuk.',
              );
            }
          })
        }
        className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
      >
        {menunggu ? 'Mengecek ke Midtrans...' : 'Cek Status ke Midtrans'}
      </button>
      {pesan && <p className="mt-2 text-xs text-neutral-600">{pesan}</p>}
    </div>
  );
}
