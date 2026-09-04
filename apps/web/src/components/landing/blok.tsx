import Image from 'next/image';
import Link from 'next/link';
import {
  IkonChat,
  IkonKembali,
  IkonPerisai,
  IkonTruk,
} from '@/components/ikon';
import { rupiah } from '@/lib/format';
import { HitungMundur } from './hitung-mundur';
import { TombolCtaLanding } from './tombol-cta';
import type { Blok, KartuProduk, TombolCta } from '@/lib/types';

interface Konteks {
  produk: KartuProduk[];
  warnaAksen: string;
}

/**
 * Merender satu blok sesuai jenisnya.
 *
 * Semua isi blok dirender sebagai teks biasa, tidak pernah sebagai HTML —
 * konten datang dari panel admin, dan `dangerouslySetInnerHTML` di sini akan
 * menjadikan akun admin yang dibajak sebagai jalan masuk XSS ke halaman iklan.
 */
export function RenderBlok({ blok, konteks }: { blok: Blok; konteks: Konteks }) {
  switch (blok.tipe) {
    case 'HERO':
      return <BlokHero konten={blok.konten as never} konteks={konteks} />;
    case 'PRODUK':
      return <BlokProduk konten={blok.konten as never} konteks={konteks} />;
    case 'KEUNGGULAN':
      return <BlokKeunggulan konten={blok.konten as never} konteks={konteks} />;
    case 'TESTIMONI':
      return <BlokTestimoni konten={blok.konten as never} />;
    case 'FAQ':
      return <BlokFaq konten={blok.konten as never} />;
    case 'HITUNG_MUNDUR':
      return <BlokHitungMundur konten={blok.konten as never} konteks={konteks} />;
    case 'CTA':
      return <BlokCta konten={blok.konten as never} konteks={konteks} />;
    case 'TEKS':
      return <BlokTeks konten={blok.konten as never} />;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------

const IKON = {
  truk: IkonTruk,
  perisai: IkonPerisai,
  kembali: IkonKembali,
  chat: IkonChat,
  bintang: IkonBintang,
  centang: IkonCentang,
} as const;

function Bagian({
  children,
  gelap = false,
  rapat = false,
}: {
  children: React.ReactNode;
  gelap?: boolean;
  rapat?: boolean;
}) {
  return (
    <section className={gelap ? 'bg-neutral-50' : 'bg-white'}>
      <div className={`kontainer-toko max-w-5xl ${rapat ? 'py-10' : 'py-12 sm:py-16'}`}>
        {children}
      </div>
    </section>
  );
}

function JudulBagian({ judul, subjudul }: { judul?: string | null; subjudul?: string | null }) {
  if (!judul && !subjudul) return null;
  return (
    <div className="mb-8 text-center">
      {judul && (
        <h2 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
          {judul}
        </h2>
      )}
      {subjudul && (
        <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-neutral-600">
          {subjudul}
        </p>
      )}
    </div>
  );
}

// --- HERO -------------------------------------------------------------------

function BlokHero({
  konten,
  konteks,
}: {
  konten: {
    badge: string | null;
    judul: string;
    subjudul: string | null;
    gambarUrl: string | null;
    tombol: TombolCta | null;
    poin: string[];
  };
  konteks: Konteks;
}) {
  return (
    <section className="bg-neutral-900 text-white">
      <div className="kontainer-toko max-w-5xl py-12 sm:py-16 lg:py-20">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <div>
            {konten.badge && (
              <span
                className="inline-block rounded-full px-3 py-1 text-xs font-semibold sm:text-sm"
                style={{ backgroundColor: konteks.warnaAksen }}
              >
                {konten.badge}
              </span>
            )}

            <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              {konten.judul}
            </h1>

            {konten.subjudul && (
              <p className="mt-4 text-base leading-relaxed text-neutral-300 sm:text-lg">
                {konten.subjudul}
              </p>
            )}

            {konten.poin.length > 0 && (
              <ul className="mt-6 space-y-2">
                {konten.poin.map((p, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-neutral-200">
                    <IkonCentang className="h-4 w-4 shrink-0" style={{ color: konteks.warnaAksen }} />
                    {p}
                  </li>
                ))}
              </ul>
            )}

            {konten.tombol && (
              <div className="mt-8">
                <TombolCtaLanding
                  tombol={konten.tombol}
                  produk={konteks.produk}
                  warnaAksen={konteks.warnaAksen}
                />
              </div>
            )}
          </div>

          {konten.gambarUrl && (
            <div className="relative aspect-4/3 overflow-hidden rounded-2xl bg-neutral-800 lg:aspect-square">
              <Image
                src={konten.gambarUrl}
                alt={konten.judul}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
                className="object-cover"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// --- PRODUK -----------------------------------------------------------------

function BlokProduk({
  konten,
  konteks,
}: {
  konten: {
    judul: string | null;
    subjudul: string | null;
    produkIds: string[];
    tampilkanTombol: boolean;
  };
  konteks: Konteks;
}) {
  // Urutan mengikuti pilihan admin, bukan urutan hasil query.
  const daftar = konten.produkIds
    .map((id) => konteks.produk.find((p) => p.id === id))
    .filter((p): p is KartuProduk => Boolean(p));

  if (daftar.length === 0) return null;

  return (
    <Bagian gelap>
      <JudulBagian judul={konten.judul} subjudul={konten.subjudul} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {daftar.map((p) => (
          <article
            key={p.id}
            className="flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white"
          >
            <Link
              href={`/produk/${p.slug}`}
              className="relative aspect-square bg-neutral-100"
              aria-label={p.nama}
            >
              {p.gambarUtama && (
                <Image
                  src={p.gambarUtama}
                  alt={p.nama}
                  fill
                  sizes="(max-width: 640px) 50vw, 33vw"
                  className="object-cover"
                />
              )}
              {p.diskonPersen !== null && (
                <span
                  className="absolute left-2 top-2 rounded-md px-2 py-1 text-xs font-semibold text-white"
                  style={{ backgroundColor: konteks.warnaAksen }}
                >
                  -{p.diskonPersen}%
                </span>
              )}
            </Link>

            <div className="flex flex-1 flex-col p-3 sm:p-4">
              <h3 className="line-clamp-2 text-sm font-medium text-neutral-900 sm:text-base">
                <Link href={`/produk/${p.slug}`} className="hover:underline">
                  {p.nama}
                </Link>
              </h3>

              <div className="mt-auto pt-3">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-base font-semibold text-neutral-900">
                    {rupiah(p.harga)}
                  </span>
                  {p.hargaCoret && (
                    <span className="text-xs text-neutral-400 line-through">
                      {rupiah(p.hargaCoret)}
                    </span>
                  )}
                </div>

                {konten.tampilkanTombol && (
                  <div className="mt-3">
                    <TombolCtaLanding
                      penuh
                      warnaAksen={konteks.warnaAksen}
                      produk={konteks.produk}
                      tombol={{
                        teks: p.punyaVarian ? 'Pilih Varian' : 'Beli Sekarang',
                        aksi: p.punyaVarian
                          ? {
                              tipe: 'tautan',
                              url: `/produk/${p.slug}`,
                              produkId: null,
                              varianId: null,
                              jumlah: 1,
                            }
                          : {
                              tipe: 'checkout',
                              produkId: p.id,
                              varianId: null,
                              jumlah: 1,
                              url: null,
                            },
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </Bagian>
  );
}

// --- KEUNGGULAN -------------------------------------------------------------

function BlokKeunggulan({
  konten,
  konteks,
}: {
  konten: {
    judul: string | null;
    items: { ikon: keyof typeof IKON; judul: string; teks: string | null }[];
  };
  konteks: Konteks;
}) {
  return (
    <Bagian>
      <JudulBagian judul={konten.judul} />

      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {konten.items.map((it, i) => {
          const Ikon = IKON[it.ikon] ?? IkonCentang;
          return (
            <li key={i} className="flex gap-3">
              <span
                className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: konteks.warnaAksen }}
              >
                <Ikon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-neutral-900">{it.judul}</p>
                {it.teks && (
                  <p className="mt-1 text-sm leading-relaxed text-neutral-600">{it.teks}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Bagian>
  );
}

// --- TESTIMONI --------------------------------------------------------------

function BlokTestimoni({
  konten,
}: {
  konten: {
    judul: string | null;
    items: { nama: string; kota: string | null; teks: string; rating: number }[];
  };
}) {
  return (
    <Bagian gelap>
      <JudulBagian judul={konten.judul} />

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {konten.items.map((t, i) => (
          <li key={i} className="rounded-xl border border-neutral-200 bg-white p-5">
            <div className="flex gap-0.5" aria-label={`${t.rating} dari 5 bintang`}>
              {Array.from({ length: 5 }, (_, b) => (
                <IkonBintang
                  key={b}
                  className={`h-4 w-4 ${b < t.rating ? 'text-amber-400' : 'text-neutral-200'}`}
                />
              ))}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-neutral-700">{t.teks}</p>
            <p className="mt-3 text-sm font-medium text-neutral-900">
              {t.nama}
              {t.kota && <span className="font-normal text-neutral-500"> &middot; {t.kota}</span>}
            </p>
          </li>
        ))}
      </ul>
    </Bagian>
  );
}

// --- FAQ --------------------------------------------------------------------

function BlokFaq({
  konten,
}: {
  konten: { judul: string | null; items: { tanya: string; jawab: string }[] };
}) {
  return (
    <Bagian>
      <JudulBagian judul={konten.judul} />

      <div className="mx-auto max-w-3xl divide-y divide-neutral-200 border-y border-neutral-200">
        {konten.items.map((f, i) => (
          // <details> memberi buka-tutup tanpa JavaScript sama sekali.
          <details key={i} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-neutral-900">
              {f.tanya}
              <span className="shrink-0 text-xl text-neutral-400 transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600">{f.jawab}</p>
          </details>
        ))}
      </div>
    </Bagian>
  );
}

// --- HITUNG MUNDUR ----------------------------------------------------------

function BlokHitungMundur({
  konten,
  konteks,
}: {
  konten: {
    judul: string;
    subjudul: string | null;
    berakhirPada: string;
    teksSetelahHabis: string | null;
  };
  konteks: Konteks;
}) {
  return (
    <Bagian rapat>
      <div className="text-center">
        <h2 className="text-xl font-semibold tracking-tight text-neutral-900 sm:text-2xl">
          {konten.judul}
        </h2>
        {konten.subjudul && <p className="mt-2 text-sm text-neutral-600">{konten.subjudul}</p>}
        <div className="mt-6">
          <HitungMundur
            berakhirPada={konten.berakhirPada}
            teksSetelahHabis={konten.teksSetelahHabis}
            warnaAksen={konteks.warnaAksen}
          />
        </div>
      </div>
    </Bagian>
  );
}

// --- CTA --------------------------------------------------------------------

function BlokCta({
  konten,
  konteks,
}: {
  konten: {
    judul: string;
    subjudul: string | null;
    tombol: TombolCta;
    catatanKecil: string | null;
  };
  konteks: Konteks;
}) {
  return (
    <section className="bg-neutral-900 text-white">
      <div className="kontainer-toko max-w-3xl py-12 text-center sm:py-16">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{konten.judul}</h2>
        {konten.subjudul && (
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-neutral-300">
            {konten.subjudul}
          </p>
        )}
        <div className="mt-7 flex justify-center">
          <TombolCtaLanding
            tombol={konten.tombol}
            produk={konteks.produk}
            warnaAksen={konteks.warnaAksen}
          />
        </div>
        {konten.catatanKecil && (
          <p className="mt-4 text-xs text-neutral-400">{konten.catatanKecil}</p>
        )}
      </div>
    </section>
  );
}

// --- TEKS -------------------------------------------------------------------

function BlokTeks({ konten }: { konten: { judul: string | null; isi: string } }) {
  return (
    <Bagian>
      <div className="mx-auto max-w-3xl">
        {konten.judul && (
          <h2 className="mb-4 text-2xl font-semibold tracking-tight text-neutral-900">
            {konten.judul}
          </h2>
        )}
        <div className="space-y-3 text-base leading-relaxed text-neutral-700">
          {konten.isi.split('\n').map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>
    </Bagian>
  );
}

// --- Ikon tambahan ----------------------------------------------------------

function IkonBintang({ className = 'h-5 w-5', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="m12 2.6 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z" />
    </svg>
  );
}

function IkonCentang({ className = 'h-5 w-5', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m4 12.5 5.5 5.5L20 7" />
    </svg>
  );
}
