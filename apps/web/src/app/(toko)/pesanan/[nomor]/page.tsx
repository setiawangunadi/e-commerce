import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LacakPembelian } from '@/components/toko/lacak-pembelian';
import { TombolBayar } from '@/components/toko/tombol-bayar';
import { ApiError, apiGet } from '@/lib/api';
import { berat as formatBerat, rupiah, tanggal } from '@/lib/format';
import { TOKO, tautanWhatsApp } from '@/lib/toko';
import { STATUS_PESANAN } from '@/lib/status-pesanan';
import type { Pesanan, StatusPembayaran } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Status Pesanan',
  robots: { index: false, follow: false },
};

/** Status pesanan berubah lewat webhook, jadi halaman ini tidak boleh di-cache. */
export const dynamic = 'force-dynamic';

export default async function HalamanPesanan({
  params,
  searchParams,
}: {
  params: Promise<{ nomor: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ nomor }, { token }] = await Promise.all([params, searchParams]);
  if (!token) notFound();

  let pesanan: Pesanan;
  try {
    pesanan = await apiGet<Pesanan>(
      `/pesanan/${encodeURIComponent(nomor)}?token=${encodeURIComponent(token)}`,
    );
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  let midtransSiap = false;
  try {
    const cek = await apiGet<{ midtransSiap: boolean }>('/pembayaran/status-konfigurasi');
    midtransSiap = cek.midtransSiap;
  } catch {
    // Dianggap belum siap — tombol bayar diganti pesan yang menjelaskan.
  }

  const perluBayar =
    pesanan.status === 'WAITING_PAYMENT' && pesanan.statusPembayaran === 'MENUNGGU';
  const produksi = process.env.NEXT_PUBLIC_MIDTRANS_PRODUKSI === 'true';

  return (
    <div className="kontainer-toko max-w-4xl py-8 sm:py-12">
      <LacakPembelian
        nomor={pesanan.nomor}
        nilai={pesanan.total}
        lunas={pesanan.statusPembayaran === 'LUNAS'}
      />

      <StatusUtama pesanan={pesanan} />

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Kartu judul="Barang Dipesan">
            <ul className="divide-y divide-neutral-100">
              {pesanan.items.map((i, idx) => (
                <li key={`${i.sku}-${idx}`} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                    {i.gambarUrl && (
                      <Image src={i.gambarUrl} alt="" fill sizes="56px" className="object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-neutral-900">{i.namaProduk}</p>
                    <p className="text-xs text-neutral-500">
                      {i.namaVarian ? `${i.namaVarian} · ` : ''}
                      {i.jumlah} &times; {rupiah(i.harga)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-neutral-900">
                    {rupiah(i.subtotal)}
                  </p>
                </li>
              ))}
            </ul>
          </Kartu>

          <Kartu judul="Dikirim ke">
            <p className="font-medium text-neutral-900">{pesanan.pembeli.nama}</p>
            <p className="mt-0.5 text-sm text-neutral-600">{pesanan.pembeli.telepon}</p>
            <p className="mt-2 text-sm leading-relaxed text-neutral-700">
              {pesanan.alamat.lengkap}
              <br />
              {[pesanan.alamat.kecamatan, pesanan.alamat.kota, pesanan.alamat.provinsi]
                .filter(Boolean)
                .join(', ')}{' '}
              {pesanan.alamat.kodePos}
            </p>
            {pesanan.alamat.catatan && (
              <p className="mt-2 text-sm text-neutral-500">Catatan: {pesanan.alamat.catatan}</p>
            )}

            <div className="mt-4 border-t border-neutral-100 pt-3 text-sm">
              <p className="text-neutral-700">
                <span className="font-medium">
                  {pesanan.pengiriman.kurir} {pesanan.pengiriman.nama}
                </span>
                {pesanan.pengiriman.estimasi && (
                  <span className="text-neutral-500"> &middot; estimasi {pesanan.pengiriman.estimasi}</span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-neutral-500">
                Berat total {formatBerat(pesanan.pengiriman.beratTotal)}
                {pesanan.pengiriman.nomorResi && ` · Resi ${pesanan.pengiriman.nomorResi}`}
              </p>
            </div>
          </Kartu>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <Kartu judul="Rincian Pembayaran">
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-600">Subtotal</dt>
                <dd className="text-neutral-900">{rupiah(pesanan.subtotal)}</dd>
              </div>
              {pesanan.diskon > 0 && (
                <div className="flex justify-between">
                  <dt className="text-neutral-600">
                    Diskon{pesanan.kodeVoucher ? ` (${pesanan.kodeVoucher})` : ''}
                  </dt>
                  <dd className="text-merek-700">-{rupiah(pesanan.diskon)}</dd>
                </div>
              )}
              {pesanan.potonganPoin > 0 && (
                <div className="flex justify-between">
                  <dt className="text-neutral-600">
                    Potongan poin ({pesanan.poinDipakai.toLocaleString('id-ID')} poin)
                  </dt>
                  <dd className="text-merek-700">-{rupiah(pesanan.potonganPoin)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-neutral-600">Ongkos kirim</dt>
                <dd className="text-neutral-900">{rupiah(pesanan.ongkir)}</dd>
              </div>
            </dl>

            <div className="mt-3 flex items-baseline justify-between border-t border-neutral-200 pt-3">
              <span className="font-semibold text-neutral-900">Total</span>
              <span className="text-xl font-semibold text-neutral-900">{rupiah(pesanan.total)}</span>
            </div>

            {pesanan.metodePembayaran && (
              <p className="mt-2 text-xs text-neutral-500">
                Dibayar via {pesanan.metodePembayaran.replace(/_/g, ' ')}
              </p>
            )}

            {perluBayar && (
              <div className="mt-5">
                {midtransSiap ? (
                  <TombolBayar nomor={pesanan.nomor} token={pesanan.token} produksi={produksi} />
                ) : (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <p className="font-medium">Pembayaran belum aktif</p>
                    <p className="mt-1 text-xs leading-relaxed">
                      Isi <code className="rounded bg-amber-100 px-1">MIDTRANS_SERVER_KEY</code> dan{' '}
                      <code className="rounded bg-amber-100 px-1">MIDTRANS_CLIENT_KEY</code> di{' '}
                      <code className="rounded bg-amber-100 px-1">apps/api/.env</code>, lalu jalankan
                      ulang API. Pesanan ini tetap tersimpan.
                    </p>
                  </div>
                )}

                <p className="mt-3 text-center text-xs text-neutral-500">
                  Bayar sebelum {tanggal(pesanan.kedaluwarsaPada)} pukul{' '}
                  {new Date(pesanan.kedaluwarsaPada).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            )}

            <a
              href={tautanWhatsApp(
                `Halo ${TOKO.nama}, saya mau tanya soal pesanan ${pesanan.nomor}.`,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 block text-center text-sm font-medium text-merek-700 hover:text-merek-800"
            >
              Tanya lewat WhatsApp
            </a>
          </Kartu>

          <p className="mt-4 rounded-lg bg-neutral-100 px-4 py-3 text-xs leading-relaxed text-neutral-600">
            Simpan tautan halaman ini untuk memantau pesanan Anda. Tautannya berisi kode rahasia,
            jangan dibagikan ke orang lain.
          </p>
        </aside>
      </div>

      <div className="mt-8 text-center">
        <Link href="/produk" className="text-sm font-medium text-merek-700 hover:text-merek-800">
          Lanjut belanja
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

const CATATAN_PEMBAYARAN: Partial<Record<StatusPembayaran, string>> = {
  DITANTANG: 'Pembayaran sedang ditinjau oleh sistem keamanan. Kami kabari setelah selesai.',
  GAGAL: 'Pembayaran tidak berhasil diproses.',
  DIKEMBALIKAN: 'Dana sudah dikembalikan ke metode pembayaran Anda.',
};

function StatusUtama({ pesanan }: { pesanan: Pesanan }) {
  const gaya = STATUS_PESANAN[pesanan.status];
  const catatan = CATATAN_PEMBAYARAN[pesanan.statusPembayaran];

  return (
    <div className={`rounded-xl border px-5 py-6 ${gaya.kelasPanel}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">
        Pesanan {pesanan.nomor}
      </p>
      <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">{gaya.label}</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed opacity-90">{gaya.pesanPembeli}</p>
      {catatan && <p className="mt-2 text-sm font-medium">{catatan}</p>}
      <p className="mt-3 text-xs opacity-70">Dibuat {tanggal(pesanan.createdAt)}</p>
    </div>
  );
}

function Kartu({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5">
      <h2 className="mb-3 text-base font-semibold text-neutral-900">{judul}</h2>
      {children}
    </section>
  );
}
