import type { Metadata } from 'next';
import Link from 'next/link';
import { BarisKeranjang } from '@/components/toko/baris-keranjang';
import { berat as formatBerat, rupiah } from '@/lib/format';
import { ambilKeranjang } from '@/lib/keranjang';

export const metadata: Metadata = {
  title: 'Keranjang Belanja',
  robots: { index: false, follow: true },
};

export default async function HalamanKeranjang() {
  const keranjang = await ambilKeranjang();

  if (keranjang.items.length === 0) {
    return (
      <div className="kontainer-toko py-20 text-center sm:py-28">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Keranjang Anda masih kosong
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-neutral-600">
          Yuk lihat-lihat dulu — ada banyak produk yang mungkin Anda suka.
        </p>
        <Link
          href="/produk"
          className="mt-6 inline-block rounded-lg bg-merek-700 px-6 py-3 text-sm font-semibold text-white hover:bg-merek-800"
        >
          Mulai Belanja
        </Link>
      </div>
    );
  }

  return (
    <div className="kontainer-toko py-8 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
        Keranjang Belanja
      </h1>
      <p className="mt-1.5 text-sm text-neutral-600">
        Periksa kembali pesanan Anda sebelum lanjut ke pengiriman.
      </p>

      {keranjang.adaMasalah && (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          Ada item yang stok atau ketersediaannya berubah sejak Anda menambahkannya. Perbaiki
          item bertanda kuning di bawah untuk bisa lanjut ke pengiriman.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3 lg:gap-8">
        <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white lg:col-span-2">
          {keranjang.items.map((item) => (
            <BarisKeranjang key={item.id} item={item} />
          ))}
        </ul>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="text-base font-semibold text-neutral-900">Ringkasan</h2>

            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-600">
                  Subtotal ({keranjang.jumlahItem} barang)
                </dt>
                <dd className="font-medium text-neutral-900">{rupiah(keranjang.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-600">Berat total</dt>
                <dd className="text-neutral-700">{formatBerat(keranjang.beratTotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-600">Ongkos kirim</dt>
                <dd className="text-neutral-500">Dihitung di langkah berikutnya</dd>
              </div>
            </dl>

            <div className="mt-4 flex items-baseline justify-between border-t border-neutral-200 pt-4">
              <span className="font-semibold text-neutral-900">Total sementara</span>
              <span className="text-xl font-semibold text-neutral-900">
                {rupiah(keranjang.subtotal)}
              </span>
            </div>

            {keranjang.adaMasalah ? (
              <p className="mt-5 rounded-lg bg-neutral-100 px-4 py-3 text-center text-sm text-neutral-600">
                Perbaiki item bermasalah dulu untuk melanjutkan
              </p>
            ) : (
              <Link
                href="/checkout"
                className="mt-5 block rounded-lg bg-merek-700 px-6 py-3.5 text-center text-sm font-semibold text-white hover:bg-merek-800 sm:text-base"
              >
                Lanjut ke Pengiriman
              </Link>
            )}

            <Link
              href="/produk"
              className="mt-3 block text-center text-sm font-medium text-merek-700 hover:text-merek-800"
            >
              Tambah produk lain
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
