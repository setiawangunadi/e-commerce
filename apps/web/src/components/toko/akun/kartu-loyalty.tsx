'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { tukarPoinJadiVoucher } from '@/app/(toko)/actions-akun';
import { rupiah } from '@/lib/format';
import type { RingkasanLoyalty } from '@/lib/types';

/** Sama dengan MIN_POIN_JADI_VOUCHER di API. */
const MIN_TUKAR = 100;

export function KartuLoyalty({ loyalty }: { loyalty: RingkasanLoyalty }) {
  const persen = loyalty.tierBerikutnya
    ? Math.min(
        100,
        Math.round(
          (loyalty.belanja12Bulan / (loyalty.belanja12Bulan + loyalty.tierBerikutnya.kurang)) * 100,
        ),
      )
    : 100;

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div
        className="px-5 py-5 text-white"
        style={{
          background: `linear-gradient(135deg, ${loyalty.warnaTier}, ${loyalty.warnaTier}cc)`,
        }}
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide opacity-80">Member {loyalty.namaTier}</p>
            <p className="mt-1 text-3xl font-semibold">
              {loyalty.poin.toLocaleString('id-ID')}
              <span className="ml-1.5 text-base font-normal opacity-90">poin</span>
            </p>
            <p className="mt-0.5 text-sm opacity-90">senilai {rupiah(loyalty.nilaiPoin)}</p>
          </div>
          <div className="text-right text-sm">
            <p className="opacity-90">{loyalty.pengaliPoin}× perolehan poin</p>
            {loyalty.poinTertunda > 0 && (
              <p className="mt-1 rounded-md bg-white/20 px-2 py-1 text-xs">
                +{loyalty.poinTertunda.toLocaleString('id-ID')} menunggu pesanan diterima
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 py-4">
        {loyalty.tierBerikutnya ? (
          <>
            <div className="flex items-center justify-between text-xs text-neutral-600">
              <span>Belanja 12 bulan: {rupiah(loyalty.belanja12Bulan)}</span>
              <span>
                {rupiah(loyalty.tierBerikutnya.kurang)} lagi ke {loyalty.tierBerikutnya.nama}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${persen}%`, backgroundColor: loyalty.warnaTier }}
              />
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              Di {loyalty.tierBerikutnya.nama}, setiap belanja menghasilkan{' '}
              {loyalty.tierBerikutnya.pengali}× poin.
            </p>
          </>
        ) : (
          <p className="text-sm text-neutral-600">
            Anda sudah di tier tertinggi. Terima kasih sudah jadi pelanggan setia.
          </p>
        )}
      </div>

      <div className="border-t border-neutral-200 px-5 py-4">
        <TukarVoucher saldo={loyalty.poin} />
      </div>
    </div>
  );
}

function TukarVoucher({ saldo }: { saldo: number }) {
  const [poin, setPoin] = useState(Math.min(saldo, 1000));
  const [hasil, setHasil] = useState<{ kode: string; nilai: number } | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [menunggu, mulai] = useTransition();
  const router = useRouter();

  if (saldo < MIN_TUKAR) {
    return (
      <p className="text-sm text-neutral-600">
        Kumpulkan minimal {MIN_TUKAR} poin untuk bisa ditukar jadi voucher.
      </p>
    );
  }

  function tukar() {
    setGalat(null);
    setHasil(null);
    mulai(async () => {
      const h = await tukarPoinJadiVoucher(poin);
      if (h.ok && h.kode && h.nilai !== undefined) {
        setHasil({ kode: h.kode, nilai: h.nilai });
        setPoin(Math.min(h.sisaPoin ?? 0, 1000));
        router.refresh();
      } else {
        setGalat(h.galat ?? 'Gagal menukar poin');
      }
    });
  }

  if (hasil) {
    return (
      <div className="rounded-lg bg-merek-50 p-4">
        <p className="text-sm text-merek-900">
          Voucher senilai <strong>{rupiah(hasil.nilai)}</strong> berhasil dibuat.
        </p>
        <p className="mt-2 font-mono text-lg font-semibold tracking-wider text-merek-900">
          {hasil.kode}
        </p>
        <p className="mt-1 text-xs text-merek-800">
          Masukkan kode ini di halaman checkout. Berlaku 90 hari, sekali pakai.
        </p>
        <button
          type="button"
          onClick={() => setHasil(null)}
          className="mt-3 text-xs font-medium text-merek-700 underline hover:text-merek-800"
        >
          Tukar lagi
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <label htmlFor="poin-tukar" className="text-sm font-medium text-neutral-800">
          Tukar jadi voucher
        </label>
        <span className="text-sm text-neutral-600">{rupiah(poin * 100)}</span>
      </div>

      <input
        id="poin-tukar"
        type="range"
        min={MIN_TUKAR}
        max={saldo}
        step={MIN_TUKAR}
        value={poin}
        onChange={(e) => setPoin(Number(e.target.value))}
        className="mt-2 w-full accent-merek-700"
      />

      <div className="mt-1 flex items-center justify-between text-xs text-neutral-500">
        <span>{MIN_TUKAR} poin</span>
        <span>{poin.toLocaleString('id-ID')} poin dipakai</span>
        <span>{saldo.toLocaleString('id-ID')} poin</span>
      </div>

      {galat && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {galat}
        </p>
      )}

      <button
        type="button"
        onClick={tukar}
        disabled={menunggu}
        className="mt-3 w-full rounded-lg border border-merek-700 px-4 py-2.5 text-sm font-semibold text-merek-700 hover:bg-merek-50 disabled:opacity-60"
      >
        {menunggu ? 'Memproses...' : `Tukar ${poin.toLocaleString('id-ID')} poin`}
      </button>
    </div>
  );
}
