import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RenderBlok } from '@/components/landing/blok';
import { TrackingLandingPage } from '@/components/landing/tracking-landing';
import { ApiError, apiGet } from '@/lib/api';
import { TOKO, tautanWhatsApp } from '@/lib/toko';
import type { LandingPublik } from '@/lib/types';

/**
 * Halaman kampanye iklan.
 *
 * Sengaja TIDAK memakai layout etalase: tanpa menu kategori, tanpa pencarian,
 * tanpa keranjang di header. Setiap tautan keluar dari halaman iklan adalah
 * jalan pergi bagi trafik yang sudah dibayar.
 */
export const revalidate = 60;

async function ambilLanding(slug: string): Promise<LandingPublik | null> {
  try {
    return await apiGet<LandingPublik>(`/landing/${encodeURIComponent(slug)}`, {
      revalidate: 60,
      tags: ['landing', `landing-${slug}`],
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const landing = await ambilLanding(slug);
  if (!landing) return { title: 'Halaman tidak ditemukan' };

  const judul = landing.judulMeta ?? landing.nama;
  const deskripsi = landing.deskripsiMeta ?? undefined;

  return {
    title: { absolute: judul },
    description: deskripsi,
    alternates: { canonical: `/lp/${landing.slug}` },
    // Halaman kampanye tidak perlu bersaing dengan katalog di hasil pencarian,
    // dan biasanya berumur pendek.
    robots: { index: false, follow: false },
    openGraph: {
      title: judul,
      description: deskripsi,
      type: 'website',
      images: landing.gambarOg ? [{ url: landing.gambarOg, alt: judul }] : undefined,
    },
  };
}

export default async function HalamanLanding({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const landing = await ambilLanding(slug);
  if (!landing) notFound();

  const konteks = { produk: landing.produk, warnaAksen: landing.warnaAksen };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <TrackingLandingPage tracking={landing.tracking} slug={landing.slug} />

      <header className="border-b border-neutral-200">
        <div className="kontainer-toko max-w-5xl py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight text-merek-800">
            {TOKO.nama}
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {landing.blok.length === 0 ? (
          <div className="kontainer-toko py-24 text-center">
            <p className="text-sm text-neutral-600">Halaman ini belum punya isi.</p>
          </div>
        ) : (
          landing.blok.map((blok) => (
            <RenderBlok key={blok.id} blok={blok} konteks={konteks} />
          ))
        )}
      </main>

      {/* Footer minimal: hanya yang wajib secara hukum & bantuan. */}
      <footer className="border-t border-neutral-200 bg-neutral-50">
        <div className="kontainer-toko max-w-5xl py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-neutral-500">
              &copy; {new Date().getFullYear()} {TOKO.nama}. Terdaftar sebagai PSE Kominfo.
            </p>
            <div className="flex flex-wrap gap-4 text-xs text-neutral-600">
              <a
                href={tautanWhatsApp(`Halo ${TOKO.nama}, saya mau tanya soal promo ini.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-merek-700"
              >
                Tanya via WhatsApp
              </a>
              <Link href="/legal/kebijakan-privasi" className="hover:text-merek-700">
                Kebijakan Privasi
              </Link>
              <Link href="/legal/syarat-ketentuan" className="hover:text-merek-700">
                Syarat &amp; Ketentuan
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
