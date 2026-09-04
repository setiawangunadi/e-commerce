'use client';

import Link from 'next/link';
import { startTransition, useActionState } from 'react';
import { simpanMerek, type HasilForm } from '@/app/admin/actions-promo';
import { AreaTeks, Bagian, Bidang, Sakelar, Teks } from './bidang';
import type { MerekAdmin } from '@/lib/types';

const awal: HasilForm = { ok: false };

export function FormMerek({ merek }: { merek?: MerekAdmin }) {
  const [status, kirim, menunggu] = useActionState(simpanMerek, awal);
  const g = status.galatField ?? {};

  function tanganiSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => kirim(formData));
  }

  return (
    <form onSubmit={tanganiSubmit} className="space-y-5">
      {merek && <input type="hidden" name="id" value={merek.id} />}

      {status.galat && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {status.galat}
        </p>
      )}

      <Bagian
        judul="Data Merek"
        deskripsi="Merek tampil di kartu produk dan bisa dipakai pembeli untuk menyaring etalase."
      >
        <Bidang label="Nama merek" nama="nama" galat={g.nama} wajib>
          <Teks name="nama" defaultValue={merek?.nama} required placeholder="Zyrabelle" />
        </Bidang>

        <Bidang
          label="Slug URL"
          nama="slug"
          galat={g.slug}
          petunjuk="Kosongkan agar dibuat otomatis dari nama."
        >
          <Teks name="slug" defaultValue={merek?.slug} placeholder="zyrabelle" />
        </Bidang>

        <Bidang label="Deskripsi" nama="deskripsi" galat={g.deskripsi}>
          <AreaTeks
            name="deskripsi"
            rows={3}
            defaultValue={merek?.deskripsi ?? ''}
            placeholder="Busana wanita untuk keseharian"
          />
        </Bidang>

        <Bidang
          label="URL logo"
          nama="logoUrl"
          galat={g.logoUrl}
          petunjuk="Opsional. Isi dengan alamat gambar logo bila ada."
        >
          <Teks name="logoUrl" defaultValue={merek?.logoUrl ?? ''} placeholder="/uploads/logo.png" />
        </Bidang>

        <Bidang
          label="Urutan tampil"
          nama="urutan"
          galat={g.urutan}
          petunjuk="Angka lebih kecil tampil lebih dulu."
        >
          <Teks name="urutan" type="number" min={0} defaultValue={merek?.urutan ?? 0} />
        </Bidang>

        <Sakelar
          nama="aktif"
          label="Tampilkan di etalase"
          petunjuk="Merek nonaktif tidak muncul di penyaring pembeli, produknya tetap bisa dibuka."
          bawaan={merek?.aktif ?? true}
        />
      </Bagian>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={menunggu}
          className="rounded-lg bg-merek-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-merek-800 disabled:opacity-60"
        >
          {menunggu ? 'Menyimpan...' : 'Simpan merek'}
        </button>
        <Link
          href="/admin/merek"
          className="rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
        >
          Batal
        </Link>
      </div>
    </form>
  );
}
