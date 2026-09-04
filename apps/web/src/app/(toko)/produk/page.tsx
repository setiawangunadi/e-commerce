import type { Metadata } from 'next';
import { DaftarProduk, type FilterKatalog } from '@/components/toko/daftar-produk';
import { TOKO } from '@/lib/toko';

export const metadata: Metadata = {
  title: 'Semua Produk',
  description: `Katalog lengkap ${TOKO.nama}. Kirim ke seluruh Indonesia, bayar lewat QRIS, transfer bank, e-wallet, atau COD.`,
  alternates: { canonical: '/produk' },
};

export const revalidate = 60;

export default async function HalamanKatalog({
  searchParams,
}: {
  searchParams: Promise<FilterKatalog>;
}) {
  const filter = await searchParams;

  return (
    <>
      <div className="border-b border-neutral-200 bg-neutral-50">
        <div className="kontainer-toko py-8 sm:py-10">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
            Semua Produk
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-neutral-600 sm:text-base">
            Pilih produk yang Anda mau, lalu beli lewat toko ini atau marketplace langganan Anda.
          </p>
        </div>
      </div>

      <DaftarProduk filter={filter} />
    </>
  );
}
