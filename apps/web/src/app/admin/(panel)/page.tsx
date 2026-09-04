import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { LencanaStatus } from '@/components/admin/lencana-status';
import { apiGet } from '@/lib/api';
import { rupiah, rupiahRingkas, waktuRelatif } from '@/lib/format';
import { ambilProfil, ambilToken } from '@/lib/sesi';
import type { RingkasanAdmin } from '@/lib/types';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function HalamanDashboard() {
  const [token, profil] = await Promise.all([ambilToken(), ambilProfil()]);

  let ringkasan: RingkasanAdmin | null = null;
  let galat: string | null = null;

  try {
    ringkasan = await apiGet<RingkasanAdmin>('/admin/ringkasan', { token: token ?? undefined });
  } catch (e) {
    galat = e instanceof Error ? e.message : 'Gagal memuat ringkasan';
  }

  if (!ringkasan) {
    return (
      <Kartu>
        <p className="text-sm text-neutral-700">Ringkasan tidak bisa dimuat.</p>
        {galat && <p className="mt-1 text-xs text-neutral-500">{galat}</p>}
      </Kartu>
    );
  }

  const {
    penjualan,
    produk,
    totalKategori,
    produkStokHabis,
    nilaiPersediaan,
    stokMenipis,
    produkTerbaru,
  } = ringkasan;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Halo, {profil?.nama.split(' ')[0] ?? 'Admin'}
          </h1>
          <p className="mt-1 text-sm text-neutral-600">Ringkasan katalog toko hari ini.</p>
        </div>
        <Link
          href="/admin/produk/baru"
          className="rounded-lg bg-merek-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-merek-800"
        >
          + Tambah Produk
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KartuStatistik label="Total Produk" nilai={String(produk.total)} catatan={`${produk.terbit} terbit · ${produk.draft} draft`} />
        <KartuStatistik label="Kategori Aktif" nilai={String(totalKategori)} />
        <KartuStatistik
          label="Stok Habis"
          nilai={String(produkStokHabis)}
          catatan={produkStokHabis > 0 ? 'Perlu restock' : 'Semua tersedia'}
          nada={produkStokHabis > 0 ? 'peringatan' : 'normal'}
        />
        <KartuStatistik
          label="Nilai Persediaan"
          nilai={rupiahRingkas(nilaiPersediaan)}
          catatan="Dihitung dari HPP × stok"
        />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-900">Penjualan</h2>
          <Link href="/admin/pesanan" className="text-sm font-medium text-merek-700 hover:text-merek-800">
            Kelola pesanan
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <KartuStatistik
            label="Perlu Diproses"
            nilai={String(penjualan.perluDiproses)}
            catatan={penjualan.perluDiproses > 0 ? 'Sudah dibayar, belum dikemas' : 'Semua tertangani'}
            nada={penjualan.perluDiproses > 0 ? 'peringatan' : 'normal'}
          />
          <KartuStatistik
            label="Dalam Pengiriman"
            nilai={String(penjualan.sedangDikirim)}
            catatan="Sudah diserahkan ke kurir"
          />
          <KartuStatistik
            label="Omzet"
            nilai={rupiahRingkas(penjualan.omzet)}
            catatan={`${penjualan.jumlahPesananLunas} pesanan lunas`}
          />
          <KartuStatistik
            label="Rata-rata / Pesanan"
            nilai={rupiahRingkas(penjualan.nilaiRataRata)}
            catatan={`${penjualan.pesananHariIni} pesanan hari ini`}
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Kartu>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-neutral-900">Stok Menipis</h2>
            <Link href="/admin/produk" className="text-sm font-medium text-merek-700 hover:text-merek-800">
              Kelola
            </Link>
          </div>

          {stokMenipis.length === 0 ? (
            <p className="py-6 text-center text-sm text-neutral-500">
              Tidak ada produk yang stoknya menipis.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {stokMenipis.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/produk/${p.id}`}
                      className="block truncate text-sm font-medium text-neutral-900 hover:text-merek-700"
                    >
                      {p.nama}
                    </Link>
                    <p className="truncate text-xs text-neutral-500">{p.sku}</p>
                  </div>
                  <span className="shrink-0 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                    Sisa {p.stok}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Kartu>

        <Kartu>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-neutral-900">Terakhir Diubah</h2>
            <Link href="/admin/produk" className="text-sm font-medium text-merek-700 hover:text-merek-800">
              Lihat semua
            </Link>
          </div>

          <ul className="divide-y divide-neutral-100">
            {produkTerbaru.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2.5">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                  {p.gambarUtama && (
                    <Image src={p.gambarUtama} alt="" fill sizes="40px" className="object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/produk/${p.id}`}
                    className="block truncate text-sm font-medium text-neutral-900 hover:text-merek-700"
                  >
                    {p.nama}
                  </Link>
                  <p className="truncate text-xs text-neutral-500">
                    {rupiah(p.harga)} &middot; {waktuRelatif(p.updatedAt)}
                  </p>
                </div>
                <LencanaStatus status={p.status} />
              </li>
            ))}
          </ul>
        </Kartu>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Kartu({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-neutral-200 bg-white p-5">{children}</div>;
}

function KartuStatistik({
  label,
  nilai,
  catatan,
  nada = 'normal',
}: {
  label: string;
  nilai: string;
  catatan?: string;
  nada?: 'normal' | 'peringatan';
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p
        className={`mt-1.5 text-2xl font-semibold ${
          nada === 'peringatan' ? 'text-amber-600' : 'text-neutral-900'
        }`}
      >
        {nilai}
      </p>
      {catatan && <p className="mt-1 text-xs text-neutral-500">{catatan}</p>}
    </div>
  );
}
