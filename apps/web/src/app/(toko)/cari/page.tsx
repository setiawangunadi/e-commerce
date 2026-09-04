import { redirect } from 'next/navigation';

/**
 * Kotak pencarian di header mengarah ke sini. Pencarian sendiri ditangani
 * halaman katalog, jadi rute ini cukup meneruskan kuerinya — satu implementasi
 * pencarian, bukan dua.
 */
export default async function HalamanCari({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  redirect(q ? `/produk?q=${encodeURIComponent(q)}` : '/produk');
}
