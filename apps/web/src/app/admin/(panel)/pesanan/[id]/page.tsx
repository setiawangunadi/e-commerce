import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AksiPesanan } from '@/components/admin/aksi-pesanan';
import { ApiError, apiGet } from '@/lib/api';
import { berat as formatBerat, rupiah, tanggal, waktuRelatif } from '@/lib/format';
import { ambilToken } from '@/lib/sesi';
import { STATUS_PESANAN } from '@/lib/status-pesanan';
import type { PesananAdmin } from '@/lib/types';

export const metadata: Metadata = { title: 'Detail Pesanan' };

export default async function HalamanDetailPesanan({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, token] = await Promise.all([params, ambilToken()]);

  let pesanan: PesananAdmin;
  try {
    pesanan = await apiGet<PesananAdmin>(`/admin/pesanan/${id}`, { token: token ?? undefined });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  const gaya = STATUS_PESANAN[pesanan.status];
  const adaAtribusi = Object.values(pesanan.atribusi).some(Boolean);

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/pesanan" className="text-sm font-medium text-merek-700 hover:text-merek-800">
          &larr; Kembali ke daftar pesanan
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            {pesanan.nomor}
          </h1>
          <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${gaya.kelasLencana}`}>
            {gaya.label}
          </span>
        </div>
        <p className="mt-1 text-sm text-neutral-600">
          Masuk {waktuRelatif(pesanan.createdAt)}
          {pesanan.dibayarPada && ` · dibayar ${waktuRelatif(pesanan.dibayarPada)}`}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Kartu judul="Barang Dipesan">
            <ul className="divide-y divide-neutral-100">
              {pesanan.items.map((i, idx) => (
                <li key={`${i.sku}-${idx}`} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                    {i.gambarUrl && (
                      <Image src={i.gambarUrl} alt="" fill sizes="48px" className="object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-neutral-900">{i.namaProduk}</p>
                    <p className="text-xs text-neutral-500">
                      {i.namaVarian ? `${i.namaVarian} · ` : ''}
                      {i.sku} · {i.jumlah} &times; {rupiah(i.harga)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-neutral-900">
                    {rupiah(i.subtotal)}
                  </p>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-2 border-t border-neutral-100 pt-3 text-sm">
              <Baris label="Subtotal" nilai={rupiah(pesanan.subtotal)} />
              <Baris label="Ongkos kirim" nilai={rupiah(pesanan.ongkir)} />
              {pesanan.diskon > 0 && <Baris label="Diskon" nilai={`-${rupiah(pesanan.diskon)}`} />}
              <div className="flex justify-between border-t border-neutral-100 pt-2">
                <dt className="font-semibold text-neutral-900">Total</dt>
                <dd className="text-lg font-semibold text-neutral-900">{rupiah(pesanan.total)}</dd>
              </div>
            </dl>
          </Kartu>

          <Kartu judul="Alamat Pengiriman">
            <p className="font-medium text-neutral-900">{pesanan.pembeli.nama}</p>
            <p className="mt-0.5 text-sm text-neutral-600">
              {pesanan.pembeli.telepon} &middot; {pesanan.pembeli.email}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-neutral-700">
              {pesanan.alamat.lengkap}
              <br />
              {[pesanan.alamat.kecamatan, pesanan.alamat.kota, pesanan.alamat.provinsi]
                .filter(Boolean)
                .join(', ')}{' '}
              {pesanan.alamat.kodePos}
            </p>
            {pesanan.alamat.catatan && (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Catatan kurir: {pesanan.alamat.catatan}
              </p>
            )}

            <div className="mt-4 border-t border-neutral-100 pt-3 text-sm">
              <p className="font-medium text-neutral-800">
                {pesanan.pengiriman.kurir} {pesanan.pengiriman.nama}
              </p>
              <p className="mt-0.5 text-xs text-neutral-500">
                Berat {formatBerat(pesanan.pengiriman.beratTotal)}
                {pesanan.pengiriman.estimasi && ` · estimasi ${pesanan.pengiriman.estimasi}`}
                {' · tarif dari '}
                {pesanan.pengiriman.penyedia}
              </p>
              {pesanan.pengiriman.nomorResi && (
                <p className="mt-1.5 text-sm">
                  Resi: <strong className="text-neutral-900">{pesanan.pengiriman.nomorResi}</strong>
                </p>
              )}
            </div>
          </Kartu>

          {adaAtribusi && (
            <Kartu judul="Asal Pesanan">
              <p className="mb-3 text-xs leading-relaxed text-neutral-500">
                Direkam saat pembeli mendarat dari iklan — dipakai menilai kampanye mana yang
                benar-benar menghasilkan penjualan.
              </p>
              <dl className="space-y-2 text-sm">
                {pesanan.atribusi.landingSlug && (
                  <Baris label="Landing page" nilai={`/lp/${pesanan.atribusi.landingSlug}`} />
                )}
                {pesanan.atribusi.utmSource && (
                  <Baris label="Sumber" nilai={pesanan.atribusi.utmSource} />
                )}
                {pesanan.atribusi.utmMedium && (
                  <Baris label="Medium" nilai={pesanan.atribusi.utmMedium} />
                )}
                {pesanan.atribusi.utmCampaign && (
                  <Baris label="Kampanye" nilai={pesanan.atribusi.utmCampaign} />
                )}
                {pesanan.atribusi.utmContent && (
                  <Baris label="Konten iklan" nilai={pesanan.atribusi.utmContent} />
                )}
              </dl>
            </Kartu>
          )}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <Kartu judul="Ubah Status">
            <div className={`mb-4 rounded-lg border px-3 py-2.5 text-sm ${gaya.kelasPanel}`}>
              <p className="font-semibold">{gaya.label}</p>
              <p className="mt-0.5 text-xs opacity-90">{gaya.pesanPembeli}</p>
            </div>

            <AksiPesanan
              id={pesanan.id}
              statusSekarang={pesanan.status}
              statusBerikutnya={pesanan.statusBerikutnya}
              nomorResi={pesanan.pengiriman.nomorResi}
            />
          </Kartu>

          <Kartu judul="Pembayaran">
            <dl className="space-y-2 text-sm">
              <Baris label="Status" nilai={pesanan.statusPembayaran} />
              {pesanan.metodePembayaran && (
                <Baris label="Metode" nilai={pesanan.metodePembayaran.replace(/_/g, ' ')} />
              )}
              {pesanan.dibayarPada ? (
                <Baris label="Dibayar" nilai={tanggal(pesanan.dibayarPada)} />
              ) : (
                <Baris label="Batas bayar" nilai={tanggal(pesanan.kedaluwarsaPada)} />
              )}
            </dl>
          </Kartu>
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Kartu({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5">
      <h2 className="mb-3 text-base font-semibold text-neutral-900">{judul}</h2>
      {children}
    </section>
  );
}

function Baris({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-neutral-600">{label}</dt>
      <dd className="min-w-0 truncate text-right text-neutral-900">{nilai}</dd>
    </div>
  );
}
