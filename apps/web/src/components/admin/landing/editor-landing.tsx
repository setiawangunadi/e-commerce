'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { simpanLanding, type MuatanLanding } from '@/app/admin/actions-landing';
import { Bagian, Bidang, Pilihan, Teks, AreaTeks } from '@/components/admin/bidang';
import { FormBlok } from './form-blok';
import { INFO_BLOK, URUTAN_JENIS, kontenAwal } from './jenis-blok';
import type { JenisBlok, KartuProduk, LandingAdmin, StatusLanding } from '@/lib/types';

interface BlokEditor {
  /** Kunci lokal agar React tetap bisa membedakan baris setelah diurutkan. */
  kunci: string;
  tipe: JenisBlok;
  aktif: boolean;
  konten: Record<string, unknown>;
}

function keInputLokal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function keIso(nilai: string): string | null {
  if (!nilai) return null;
  const d = new Date(nilai);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function EditorLanding({
  landing,
  produk,
}: {
  landing?: LandingAdmin;
  produk: KartuProduk[];
}) {
  const router = useRouter();
  const [menunggu, mulai] = useTransition();
  const [galat, setGalat] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);

  const [pengaturan, setPengaturan] = useState({
    nama: landing?.nama ?? '',
    slug: landing?.slug ?? '',
    status: (landing?.status ?? 'DRAFT') as StatusLanding,
    judulMeta: landing?.judulMeta ?? '',
    deskripsiMeta: landing?.deskripsiMeta ?? '',
    gambarOg: landing?.gambarOg ?? '',
    metaPixelId: landing?.metaPixelId ?? '',
    ga4Id: landing?.ga4Id ?? '',
    googleAdsId: landing?.googleAdsId ?? '',
    googleAdsLabel: landing?.googleAdsLabel ?? '',
    gtmId: landing?.gtmId ?? '',
    warnaAksen: landing?.warnaAksen ?? '#c96442',
    mulaiTayang: keInputLokal(landing?.mulaiTayang ?? null),
    selesaiTayang: keInputLokal(landing?.selesaiTayang ?? null),
  });

  const [blok, setBlok] = useState<BlokEditor[]>(
    landing?.blok.map((b, i) => ({
      kunci: `${b.id}-${i}`,
      tipe: b.tipe,
      aktif: b.aktif,
      konten: b.konten,
    })) ?? [],
  );

  const [terbuka, setTerbuka] = useState<string | null>(null);

  const ubahPengaturan = (t: Partial<typeof pengaturan>) => setPengaturan((p) => ({ ...p, ...t }));

  function tambahBlok(tipe: JenisBlok) {
    const kunci = `baru-${Date.now()}`;
    setBlok((b) => [...b, { kunci, tipe, aktif: true, konten: kontenAwal(tipe) }]);
    setTerbuka(kunci);
  }

  function geser(indeks: number, arah: -1 | 1) {
    const tujuan = indeks + arah;
    if (tujuan < 0 || tujuan >= blok.length) return;
    setBlok((b) => {
      const baru = [...b];
      [baru[indeks], baru[tujuan]] = [baru[tujuan]!, baru[indeks]!];
      return baru;
    });
  }

  function simpan() {
    setGalat(null);
    setPesan(null);

    const muatan: MuatanLanding = {
      nama: pengaturan.nama,
      slug: pengaturan.slug || undefined,
      status: pengaturan.status,
      judulMeta: pengaturan.judulMeta || null,
      deskripsiMeta: pengaturan.deskripsiMeta || null,
      gambarOg: pengaturan.gambarOg || null,
      metaPixelId: pengaturan.metaPixelId || null,
      ga4Id: pengaturan.ga4Id || null,
      googleAdsId: pengaturan.googleAdsId || null,
      googleAdsLabel: pengaturan.googleAdsLabel || null,
      gtmId: pengaturan.gtmId || null,
      warnaAksen: pengaturan.warnaAksen,
      mulaiTayang: keIso(pengaturan.mulaiTayang),
      selesaiTayang: keIso(pengaturan.selesaiTayang),
      blok: blok.map((b) => ({ tipe: b.tipe, aktif: b.aktif, konten: b.konten })),
    };

    mulai(async () => {
      const hasil = await simpanLanding(landing?.id ?? null, muatan);
      if (!hasil.ok) {
        setGalat(hasil.galat ?? 'Gagal menyimpan');
        return;
      }
      if (!landing?.id && hasil.id) {
        router.push(`/admin/landing/${hasil.id}`);
        return;
      }
      setPesan('Perubahan tersimpan.');
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {galat && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {galat}
        </p>
      )}
      {pesan && (
        <p className="rounded-lg bg-merek-50 px-4 py-3 text-sm text-merek-800">{pesan}</p>
      )}

      <Bagian judul="Pengaturan Kampanye">
        <div className="grid gap-4 sm:grid-cols-2">
          <Bidang label="Nama kampanye" nama="nama" petunjuk="Hanya terlihat di panel admin" wajib>
            <Teks
              name="nama"
              value={pengaturan.nama}
              onChange={(e) => ubahPengaturan({ nama: e.target.value })}
              placeholder="Promo Ramadan — Tas Kanvas"
            />
          </Bidang>

          <Bidang
            label="Alamat halaman"
            nama="slug"
            petunjuk={`Akan tayang di /lp/${pengaturan.slug || 'otomatis-dari-nama'}`}
          >
            <Teks
              name="slug"
              value={pengaturan.slug}
              onChange={(e) =>
                ubahPengaturan({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })
              }
              placeholder="promo-ramadan"
            />
          </Bidang>

          <Bidang label="Status" nama="status" wajib>
            <Pilihan
              name="status"
              value={pengaturan.status}
              onChange={(e) => ubahPengaturan({ status: e.target.value as StatusLanding })}
            >
              <option value="DRAFT">Draft — belum bisa diakses</option>
              <option value="PUBLISHED">Terbit — siap dipakai iklan</option>
              <option value="ARCHIVED">Arsip — kampanye selesai</option>
            </Pilihan>
          </Bidang>

          <Bidang label="Warna aksen" nama="warnaAksen" petunjuk="Warna tombol & sorotan">
            <div className="flex gap-2">
              <input
                type="color"
                value={pengaturan.warnaAksen}
                onChange={(e) => ubahPengaturan({ warnaAksen: e.target.value })}
                className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-neutral-300"
              />
              <Teks
                name="warnaAksen"
                value={pengaturan.warnaAksen}
                onChange={(e) => ubahPengaturan({ warnaAksen: e.target.value })}
              />
            </div>
          </Bidang>

          <Bidang label="Mulai tayang" nama="mulaiTayang" petunjuk="Opsional">
            <Teks
              name="mulaiTayang"
              type="datetime-local"
              value={pengaturan.mulaiTayang}
              onChange={(e) => ubahPengaturan({ mulaiTayang: e.target.value })}
            />
          </Bidang>

          <Bidang label="Selesai tayang" nama="selesaiTayang" petunjuk="Opsional">
            <Teks
              name="selesaiTayang"
              type="datetime-local"
              value={pengaturan.selesaiTayang}
              onChange={(e) => ubahPengaturan({ selesaiTayang: e.target.value })}
            />
          </Bidang>
        </div>
      </Bagian>

      <Bagian
        judul="Pelacakan Iklan"
        deskripsi="ID diisi per kampanye. Skrip baru dimuat setelah pengunjung menyetujui cookie."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Bidang label="Meta Pixel ID" nama="metaPixelId" petunjuk="10–20 digit angka">
            <Teks
              name="metaPixelId"
              value={pengaturan.metaPixelId}
              onChange={(e) => ubahPengaturan({ metaPixelId: e.target.value })}
              placeholder="1234567890123456"
            />
          </Bidang>

          <Bidang label="ID GA4" nama="ga4Id" petunjuk="Format G-XXXXXXXXXX">
            <Teks
              name="ga4Id"
              value={pengaturan.ga4Id}
              onChange={(e) => ubahPengaturan({ ga4Id: e.target.value })}
              placeholder="G-ABCDE12345"
            />
          </Bidang>

          <Bidang label="ID Google Ads" nama="googleAdsId" petunjuk="Format AW-123456789">
            <Teks
              name="googleAdsId"
              value={pengaturan.googleAdsId}
              onChange={(e) => ubahPengaturan({ googleAdsId: e.target.value })}
              placeholder="AW-123456789"
            />
          </Bidang>

          <Bidang
            label="Label konversi Google Ads"
            nama="googleAdsLabel"
            petunjuk="Dari halaman setup konversi di Google Ads"
          >
            <Teks
              name="googleAdsLabel"
              value={pengaturan.googleAdsLabel}
              onChange={(e) => ubahPengaturan({ googleAdsLabel: e.target.value })}
              placeholder="AbC-D_efG12345"
            />
          </Bidang>

          <Bidang label="ID GTM" nama="gtmId" petunjuk="Opsional, format GTM-XXXXXXX">
            <Teks
              name="gtmId"
              value={pengaturan.gtmId}
              onChange={(e) => ubahPengaturan({ gtmId: e.target.value })}
              placeholder="GTM-ABC1234"
            />
          </Bidang>
        </div>
      </Bagian>

      <Bagian
        judul="Pratinjau Tautan"
        deskripsi="Yang muncul saat tautan kampanye dibagikan di WhatsApp atau media sosial."
      >
        <Bidang label="Judul" nama="judulMeta">
          <Teks
            name="judulMeta"
            value={pengaturan.judulMeta}
            onChange={(e) => ubahPengaturan({ judulMeta: e.target.value })}
            placeholder={pengaturan.nama || 'Judul yang menarik untuk diklik'}
          />
        </Bidang>

        <Bidang label="Deskripsi" nama="deskripsiMeta">
          <AreaTeks
            name="deskripsiMeta"
            rows={2}
            value={pengaturan.deskripsiMeta}
            onChange={(e) => ubahPengaturan({ deskripsiMeta: e.target.value })}
          />
        </Bidang>

        <Bidang label="URL gambar pratinjau" nama="gambarOg" petunjuk="Rasio 1.91:1, mis. 1200×630">
          <Teks
            name="gambarOg"
            value={pengaturan.gambarOg}
            onChange={(e) => ubahPengaturan({ gambarOg: e.target.value })}
            placeholder="https://..."
          />
        </Bidang>
      </Bagian>

      {/* --- Blok --- */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Isi Halaman</h2>
            <p className="mt-0.5 text-sm text-neutral-600">
              Susun dari atas ke bawah. {blok.length} blok.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {blok.length === 0 && (
            <p className="rounded-lg bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-600">
              Belum ada blok. Tambahkan dari pilihan di bawah.
            </p>
          )}

          {blok.map((b, i) => {
            const info = INFO_BLOK[b.tipe];
            const dibuka = terbuka === b.kunci;

            return (
              <div key={b.kunci} className="rounded-lg border border-neutral-200">
                <div className="flex items-center gap-2 p-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-xs font-semibold text-neutral-600">
                    {i + 1}
                  </span>

                  <button
                    type="button"
                    onClick={() => setTerbuka(dibuka ? null : b.kunci)}
                    className="min-w-0 flex-1 text-left"
                    aria-expanded={dibuka}
                  >
                    <span className="block text-sm font-medium text-neutral-900">
                      {info.label}
                      {!b.aktif && (
                        <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-500">
                          NONAKTIF
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-xs text-neutral-500">
                      {info.keterangan}
                    </span>
                  </button>

                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => geser(i, -1)}
                      disabled={i === 0}
                      aria-label="Pindah ke atas"
                      className="rounded px-2 py-1 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30"
                    >
                      &uarr;
                    </button>
                    <button
                      type="button"
                      onClick={() => geser(i, 1)}
                      disabled={i === blok.length - 1}
                      aria-label="Pindah ke bawah"
                      className="rounded px-2 py-1 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30"
                    >
                      &darr;
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setBlok((s) => s.map((x, y) => (y === i ? { ...x, aktif: !x.aktif } : x)))
                      }
                      className="rounded px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
                    >
                      {b.aktif ? 'Sembunyikan' : 'Tampilkan'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBlok((s) => s.filter((_, y) => y !== i))}
                      className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Hapus
                    </button>
                  </div>
                </div>

                {dibuka && (
                  <div className="border-t border-neutral-200 p-4">
                    <FormBlok
                      tipe={b.tipe}
                      konten={b.konten}
                      produk={produk}
                      onUbah={(konten) =>
                        setBlok((s) => s.map((x, y) => (y === i ? { ...x, konten } : x)))
                      }
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 border-t border-neutral-200 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Tambah blok
          </p>
          <div className="flex flex-wrap gap-2">
            {URUTAN_JENIS.map((tipe) => (
              <button
                key={tipe}
                type="button"
                onClick={() => tambahBlok(tipe)}
                title={INFO_BLOK[tipe].keterangan}
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:border-merek-400 hover:bg-merek-50"
              >
                + {INFO_BLOK[tipe].label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 border-t border-neutral-200 bg-neutral-100/95 py-4 backdrop-blur">
        {landing && pengaturan.status === 'PUBLISHED' && (
          <Link
            href={`/lp/${landing.slug}`}
            target="_blank"
            className="mr-auto text-sm font-medium text-merek-700 hover:text-merek-800"
          >
            Lihat halaman ↗
          </Link>
        )}
        <Link
          href="/admin/landing"
          className="rounded-lg border border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Kembali
        </Link>
        <button
          type="button"
          onClick={simpan}
          disabled={menunggu}
          className="rounded-lg bg-merek-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-merek-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {menunggu ? 'Menyimpan...' : landing ? 'Simpan Perubahan' : 'Buat Landing Page'}
        </button>
      </div>
    </div>
  );
}
