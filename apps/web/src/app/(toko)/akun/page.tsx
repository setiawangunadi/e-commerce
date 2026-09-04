import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { keluarPelanggan } from '../actions-akun';
import { KartuLoyalty } from '@/components/toko/akun/kartu-loyalty';
import { PanelAkun } from '@/components/toko/akun/panel-akun';
import { apiGet } from '@/lib/api';
import { ambilPelanggan, ambilTokenPelanggan } from '@/lib/sesi-pelanggan';
import type {
  AlamatTersimpan,
  MutasiPoin,
  PesananSaya,
  RingkasanLoyalty,
} from '@/lib/types';

export const metadata: Metadata = { title: 'Akun Saya' };

export default async function HalamanAkun() {
  const [profil, token] = await Promise.all([ambilPelanggan(), ambilTokenPelanggan()]);
  if (!profil || !token) redirect('/masuk?lanjut=/akun');

  // Semua bagian akun dimuat sekali jalan supaya berpindah tab tidak memicu
  // permintaan baru — datanya kecil dan saling melengkapi.
  const [loyalty, pesanan, mutasi, alamat, provinsi] = await Promise.all([
    apiGet<RingkasanLoyalty>('/pelanggan/loyalty', { token }),
    apiGet<PesananSaya[]>('/pelanggan/pesanan?limit=20', { token }).catch(
      () => [] as PesananSaya[],
    ),
    apiGet<MutasiPoin[]>('/pelanggan/loyalty/mutasi?limit=30', { token }).catch(
      () => [] as MutasiPoin[],
    ),
    apiGet<AlamatTersimpan[]>('/pelanggan/alamat', { token }).catch(() => [] as AlamatTersimpan[]),
    apiGet<string[]>('/pengiriman/provinsi', { revalidate: 86400 }).catch(() => [] as string[]),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Halo, {profil.nama.split(' ')[0]}
          </h1>
          <p className="mt-1 text-sm text-neutral-600">{profil.email}</p>
        </div>
        <form action={keluarPelanggan}>
          <button
            type="submit"
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Keluar
          </button>
        </form>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="order-2 lg:order-1">
          <PanelAkun
            profil={profil}
            pesanan={pesanan}
            mutasi={mutasi}
            alamat={alamat}
            provinsi={provinsi}
          />
        </div>

        <aside className="order-1 space-y-4 lg:order-2">
          <KartuLoyalty loyalty={loyalty} />

          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-neutral-900">Cara kerja poin</h2>
            <ul className="mt-2 space-y-1.5 text-xs text-neutral-600">
              <li>Belanja Rp10.000 menghasilkan 1 poin, dikalikan sesuai tier Anda.</li>
              <li>1 poin bernilai Rp100 saat dipakai.</li>
              <li>Poin masuk setelah pesanan Anda terima, bukan saat bayar.</li>
              <li>Poin bisa menutup maksimal setengah nilai belanja, di luar ongkir.</li>
            </ul>
            <Link
              href="/produk"
              className="mt-3 inline-block text-xs font-medium text-merek-700 hover:text-merek-800"
            >
              Belanja untuk kumpulkan poin &rarr;
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
