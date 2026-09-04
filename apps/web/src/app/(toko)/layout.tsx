import { Footer } from '@/components/toko/footer';
import { Header } from '@/components/toko/header';
import { apiGet } from '@/lib/api';
import type { Kategori } from '@/lib/types';

/**
 * Layout etalase (bukan admin). Kategori di-fetch sekali di sini dan dipakai
 * header maupun footer, dengan ISR 5 menit — kategori jarang berubah.
 */
export default async function TokoLayout({ children }: { children: React.ReactNode }) {
  let kategori: Kategori[] = [];
  try {
    kategori = await apiGet<Kategori[]>('/catalog/kategori', {
      revalidate: 300,
      tags: ['kategori'],
    });
  } catch {
    // Navigasi tetap tampil walau API sedang bermasalah — halaman tidak ikut tumbang.
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header kategori={kategori} />
      <main className="flex-1">{children}</main>
      <Footer kategori={kategori} />
    </div>
  );
}
