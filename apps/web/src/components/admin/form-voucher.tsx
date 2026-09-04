'use client';

import Link from 'next/link';
import { startTransition, useActionState, useMemo, useState } from 'react';
import { simpanVoucher, type HasilForm } from '@/app/admin/actions-promo';
import { rupiah } from '@/lib/format';
import { AreaTeks, Bagian, Bidang, InputRupiah, Pilihan, Sakelar, Teks } from './bidang';
import { keInputLokal } from './waktu-lokal';
import type { KategoriAdmin, TipeVoucher, VoucherAdmin } from '@/lib/types';

const awal: HasilForm = { ok: false };

export interface ProdukRingkas {
  id: string;
  nama: string;
  sku: string;
  harga: number;
}

export function FormVoucher({
  voucher,
  produk,
  kategori,
  terpotong,
}: {
  voucher?: VoucherAdmin;
  produk: ProdukRingkas[];
  kategori: KategoriAdmin[];
  /** Daftar produk melebihi batas muat, jadi cakupan per-produk tidak lengkap. */
  terpotong?: boolean;
}) {
  const [status, kirim, menunggu] = useActionState(simpanVoucher, awal);
  const [tipe, setTipe] = useState<TipeVoucher>(voucher?.tipe ?? 'PERSEN');
  const [cakupan, setCakupan] = useState<'semua' | 'pilih'>(
    voucher && (voucher.produkIds.length > 0 || voucher.kategoriIds.length > 0) ? 'pilih' : 'semua',
  );

  const g = status.galatField ?? {};

  function tanganiSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => kirim(formData));
  }

  return (
    <form onSubmit={tanganiSubmit} className="space-y-5">
      {voucher && <input type="hidden" name="id" value={voucher.id} />}

      {status.galat && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {status.galat}
        </p>
      )}

      <Bagian
        judul="Kode & Potongan"
        deskripsi="Pembeli memasukkan kode ini di halaman checkout. Besar potongan selalu dihitung ulang di server, jadi kode yang sama tidak bisa dipakai untuk potongan lain."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Bidang
            label="Kode voucher"
            nama="kode"
            galat={g.kode}
            petunjuk="Huruf, angka, tanda hubung. Otomatis disimpan sebagai huruf kapital."
            wajib
          >
            {/* Bukan <Teks> karena kode voucher perlu tampil huruf kapital
                bermonospasi agar 0/O dan 1/I tidak tertukar saat dibacakan. */}
            <input
              name="kode"
              id="kode"
              defaultValue={voucher?.kode}
              required
              maxLength={32}
              placeholder="HEMAT10"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 font-mono text-sm uppercase tracking-wide text-neutral-900 placeholder:font-sans placeholder:normal-case placeholder:text-neutral-400 focus:border-merek-500 focus:outline-none"
            />
          </Bidang>

          <Bidang label="Tipe potongan" nama="tipe" galat={g.tipe} wajib>
            <Pilihan
              name="tipe"
              value={tipe}
              onChange={(e) => setTipe(e.target.value as TipeVoucher)}
            >
              <option value="PERSEN">Persen (%) dari subtotal</option>
              <option value="NOMINAL">Nominal tetap (Rp)</option>
            </Pilihan>
          </Bidang>
        </div>

        <Bidang
          label={tipe === 'PERSEN' ? 'Besar diskon (%)' : 'Besar diskon (Rp)'}
          nama="nilai"
          galat={g.nilai}
          wajib
        >
          {tipe === 'PERSEN' ? (
            <div className="relative">
              <input
                name="nilai"
                id="nilai"
                type="number"
                min={1}
                max={100}
                required
                defaultValue={voucher?.nilai}
                placeholder="10"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 pr-9 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-merek-500 focus:outline-none"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500">
                %
              </span>
            </div>
          ) : (
            <InputRupiah name="nilai" min={1} required defaultValue={voucher?.nilai} placeholder="25000" />
          )}
        </Bidang>

        {tipe === 'PERSEN' && (
          <Bidang
            label="Maksimal potongan"
            nama="maksPotongan"
            galat={g.maksPotongan}
            petunjuk="Batas atas rupiah untuk diskon persen. Kosongkan bila tanpa batas — tanpa ini, keranjang besar bisa memotong jauh lebih banyak dari yang direncanakan."
          >
            <InputRupiah
              name="maksPotongan"
              defaultValue={voucher?.maksPotongan ?? ''}
              placeholder="25000"
            />
          </Bidang>
        )}

        <Bidang
          label="Minimal belanja"
          nama="minBelanja"
          galat={g.minBelanja}
          petunjuk="Dihitung dari subtotal produk yang tercakup voucher ini, di luar ongkir. Isi 0 bila tanpa minimum."
        >
          <InputRupiah name="minBelanja" defaultValue={voucher?.minBelanja ?? 0} />
        </Bidang>

        <Bidang
          label="Deskripsi"
          nama="deskripsi"
          galat={g.deskripsi}
          petunjuk="Ditampilkan ke pembeli saat voucher berhasil dipakai."
        >
          <AreaTeks
            name="deskripsi"
            rows={2}
            defaultValue={voucher?.deskripsi ?? ''}
            maxLength={200}
            placeholder="Diskon 10% maksimal Rp25.000 untuk semua produk"
          />
        </Bidang>
      </Bagian>

      <Bagian
        judul="Kuota & Masa Berlaku"
        deskripsi="Voucher berhenti sendiri saat kuota habis atau masa berlakunya lewat."
      >
        <Bidang
          label="Kuota pemakaian"
          nama="kuota"
          galat={g.kuota}
          petunjuk={
            voucher
              ? `Sudah dipakai ${voucher.terpakai}×. Kosongkan bila tanpa batas.`
              : 'Kosongkan bila tanpa batas.'
          }
        >
          <Teks
            name="kuota"
            type="number"
            min={1}
            defaultValue={voucher?.kuota ?? ''}
            placeholder="100"
          />
        </Bidang>

        <div className="grid gap-4 sm:grid-cols-2">
          <Bidang label="Mulai berlaku" nama="mulai" galat={g.mulai}>
            <Teks name="mulai" type="datetime-local" defaultValue={keInputLokal(voucher?.mulai)} />
          </Bidang>
          <Bidang label="Berakhir" nama="selesai" galat={g.selesai}>
            <Teks
              name="selesai"
              type="datetime-local"
              defaultValue={keInputLokal(voucher?.selesai)}
            />
          </Bidang>
        </div>

        <Sakelar
          nama="aktif"
          label="Voucher aktif"
          petunjuk="Matikan untuk menghentikan kode ini tanpa menghapusnya."
          bawaan={voucher?.aktif ?? true}
        />
      </Bagian>

      <Bagian
        judul="Cakupan Produk"
        deskripsi="Menentukan produk mana yang ikut dihitung saat voucher dipakai."
      >
        <div className="space-y-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-neutral-200 p-3 hover:bg-neutral-50">
            <input
              type="radio"
              name="_cakupan"
              checked={cakupan === 'semua'}
              onChange={() => setCakupan('semua')}
              className="mt-0.5 h-4 w-4 border-neutral-300 text-merek-600 focus:ring-merek-500"
            />
            <span>
              <span className="block text-sm font-medium text-neutral-800">Semua produk</span>
              <span className="mt-0.5 block text-xs text-neutral-500">
                Potongan dihitung dari seluruh isi keranjang.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-neutral-200 p-3 hover:bg-neutral-50">
            <input
              type="radio"
              name="_cakupan"
              checked={cakupan === 'pilih'}
              onChange={() => setCakupan('pilih')}
              className="mt-0.5 h-4 w-4 border-neutral-300 text-merek-600 focus:ring-merek-500"
            />
            <span>
              <span className="block text-sm font-medium text-neutral-800">
                Produk atau kategori tertentu
              </span>
              <span className="mt-0.5 block text-xs text-neutral-500">
                Produk di luar pilihan tetap dibayar penuh.
              </span>
            </span>
          </label>
        </div>

        {cakupan === 'pilih' && terpotong && (
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Katalog terlalu besar untuk dimuat seluruhnya, jadi sebagian produk tidak muncul di
            daftar bawah. Batasi cakupan lewat kategori agar tidak ada produk yang terlewat.
          </p>
        )}

        {cakupan === 'pilih' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <PilihBanyak
              judul="Kategori"
              nama="kategoriIds"
              kosong="Belum ada kategori."
              pilihan={kategori.map((k) => ({
                id: k.id,
                utama: k.induk ? `${k.induk.nama} › ${k.nama}` : k.nama,
                sekunder: `${k.jumlahProduk} produk`,
              }))}
              terpilihAwal={voucher?.kategoriIds ?? []}
            />
            <PilihBanyak
              judul="Produk"
              nama="produkIds"
              kosong="Belum ada produk."
              pilihan={produk.map((p) => ({
                id: p.id,
                utama: p.nama,
                sekunder: `${p.sku} · ${rupiah(p.harga)}`,
              }))}
              terpilihAwal={voucher?.produkIds ?? []}
              bisaCari
            />
          </div>
        )}
      </Bagian>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={menunggu}
          className="rounded-lg bg-merek-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-merek-800 disabled:opacity-60"
        >
          {menunggu ? 'Menyimpan...' : 'Simpan voucher'}
        </button>
        <Link
          href="/admin/voucher"
          className="rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
        >
          Batal
        </Link>
      </div>
    </form>
  );
}

interface OpsiPilih {
  id: string;
  utama: string;
  sekunder: string;
}

/**
 * Daftar centang dengan pencarian. Pencarian hanya menyaring tampilan —
 * item yang sudah dicentang lalu tersembunyi oleh filter tetap ikut terkirim,
 * karena checkbox-nya dirender sebagai hidden input, bukan dilepas dari DOM.
 */
function PilihBanyak({
  judul,
  nama,
  pilihan,
  terpilihAwal,
  kosong,
  bisaCari,
}: {
  judul: string;
  nama: string;
  pilihan: OpsiPilih[];
  terpilihAwal: string[];
  kosong: string;
  bisaCari?: boolean;
}) {
  const [terpilih, setTerpilih] = useState<Set<string>>(new Set(terpilihAwal));
  const [cari, setCari] = useState('');

  const tersaring = useMemo(() => {
    const kunci = cari.trim().toLowerCase();
    if (!kunci) return pilihan;
    return pilihan.filter(
      (p) =>
        p.utama.toLowerCase().includes(kunci) || p.sekunder.toLowerCase().includes(kunci),
    );
  }, [cari, pilihan]);

  function alihkan(id: string) {
    setTerpilih((lama) => {
      const baru = new Set(lama);
      if (baru.has(id)) baru.delete(id);
      else baru.add(id);
      return baru;
    });
  }

  return (
    <div className="rounded-lg border border-neutral-200">
      <div className="flex items-center justify-between gap-2 border-b border-neutral-200 px-3 py-2">
        <span className="text-sm font-medium text-neutral-800">{judul}</span>
        <span className="text-xs text-neutral-500">{terpilih.size} dipilih</span>
      </div>

      {bisaCari && pilihan.length > 8 && (
        <div className="border-b border-neutral-200 p-2">
          <input
            type="search"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder={`Cari ${judul.toLowerCase()}...`}
            className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm focus:border-merek-500 focus:outline-none"
          />
        </div>
      )}

      <div className="max-h-64 overflow-y-auto p-1">
        {pilihan.length === 0 ? (
          <p className="px-3 py-4 text-sm text-neutral-500">{kosong}</p>
        ) : tersaring.length === 0 ? (
          <p className="px-3 py-4 text-sm text-neutral-500">Tidak ada yang cocok.</p>
        ) : (
          tersaring.map((p) => (
            <label
              key={p.id}
              className="flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-1.5 hover:bg-neutral-50"
            >
              <input
                type="checkbox"
                checked={terpilih.has(p.id)}
                onChange={() => alihkan(p.id)}
                className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-merek-600 focus:ring-merek-500"
              />
              <span className="min-w-0">
                <span className="block truncate text-sm text-neutral-800">{p.utama}</span>
                <span className="block truncate text-xs text-neutral-500">{p.sekunder}</span>
              </span>
            </label>
          ))
        )}
      </div>

      {[...terpilih].map((id) => (
        <input key={id} type="hidden" name={nama} value={id} />
      ))}
    </div>
  );
}
