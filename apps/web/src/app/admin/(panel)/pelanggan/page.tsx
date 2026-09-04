import type { Metadata } from 'next';
import Link from 'next/link';
import { SakelarPelanggan } from '@/components/admin/aksi-pelanggan';
import { apiGetWithMeta } from '@/lib/api';
import { rupiah, tanggal, waktuRelatif } from '@/lib/format';
import { ambilToken } from '@/lib/sesi';
import type { BarisPelangganAdmin, MetaPaginasi, TierPelanggan } from '@/lib/types';

export const metadata: Metadata = { title: 'Pelanggan' };

const TIER: { nilai: TierPelanggan | ''; label: string }[] = [
  { nilai: '', label: 'Semua tier' },
  { nilai: 'BRONZE', label: 'Bronze' },
  { nilai: 'SILVER', label: 'Silver' },
  { nilai: 'GOLD', label: 'Gold' },
  { nilai: 'PLATINUM', label: 'Platinum' },
];

export default async function HalamanDaftarPelanggan({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; tier?: string; aktif?: string }>;
}) {
  const [sp, token] = await Promise.all([searchParams, ambilToken()]);

  const page = Math.max(1, Number(sp.page) || 1);
  const kueri = new URLSearchParams({ page: String(page), limit: '20' });
  if (sp.q) kueri.set('q', sp.q);
  if (sp.tier) kueri.set('tier', sp.tier);
  if (sp.aktif) kueri.set('aktif', sp.aktif);

  let pelanggan: BarisPelangganAdmin[] = [];
  let meta: MetaPaginasi | null = null;
  let galat: string | null = null;

  try {
    const hasil = await apiGetWithMeta<BarisPelangganAdmin[]>(`/admin/pelanggan?${kueri}`, {
      token: token ?? undefined,
    });
    pelanggan = hasil.data;
    meta = hasil.meta as MetaPaginasi;
  } catch (e) {
    galat = e instanceof Error ? e.message : 'Gagal memuat pelanggan';
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Pelanggan</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Akun terdaftar beserta saldo poin dan tier keanggotaannya. Pembeli tamu tidak muncul di
          sini karena tidak punya akun.
        </p>
      </div>

      <form className="flex flex-wrap gap-2 rounded-xl border border-neutral-200 bg-white p-3">
        <input
          name="q"
          defaultValue={sp.q ?? ''}
          placeholder="Cari nama, email, atau nomor HP..."
          className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-merek-500 focus:outline-none"
        />
        <select
          name="tier"
          defaultValue={sp.tier ?? ''}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-merek-500 focus:outline-none"
        >
          {TIER.map((t) => (
            <option key={t.nilai} value={t.nilai}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          name="aktif"
          defaultValue={sp.aktif ?? ''}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-merek-500 focus:outline-none"
        >
          <option value="">Semua status</option>
          <option value="true">Aktif</option>
          <option value="false">Nonaktif</option>
        </select>
        <button
          type="submit"
          className="rounded-lg bg-merek-700 px-4 py-2 text-sm font-semibold text-white hover:bg-merek-800"
        >
          Cari
        </button>
      </form>

      {galat && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{galat}</p>}

      {pelanggan.length === 0 && !galat ? (
        <div className="rounded-xl border border-neutral-200 bg-white py-16 text-center">
          <p className="text-sm text-neutral-600">
            {sp.q || sp.tier || sp.aktif
              ? 'Tidak ada pelanggan yang cocok dengan filter ini.'
              : 'Belum ada pelanggan yang mendaftar.'}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Pelanggan</th>
                  <th className="px-4 py-3 font-medium">Tier</th>
                  <th className="px-4 py-3 text-right font-medium">Poin</th>
                  <th className="px-4 py-3 text-right font-medium">Belanja 12 bln</th>
                  <th className="px-4 py-3 text-right font-medium">Pesanan</th>
                  <th className="px-4 py-3 font-medium">Terakhir masuk</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {pelanggan.map((c) => (
                  <tr key={c.id} className={c.aktif ? '' : 'bg-neutral-50/60'}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/pelanggan/${c.id}`}
                        className="font-medium text-neutral-900 hover:text-merek-700"
                      >
                        {c.nama}
                      </Link>
                      {!c.aktif && (
                        <span className="ml-2 rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-700">
                          Nonaktif
                        </span>
                      )}
                      <p className="mt-0.5 text-xs text-neutral-500">{c.email}</p>
                      {c.telepon && <p className="text-xs text-neutral-500">{c.telepon}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-white"
                        style={{ backgroundColor: c.warnaTier }}
                      >
                        {c.namaTier}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-neutral-900">
                      {c.poin.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-right text-neutral-700">
                      {rupiah(c.belanja12Bulan)}
                    </td>
                    <td className="px-4 py-3 text-right text-neutral-700">{c.jumlahPesanan}</td>
                    <td className="px-4 py-3 text-xs text-neutral-500">
                      {c.lastLoginAt ? waktuRelatif(c.lastLoginAt) : '—'}
                      <p className="text-neutral-400">daftar {tanggal(c.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <SakelarPelanggan id={c.id} aktif={c.aktif} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta && meta.totalHalaman > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-600">
                Halaman {meta.page} dari {meta.totalHalaman} &middot; {meta.total} pelanggan
              </span>
              <div className="flex gap-2">
                {meta.page > 1 && (
                  <Link
                    href={`/admin/pelanggan?${new URLSearchParams({ ...sp, page: String(meta.page - 1) })}`}
                    className="rounded-lg border border-neutral-300 px-3 py-1.5 font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    Sebelumnya
                  </Link>
                )}
                {meta.page < meta.totalHalaman && (
                  <Link
                    href={`/admin/pelanggan?${new URLSearchParams({ ...sp, page: String(meta.page + 1) })}`}
                    className="rounded-lg border border-neutral-300 px-3 py-1.5 font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    Berikutnya
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
