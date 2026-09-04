import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DaftarProduk, type FilterKatalog } from '@/components/toko/daftar-produk';
import { apiGet } from '@/lib/api';
import type { Kategori } from '@/lib/types';

export const revalidate = 300;

async function ambilKategori(slug: string): Promise<Kategori | null> {
  try {
    const semua = await apiGet<Kategori[]>('/catalog/kategori', {
      revalidate: 300,
      tags: ['kategori'],
    });
    return semua.find((k) => k.slug === slug) ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const kategori = await ambilKategori(slug);
  if (!kategori) return { title: 'Kategori tidak ditemukan' };

  return {
    title: kategori.nama,
    description: kategori.deskripsi ?? `Koleksi ${kategori.nama} pilihan.`,
    alternates: { canonical: `/kategori/${kategori.slug}` },
  };
}

export default async function HalamanKategori({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<FilterKatalog>;
}) {
  const [{ slug }, filter] = await Promise.all([params, searchParams]);
  const kategori = await ambilKategori(slug);
  if (!kategori) notFound();

  return (
    <>
      <div className="border-b border-neutral-200 bg-neutral-50">
        <div className="kontainer-toko py-8 sm:py-10">
          <nav className="mb-3 text-sm text-neutral-500" aria-label="Remah roti">
            <Link href="/" className="hover:text-merek-700">
              Beranda
            </Link>
            <span className="mx-2">/</span>
            <Link href="/produk" className="hover:text-merek-700">
              Produk
            </Link>
            <span className="mx-2">/</span>
            <span className="text-neutral-800">{kategori.nama}</span>
          </nav>

          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
            {kategori.nama}
          </h1>
          {kategori.deskripsi && (
            <p className="mt-2 max-w-2xl text-sm text-neutral-600 sm:text-base">
              {kategori.deskripsi}
            </p>
          )}
        </div>
      </div>

      <DaftarProduk
        filter={filter}
        basePath={`/kategori/${kategori.slug}`}
        kategoriTerkunci={kategori.slug}
      />
    </>
  );
}
