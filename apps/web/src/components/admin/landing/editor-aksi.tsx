'use client';

import type { AksiCta, KartuProduk } from '@/lib/types';

const kelasInput =
  'w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-merek-500 focus:outline-none';

/** Pengaturan tujuan satu tombol CTA. */
export function EditorAksi({
  aksi,
  produk,
  onUbah,
}: {
  aksi: AksiCta;
  produk: KartuProduk[];
  onUbah: (aksi: AksiCta) => void;
}) {
  const ubah = (tambalan: Partial<AksiCta>) => onUbah({ ...aksi, ...tambalan });

  return (
    <div className="space-y-3 rounded-lg bg-neutral-50 p-3">
      <label className="block">
        <span className="text-xs font-medium text-neutral-600">Tombol ini akan</span>
        <select
          value={aksi.tipe}
          onChange={(e) => ubah({ tipe: e.target.value as AksiCta['tipe'] })}
          className={`mt-1 ${kelasInput}`}
        >
          <option value="checkout">Langsung ke checkout (lewati keranjang)</option>
          <option value="keranjang">Masukkan ke keranjang</option>
          <option value="tautan">Pindah ke halaman lain</option>
        </select>
      </label>

      {aksi.tipe === 'tautan' ? (
        <label className="block">
          <span className="text-xs font-medium text-neutral-600">Tujuan</span>
          <input
            value={aksi.url ?? ''}
            onChange={(e) => ubah({ url: e.target.value })}
            placeholder="/produk"
            className={`mt-1 ${kelasInput}`}
          />
          <span className="mt-1 block text-xs text-neutral-500">
            Hanya path internal, contoh: /produk atau /kategori/aksesoris
          </span>
        </label>
      ) : (
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
          <label className="block">
            <span className="text-xs font-medium text-neutral-600">Produk</span>
            <select
              value={aksi.produkId ?? ''}
              onChange={(e) => ubah({ produkId: e.target.value || null, varianId: null })}
              className={`mt-1 ${kelasInput}`}
            >
              <option value="">— Pilih produk —</option>
              {produk.map((p) => (
                <option key={p.id} value={p.id} disabled={p.punyaVarian}>
                  {p.nama}
                  {p.punyaVarian ? ' (punya varian — pakai tautan ke detail)' : ''}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-neutral-500">
              Produk bervarian tidak bisa dibeli langsung; arahkan ke halaman detailnya.
            </span>
          </label>

          <label className="block">
            <span className="text-xs font-medium text-neutral-600">Jumlah</span>
            <input
              type="number"
              min={1}
              max={99}
              value={aksi.jumlah}
              onChange={(e) => ubah({ jumlah: Math.max(1, Number(e.target.value) || 1) })}
              className={`mt-1 ${kelasInput}`}
            />
          </label>
        </div>
      )}
    </div>
  );
}
