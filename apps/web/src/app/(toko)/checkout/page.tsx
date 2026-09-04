import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FormCheckout } from '@/components/toko/form-checkout';
import { apiGet } from '@/lib/api';
import { ambilKeranjang } from '@/lib/keranjang';
import { ambilPelanggan } from '@/lib/sesi-pelanggan';
import { ambilAlamatSaya } from '../actions-akun';

export const metadata: Metadata = {
  title: 'Pengiriman & Pembayaran',
  robots: { index: false, follow: false },
};

export default async function HalamanCheckout() {
  const keranjang = await ambilKeranjang();

  // Pembeli yang sedang masuk mendapat saldo poin dan alamat tersimpannya.
  // Tamu mendapat null di keduanya, dan checkout berjalan persis seperti dulu.
  const pelanggan = await ambilPelanggan();
  const alamatTersimpan = pelanggan ? await ambilAlamatSaya() : [];

  // Checkout tanpa isi keranjang tidak ada artinya.
  if (keranjang.items.length === 0) redirect('/keranjang');

  if (keranjang.adaMasalah) {
    return (
      <div className="kontainer-toko py-20 text-center">
        <h1 className="text-2xl font-semibold text-neutral-900">Keranjang perlu diperiksa</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-neutral-600">
          Ada item yang stok atau ketersediaannya berubah. Perbaiki dulu sebelum melanjutkan ke
          pengiriman.
        </p>
        <Link
          href="/keranjang"
          className="mt-6 inline-block rounded-lg bg-merek-700 px-6 py-3 text-sm font-semibold text-white hover:bg-merek-800"
        >
          Kembali ke Keranjang
        </Link>
      </div>
    );
  }

  let provinsi: string[] = [];
  try {
    provinsi = await apiGet<string[]>('/pengiriman/provinsi', { revalidate: 86_400 });
  } catch {
    // Dibiarkan kosong — form menampilkan dropdown tanpa pilihan dan pembeli
    // tetap melihat pesan yang jelas ketimbang halaman error.
  }

  return (
    <div className="kontainer-toko py-8 sm:py-10">
      <nav className="mb-4 text-sm text-neutral-500" aria-label="Langkah checkout">
        <Link href="/keranjang" className="hover:text-merek-700">
          Keranjang
        </Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-neutral-800">Pengiriman</span>
        <span className="mx-2">/</span>
        <span>Pembayaran</span>
      </nav>

      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
        Pengiriman
      </h1>
      <p className="mt-1.5 text-sm text-neutral-600">
        Isi alamat penerima, pilih kurir, lalu lanjut ke pembayaran.
      </p>

      <div className="mt-6">
        <FormCheckout
          keranjang={keranjang}
          provinsi={provinsi}
          pelanggan={
            pelanggan
              ? {
                  nama: pelanggan.nama,
                  email: pelanggan.email,
                  telepon: pelanggan.telepon,
                  poin: pelanggan.poin,
                }
              : null
          }
          alamatTersimpan={alamatTersimpan}
        />
      </div>
    </div>
  );
}
