import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FormPenyesuaianPoin, SakelarPelanggan } from '@/components/admin/aksi-pelanggan';
import { ApiError, apiGet } from '@/lib/api';
import { rupiah, tanggal, waktuRelatif } from '@/lib/format';
import { STATUS_PESANAN } from '@/lib/status-pesanan';
import { ambilProfil, ambilToken } from '@/lib/sesi';
import type { MutasiPoin, PelangganAdmin } from '@/lib/types';

export const metadata: Metadata = { title: 'Detail Pelanggan' };

const LABEL_MUTASI: Record<MutasiPoin['tipe'], string> = {
  EARN: 'Poin masuk',
  REDEEM: 'Dipakai belanja',
  TO_VOUCHER: 'Ditukar voucher',
  ADJUST: 'Penyesuaian admin',
  REFUND: 'Dikembalikan',
};

export default async function HalamanDetailPelanggan({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [token, profil] = await Promise.all([ambilToken(), ambilProfil()]);

  let pelanggan: PelangganAdmin;
  try {
    pelanggan = await apiGet<PelangganAdmin>(`/admin/pelanggan/${id}`, {
      token: token ?? undefined,
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  // Penyesuaian poin setara memberi uang, jadi dibatasi ke ADMIN — sama dengan
  // pembatasan di sisi API, bukan sebagai gantinya.
  const bolehSesuaikanPoin = profil?.role === 'ADMIN';

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/admin/pelanggan"
          className="text-sm font-medium text-merek-700 hover:text-merek-800"
        >
          &larr; Kembali ke daftar pelanggan
        </Link>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            {pelanggan.nama}
          </h1>
          <span
            className="rounded-md px-2 py-1 text-xs font-semibold text-white"
            style={{ backgroundColor: pelanggan.warnaTier }}
          >
            {pelanggan.namaTier}
          </span>
          {!pelanggan.aktif && (
            <span className="rounded-md bg-neutral-200 px-2 py-1 text-xs font-semibold text-neutral-700">
              Nonaktif
            </span>
          )}
        </div>

        <p className="mt-1 text-sm text-neutral-600">
          {pelanggan.email}
          {pelanggan.telepon && ` · ${pelanggan.telepon}`} &middot; daftar{' '}
          {tanggal(pelanggan.createdAt)}
          {pelanggan.lastLoginAt && ` · terakhir masuk ${waktuRelatif(pelanggan.lastLoginAt)}`}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metrik label="Saldo poin" nilai={pelanggan.poin.toLocaleString('id-ID')} />
        <Metrik label="Total belanja" nilai={rupiah(pelanggan.belanjaTotal)} />
        <Metrik label="Pesanan sukses" nilai={String(pelanggan.pesananSukses)} />
        <Metrik label="Rata-rata pesanan" nilai={rupiah(pelanggan.rataRataPesanan)} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section className="rounded-xl border border-neutral-200 bg-white">
            <h2 className="border-b border-neutral-200 px-5 py-3 text-base font-semibold text-neutral-900">
              Riwayat Pesanan
            </h2>
            {pelanggan.pesanan.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-neutral-500">Belum ada pesanan.</p>
            ) : (
              <ul className="divide-y divide-neutral-200">
                {pelanggan.pesanan.map((o) => {
                  const gaya = STATUS_PESANAN[o.status];
                  return (
                    <li
                      key={o.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/admin/pesanan/${o.id}`}
                            className="font-mono text-sm font-medium text-neutral-900 hover:text-merek-700"
                          >
                            {o.nomor}
                          </Link>
                          <span
                            className={`rounded-md px-2 py-0.5 text-xs font-semibold ${gaya.kelasLencana}`}
                          >
                            {gaya.label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-neutral-500">
                          {tanggal(o.createdAt)}
                          {o.poinDipakai > 0 &&
                            ` · pakai ${o.poinDipakai.toLocaleString('id-ID')} poin`}
                        </p>
                      </div>
                      <span className="shrink-0 font-medium text-neutral-900">
                        {rupiah(o.total)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-neutral-200 bg-white">
            <h2 className="border-b border-neutral-200 px-5 py-3 text-base font-semibold text-neutral-900">
              Buku Besar Poin
            </h2>
            {pelanggan.mutasiPoin.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-neutral-500">Belum ada mutasi.</p>
            ) : (
              <ul className="divide-y divide-neutral-200">
                {pelanggan.mutasiPoin.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-800">
                        {LABEL_MUTASI[m.tipe]}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500">{m.keterangan}</p>
                      <p className="mt-0.5 text-xs text-neutral-400">{tanggal(m.createdAt)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={`text-sm font-semibold ${
                          m.jumlah > 0 ? 'text-merek-700' : 'text-neutral-700'
                        }`}
                      >
                        {m.jumlah > 0 ? '+' : ''}
                        {m.jumlah.toLocaleString('id-ID')}
                      </p>
                      <p className="text-xs text-neutral-500">
                        saldo {m.saldoSesudah.toLocaleString('id-ID')}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="text-base font-semibold text-neutral-900">Keanggotaan</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-600">Tier</dt>
                <dd className="font-medium text-neutral-900">{pelanggan.namaTier}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-600">Pengali poin</dt>
                <dd className="font-medium text-neutral-900">{pelanggan.pengaliPoin}&times;</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-600">Belanja 12 bulan</dt>
                <dd className="font-medium text-neutral-900">
                  {rupiah(pelanggan.belanja12Bulan)}
                </dd>
              </div>
              {pelanggan.tierBerikutnya && (
                <div className="flex justify-between">
                  <dt className="text-neutral-600">Ke {pelanggan.tierBerikutnya.nama}</dt>
                  <dd className="font-medium text-neutral-900">
                    {rupiah(pelanggan.tierBerikutnya.kurang)} lagi
                  </dd>
                </div>
              )}
            </dl>

            <div className="mt-4 space-y-3 border-t border-neutral-200 pt-4">
              {bolehSesuaikanPoin ? (
                <FormPenyesuaianPoin id={pelanggan.id} saldo={pelanggan.poin} />
              ) : (
                <p className="text-xs text-neutral-500">
                  Penyesuaian poin hanya bisa dilakukan oleh admin.
                </p>
              )}
              <SakelarPelanggan id={pelanggan.id} aktif={pelanggan.aktif} />
            </div>
          </section>

          <section className="rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="text-base font-semibold text-neutral-900">Alamat Tersimpan</h2>
            {pelanggan.alamat.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-500">Belum ada alamat tersimpan.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {pelanggan.alamat.map((a) => (
                  <li key={a.id} className="rounded-lg border border-neutral-200 p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-neutral-900">{a.label}</span>
                      {a.utama && (
                        <span className="rounded bg-merek-100 px-1.5 py-0.5 text-[10px] font-semibold text-merek-800">
                          Utama
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-neutral-600">
                      {a.namaPenerima} &middot; {a.teleponPenerima}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {a.alamatLengkap}, {a.kecamatan ? `${a.kecamatan}, ` : ''}
                      {a.kota}, {a.provinsi} {a.kodePos}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Metrik({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-neutral-900">{nilai}</p>
    </div>
  );
}
