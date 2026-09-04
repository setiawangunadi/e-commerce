'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Banner } from '@/lib/types';

const JEDA_OTOMATIS = 6000;

/**
 * Slider banner promosi di home.
 *
 * Slide pertama di-render dengan `priority` karena ia adalah LCP halaman —
 * elemen terbesar yang dilihat pembeli pertama kali (research/tech/14-performance-seo-technical.md).
 * Slide lain lazy agar tidak menambah beban muat awal di koneksi mobile.
 */
export function BannerSlider({ banner }: { banner: Banner[] }) {
  const [aktif, setAktif] = useState(0);
  const [jeda, setJeda] = useState(false);
  const wadahRef = useRef<HTMLElement>(null);

  const total = banner.length;
  const keSlide = useCallback((i: number) => setAktif(((i % total) + total) % total), [total]);

  useEffect(() => {
    if (total <= 1 || jeda) return;

    // Hormati preferensi pengguna yang mematikan animasi di sistem operasinya.
    const kurangiGerak = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (kurangiGerak) return;

    const timer = setInterval(() => setAktif((i) => (i + 1) % total), JEDA_OTOMATIS);
    return () => clearInterval(timer);
  }, [total, jeda]);

  if (total === 0) return null;

  function tanganiTombol(e: React.KeyboardEvent) {
    if (e.key === 'ArrowRight') keSlide(aktif + 1);
    if (e.key === 'ArrowLeft') keSlide(aktif - 1);
  }

  return (
    <section
      ref={wadahRef}
      className="relative overflow-hidden bg-merek-800"
      aria-roledescription="carousel"
      aria-label="Promosi toko"
      onMouseEnter={() => setJeda(true)}
      onMouseLeave={() => setJeda(false)}
      onFocusCapture={() => setJeda(true)}
      onBlurCapture={() => setJeda(false)}
      onKeyDown={tanganiTombol}
      tabIndex={-1}
    >
      <div className="relative aspect-[4/3] sm:aspect-[21/9] lg:aspect-[8/3]">
        {banner.map((b, i) => (
          <div
            key={b.id}
            className={`absolute inset-0 transition-opacity duration-700 ${
              i === aktif ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
            aria-hidden={i !== aktif}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} dari ${total}`}
          >
            <Image
              src={b.gambarMobileUrl ?? b.gambarUrl}
              alt={b.judul}
              fill
              sizes="(max-width: 640px) 100vw, 100vw"
              priority={i === 0}
              className="object-cover sm:hidden"
            />
            <Image
              src={b.gambarUrl}
              alt={b.judul}
              fill
              sizes="100vw"
              priority={i === 0}
              className="hidden object-cover sm:block"
            />

            {/* Lapisan gelap agar teks tetap terbaca di atas gambar apa pun. */}
            <div className="absolute inset-0 bg-linear-to-r from-neutral-900/80 via-neutral-900/45 to-transparent" />

            <div className="kontainer-toko absolute inset-0 flex items-center">
              {/* Padding kiri tambahan di sm ke atas agar teks tidak tertutup
                  tombol panah, yang memang baru muncul di lebar tersebut. */}
              <div className="max-w-xl py-8 sm:pl-10 lg:pl-12">
                <h2 className="text-2xl font-semibold leading-tight tracking-tight text-white drop-shadow-sm sm:text-4xl lg:text-5xl">
                  {b.judul}
                </h2>
                {b.subjudul && (
                  <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/90 sm:text-base lg:text-lg">
                    {b.subjudul}
                  </p>
                )}
                {b.teksTombol && b.tautanTombol && (
                  <Link
                    href={b.tautanTombol}
                    // Slide tersembunyi tidak boleh bisa di-tab.
                    tabIndex={i === aktif ? undefined : -1}
                    className="mt-5 inline-block rounded-lg bg-white px-6 py-3 text-sm font-semibold text-merek-800 transition-colors hover:bg-merek-50 sm:mt-6 sm:text-base"
                  >
                    {b.teksTombol}
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {total > 1 && (
        <>
          <TombolNavigasi arah="sebelumnya" onClick={() => keSlide(aktif - 1)} />
          <TombolNavigasi arah="berikutnya" onClick={() => keSlide(aktif + 1)} />

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2 sm:bottom-5">
            {banner.map((b, i) => (
              <button
                key={b.id}
                type="button"
                onClick={() => keSlide(i)}
                aria-label={`Tampilkan banner ${i + 1}: ${b.judul}`}
                aria-current={i === aktif}
                className={`h-2 rounded-full transition-all ${
                  i === aktif ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/75'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function TombolNavigasi({
  arah,
  onClick,
}: {
  arah: 'sebelumnya' | 'berikutnya';
  onClick: () => void;
}) {
  const kiri = arah === 'sebelumnya';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={kiri ? 'Banner sebelumnya' : 'Banner berikutnya'}
      className={`absolute top-1/2 hidden -translate-y-1/2 rounded-full bg-white/20 p-2.5 text-white backdrop-blur transition-colors hover:bg-white/35 sm:block ${
        kiri ? 'left-3 lg:left-5' : 'right-3 lg:right-5'
      }`}
    >
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={kiri ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
      </svg>
    </button>
  );
}
