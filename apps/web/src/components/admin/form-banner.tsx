'use client';

import Image from 'next/image';
import Link from 'next/link';
import { startTransition, useActionState, useRef, useState, useTransition } from 'react';
import { simpanBanner, type HasilBanner } from '@/app/admin/actions-banner';
import { unggahGambar } from '@/app/admin/actions-produk';
import { AreaTeks, Bagian, Bidang, Sakelar, Teks } from './bidang';
import type { BannerAdmin } from '@/lib/types';

const awal: HasilBanner = { ok: false };

/** "2026-08-20T09:00:00.000Z" -> "2026-08-20T16:00" di zona waktu peramban. */
function keInputLokal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

export function FormBanner({ banner }: { banner?: BannerAdmin }) {
  const [status, kirim, menunggu] = useActionState(simpanBanner, awal);
  const [gambarUrl, setGambarUrl] = useState(banner?.gambarUrl ?? '');
  const [gambarMobileUrl, setGambarMobileUrl] = useState(banner?.gambarMobileUrl ?? '');

  const g = status.galatField ?? {};

  // Sama seperti form produk: action dipanggil manual agar React tidak
  // mereset form dan menghapus isian saat validasi gagal.
  function tanganiSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => kirim(formData));
  }

  return (
    <form onSubmit={tanganiSubmit} className="space-y-5">
      {banner && <input type="hidden" name="id" value={banner.id} />}
      <input type="hidden" name="gambarUrl" value={gambarUrl} />
      <input type="hidden" name="gambarMobileUrl" value={gambarMobileUrl} />

      {status.galat && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {status.galat}
        </p>
      )}

      <Bagian
        judul="Gambar Banner"
        deskripsi="Rasio yang disarankan 8:3 (misal 1600×600 px). Gambar akan dipangkas otomatis di layar sempit."
      >
        <Bidang label="Gambar utama" nama="gambarUrl" galat={g.gambarUrl} wajib>
          <PemilihGambar nilai={gambarUrl} onBerubah={setGambarUrl} rasio="aspect-[8/3]" />
        </Bidang>

        <Bidang
          label="Gambar khusus mobile"
          nama="gambarMobileUrl"
          galat={g.gambarMobileUrl}
          petunjuk="Opsional. Bila kosong, gambar utama dipakai juga di layar sempit."
        >
          <PemilihGambar
            nilai={gambarMobileUrl}
            onBerubah={setGambarMobileUrl}
            rasio="aspect-[4/3]"
          />
        </Bidang>
      </Bagian>

      <Bagian judul="Teks">
        <Bidang label="Judul" nama="judul" galat={g.judul} wajib>
          <Teks
            name="judul"
            defaultValue={banner?.judul}
            required
            placeholder="Koleksi Terbaru SRN Cullezione"
          />
        </Bidang>

        <Bidang
          label="Subjudul"
          nama="subjudul"
          galat={g.subjudul}
          petunjuk="Satu kalimat pendukung di bawah judul"
        >
          <AreaTeks
            name="subjudul"
            rows={2}
            maxLength={200}
            defaultValue={banner?.subjudul ?? ''}
            placeholder="Bahan pilihan, dijahit rapi, dikirim langsung dari gudang kami"
          />
        </Bidang>
      </Bagian>

      <Bagian
        judul="Tombol"
        deskripsi="Kosongkan keduanya bila banner ini tidak perlu tombol."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Bidang label="Teks tombol" nama="teksTombol" galat={g.teksTombol}>
            <Teks
              name="teksTombol"
              maxLength={40}
              defaultValue={banner?.teksTombol ?? ''}
              placeholder="Mulai Belanja"
            />
          </Bidang>

          <Bidang
            label="Tautan tombol"
            nama="tautanTombol"
            galat={g.tautanTombol}
            petunjuk="Path internal saja, contoh: /produk atau /kategori/aksesoris"
          >
            <Teks
              name="tautanTombol"
              defaultValue={banner?.tautanTombol ?? ''}
              placeholder="/produk"
            />
          </Bidang>
        </div>
      </Bagian>

      <Bagian judul="Tayang">
        <div className="grid gap-4 sm:grid-cols-2">
          <Bidang
            label="Urutan"
            nama="urutan"
            galat={g.urutan}
            petunjuk="Angka kecil tampil lebih dulu"
          >
            <Teks name="urutan" type="number" min={0} defaultValue={banner?.urutan ?? 0} />
          </Bidang>

          <div className="flex items-end">
            <div className="w-full">
              <Sakelar
                nama="aktif"
                label="Tayangkan banner ini"
                petunjuk="Nonaktifkan untuk menyembunyikan tanpa menghapus"
                bawaan={banner?.aktif ?? true}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Bidang
            label="Mulai tayang"
            nama="mulaiTayang"
            galat={g.mulaiTayang}
            petunjuk="Opsional — untuk promo terjadwal"
          >
            <Teks
              name="mulaiTayang"
              type="datetime-local"
              defaultValue={keInputLokal(banner?.mulaiTayang ?? null)}
            />
          </Bidang>

          <Bidang
            label="Selesai tayang"
            nama="selesaiTayang"
            galat={g.selesaiTayang}
            petunjuk="Opsional — banner berhenti tampil setelah waktu ini"
          >
            <Teks
              name="selesaiTayang"
              type="datetime-local"
              defaultValue={keInputLokal(banner?.selesaiTayang ?? null)}
            />
          </Bidang>
        </div>
      </Bagian>

      <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 border-t border-neutral-200 bg-neutral-100/95 py-4 backdrop-blur">
        <Link
          href="/admin/banner"
          className="rounded-lg border border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Batal
        </Link>
        <button
          type="submit"
          disabled={menunggu}
          className="rounded-lg bg-merek-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-merek-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {menunggu ? 'Menyimpan...' : banner ? 'Simpan Perubahan' : 'Simpan Banner'}
        </button>
      </div>
    </form>
  );
}

function PemilihGambar({
  nilai,
  onBerubah,
  rasio,
}: {
  nilai: string;
  onBerubah: (url: string) => void;
  rasio: string;
}) {
  const [galat, setGalat] = useState<string | null>(null);
  const [mengunggah, mulai] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function pilihBerkas(e: React.ChangeEvent<HTMLInputElement>) {
    const berkas = e.target.files?.[0];
    if (!berkas) return;

    setGalat(null);
    const formData = new FormData();
    formData.append('file', berkas);

    mulai(async () => {
      const hasil = await unggahGambar(formData);
      if (hasil.ok && hasil.url) onBerubah(hasil.url);
      else setGalat(hasil.galat ?? 'Gagal mengunggah gambar');
      if (inputRef.current) inputRef.current.value = '';
    });
  }

  return (
    <div>
      {nilai && (
        <div className={`relative ${rasio} mb-3 overflow-hidden rounded-lg bg-neutral-100`}>
          <Image src={nilai} alt="Pratinjau banner" fill sizes="600px" className="object-cover" />
          <button
            type="button"
            onClick={() => onBerubah('')}
            className="absolute right-2 top-2 rounded-lg bg-neutral-900/70 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-neutral-900"
          >
            Hapus
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={mengunggah}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          {mengunggah ? 'Mengunggah...' : nilai ? 'Ganti gambar' : '+ Unggah gambar'}
        </button>
        <span className="text-xs text-neutral-500">JPG, PNG, WebP, atau AVIF &middot; maks 5 MB</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        onChange={pilihBerkas}
        className="hidden"
      />

      {galat && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {galat}
        </p>
      )}
    </div>
  );
}
