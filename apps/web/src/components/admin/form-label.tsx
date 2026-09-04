'use client';

import Link from 'next/link';
import { startTransition, useActionState, useState } from 'react';
import { simpanLabel, type HasilForm } from '@/app/admin/actions-promo';
import { Bagian, Bidang, Sakelar, Teks } from './bidang';
import { keInputLokal } from './waktu-lokal';
import type { LabelAdmin } from '@/lib/types';

const awal: HasilForm = { ok: false };

/** Warna siap pakai yang kontrasnya sudah aman dengan teks putih di lencana. */
const WARNA_SARAN = [
  { nilai: '#dc2626', nama: 'Merah — Flash Sale' },
  { nilai: '#c96442', nama: 'Terakota — merek' },
  { nilai: '#ea580c', nama: 'Oranye — Diskon' },
  { nilai: '#16a34a', nama: 'Hijau — Baru' },
  { nilai: '#2563eb', nama: 'Biru — Pilihan' },
  { nilai: '#7c3aed', nama: 'Ungu — Terbatas' },
  { nilai: '#171717', nama: 'Hitam — Eksklusif' },
];

export function FormLabel({ label }: { label?: LabelAdmin }) {
  const [status, kirim, menunggu] = useActionState(simpanLabel, awal);
  const [nama, setNama] = useState(label?.nama ?? '');
  const [warna, setWarna] = useState(label?.warna ?? '#dc2626');

  const g = status.galatField ?? {};

  function tanganiSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => kirim(formData));
  }

  return (
    <form onSubmit={tanganiSubmit} className="space-y-5">
      {label && <input type="hidden" name="id" value={label.id} />}

      {status.galat && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {status.galat}
        </p>
      )}

      <Bagian
        judul="Tampilan Label"
        deskripsi="Label muncul sebagai lencana di pojok kartu produk dan di halaman detail."
      >
        <Bidang label="Nama label" nama="nama" galat={g.nama} wajib>
          <Teks
            name="nama"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            required
            maxLength={40}
            placeholder="Flash Sale"
          />
        </Bidang>

        <Bidang label="Warna lencana" nama="warna" galat={g.warna}>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="color"
              name="warna"
              id="warna"
              value={warna}
              onChange={(e) => setWarna(e.target.value)}
              className="h-10 w-16 cursor-pointer rounded-lg border border-neutral-300 bg-white p-1"
            />
            <div className="flex flex-wrap gap-1.5">
              {WARNA_SARAN.map((w) => (
                <button
                  key={w.nilai}
                  type="button"
                  title={w.nama}
                  onClick={() => setWarna(w.nilai)}
                  aria-label={`Pakai warna ${w.nama}`}
                  aria-pressed={warna.toLowerCase() === w.nilai}
                  className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
                    warna.toLowerCase() === w.nilai
                      ? 'border-neutral-900'
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: w.nilai }}
                />
              ))}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-lg bg-neutral-100 p-3">
            <span className="text-xs text-neutral-500">Pratinjau:</span>
            <span
              className="rounded-md px-2 py-1 text-xs font-semibold text-white"
              style={{ backgroundColor: warna }}
            >
              {nama.trim() || 'Nama Label'}
            </span>
          </div>
        </Bidang>

        <Bidang
          label="Slug"
          nama="slug"
          galat={g.slug}
          petunjuk="Kosongkan agar dibuat otomatis dari nama."
        >
          <Teks name="slug" defaultValue={label?.slug} placeholder="flash-sale" />
        </Bidang>

        <Bidang
          label="Urutan tampil"
          nama="urutan"
          galat={g.urutan}
          petunjuk="Bila satu produk punya beberapa label, angka terkecil tampil paling atas."
        >
          <Teks name="urutan" type="number" min={0} defaultValue={label?.urutan ?? 0} />
        </Bidang>
      </Bagian>

      <Bagian
        judul="Jadwal Tayang"
        deskripsi="Kosongkan keduanya agar label tampil terus selama masih aktif. Label yang lewat jadwalnya hilang sendiri dari etalase tanpa perlu dimatikan manual."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Bidang label="Mulai tayang" nama="mulai" galat={g.mulai}>
            <Teks
              name="mulai"
              type="datetime-local"
              defaultValue={keInputLokal(label?.mulai)}
            />
          </Bidang>
          <Bidang label="Selesai tayang" nama="selesai" galat={g.selesai}>
            <Teks
              name="selesai"
              type="datetime-local"
              defaultValue={keInputLokal(label?.selesai)}
            />
          </Bidang>
        </div>

        <Sakelar
          nama="aktif"
          label="Label aktif"
          petunjuk="Matikan untuk menyembunyikan lencana ini dari semua produk sekaligus."
          bawaan={label?.aktif ?? true}
        />
      </Bagian>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={menunggu}
          className="rounded-lg bg-merek-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-merek-800 disabled:opacity-60"
        >
          {menunggu ? 'Menyimpan...' : 'Simpan label'}
        </button>
        <Link
          href="/admin/label"
          className="rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
        >
          Batal
        </Link>
      </div>
    </form>
  );
}
