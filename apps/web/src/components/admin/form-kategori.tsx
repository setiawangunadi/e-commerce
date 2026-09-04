'use client';

import Link from 'next/link';
import { startTransition, useActionState } from 'react';
import { simpanKategori, type HasilForm } from '@/app/admin/actions-promo';
import { AreaTeks, Bagian, Bidang, Pilihan, Sakelar, Teks } from './bidang';
import type { KategoriAdmin } from '@/lib/types';

const awal: HasilForm = { ok: false };

export function FormKategori({
  kategori,
  semua,
}: {
  kategori?: KategoriAdmin;
  semua: KategoriAdmin[];
}) {
  const [status, kirim, menunggu] = useActionState(simpanKategori, awal);
  const g = status.galatField ?? {};

  // Kandidat induk: hanya kategori tingkat atas, dan bukan dirinya sendiri.
  // Kategori yang sudah punya anak juga dikecualikan agar tidak muncul pilihan
  // yang pasti ditolak API (struktur dibatasi dua tingkat).
  const kandidatInduk = semua.filter(
    (k) => !k.parentId && k.id !== kategori?.id,
  );
  const punyaAnak = (kategori?.jumlahAnak ?? 0) > 0;

  function tanganiSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => kirim(formData));
  }

  return (
    <form onSubmit={tanganiSubmit} className="space-y-5">
      {kategori && <input type="hidden" name="id" value={kategori.id} />}

      {status.galat && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {status.galat}
        </p>
      )}

      <Bagian
        judul="Data Kategori"
        deskripsi="Kategori dipakai pembeli untuk menelusuri produk di halaman /kategori."
      >
        <Bidang label="Nama kategori" nama="nama" galat={g.nama} wajib>
          <Teks name="nama" defaultValue={kategori?.nama} required placeholder="Fashion" />
        </Bidang>

        <Bidang
          label="Slug URL"
          nama="slug"
          galat={g.slug}
          petunjuk="Kosongkan agar dibuat otomatis dari nama."
        >
          <Teks name="slug" defaultValue={kategori?.slug} placeholder="fashion" />
        </Bidang>

        <Bidang
          label="Kategori induk"
          nama="parentId"
          galat={g.parentId}
          petunjuk={
            punyaAnak
              ? 'Kategori ini sudah punya sub-kategori, jadi tidak bisa dijadikan sub-kategori lain.'
              : 'Kosongkan untuk kategori tingkat atas. Struktur dibatasi dua tingkat.'
          }
        >
          <Pilihan name="parentId" defaultValue={kategori?.parentId ?? ''} disabled={punyaAnak}>
            <option value="">— Kategori tingkat atas —</option>
            {kandidatInduk.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama}
              </option>
            ))}
          </Pilihan>
        </Bidang>

        <Bidang label="Deskripsi" nama="deskripsi" galat={g.deskripsi}>
          <AreaTeks
            name="deskripsi"
            rows={3}
            defaultValue={kategori?.deskripsi ?? ''}
            placeholder="Pakaian dan aksesori sehari-hari"
          />
        </Bidang>

        <Bidang
          label="Urutan tampil"
          nama="urutan"
          galat={g.urutan}
          petunjuk="Angka lebih kecil tampil lebih dulu."
        >
          <Teks name="urutan" type="number" min={0} defaultValue={kategori?.urutan ?? 0} />
        </Bidang>

        <Sakelar
          nama="aktif"
          label="Tampilkan di etalase"
          petunjuk="Kategori nonaktif tidak muncul di navigasi pembeli, produknya tetap bisa diakses."
          bawaan={kategori?.aktif ?? true}
        />
      </Bagian>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={menunggu}
          className="rounded-lg bg-merek-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-merek-800 disabled:opacity-60"
        >
          {menunggu ? 'Menyimpan...' : 'Simpan kategori'}
        </button>
        <Link
          href="/admin/kategori"
          className="rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
        >
          Batal
        </Link>
      </div>
    </form>
  );
}
