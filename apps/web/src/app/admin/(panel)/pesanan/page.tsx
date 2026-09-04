import type { Metadata } from 'next';
import Link from 'next/link';
import { apiGetWithMeta } from '@/lib/api';
import { rupiah, waktuRelatif } from '@/lib/format';
import { ambilToken } from '@/lib/sesi';
import { STATUS_PESANAN, URUTAN_STATUS } from '@/lib/status-pesanan';
import type { BarisPesananAdmin, MetaPesanan, StatusPesanan } from '@/lib/types';

export const metadata: Metadata = { title: 'Pesanan' };

interface Filter {
  status?: string;
  q?: string;
  page?: string;
}

export default async function HalamanDaftarPesanan({
  searchParams,
}: {
  searchParams: Promise<Filter>;
}) {
  const [sp, token] = await Promise.all([searchParams, ambilToken()]);

  const halaman = Math.max(1, Number(sp.page ?? '1') || 1);
  const statusAktif = URUTAN_STATUS.includes(sp.status as StatusPesanan)
    ? (sp.status as StatusPesanan)
    : undefined;

  const kueri = new URLSearchParams({ page: String(halaman), limit: '20' });
  if (statusAktif) kueri.set('status', statusAktif);
  if (sp.q) kueri.set('q', sp.q);

  let pesanan: BarisPesananAdmin[] = [];
  let meta: MetaPesanan | null = null;
  let galat: string | null = null;

  try {
    const hasil = await apiGetWithMeta<BarisPesananAdmin[]>(`/admin/pesanan?${kueri}`, {
      token: token ?? undefined,
    });
    pesanan = hasil.data;
    meta = hasil.meta as MetaPesanan | null;
  } catch (e) {
    galat = e instanceof Error ? e.message : 'Gagal memuat pesanan';
  }

  const tautanTab = (status?: StatusPesanan) => {
    const p = new URLSearchParams();
    if (status) p.set('status', status);
    if (sp.q) p.set('q', sp.q);
    const s = p.toString();
    return s ? `/admin/pesanan?${s}` : '/admin/pesanan';
  };

  const totalSemua = meta
    ? Object.values(meta.jumlahPerStatus).reduce((t, n) => t + n, 0)
    : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Pesanan</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Kelola pesanan dari menunggu bayar sampai diterima pembeli.
        </p>
      </div>

      <form className="rounded-xl border border-neutral-200 bg-white p-3">
        {statusAktif && <input type="hidden" name="status" value={statusAktif} />}
        <div className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={sp.q ?? ''}
            placeholder="Cari nomor pesanan, nama, telepon, atau resi..."
            aria-label="Cari pesanan"
            className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-merek-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Cari
          </button>
        </div>
      </form>

      {/* Tab status — angkanya tidak ikut menyusut saat satu tab dipilih. */}
      <nav
        className="tanpa-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0"
        aria-label="Saring berdasarkan status"
      >
        <TabStatus href={tautanTab()} aktif={!statusAktif} jumlah={totalSemua}>
          Semua
        </TabStatus>
        {URUTAN_STATUS.map((s) => (
          <TabStatus
            key={s}
            href={tautanTab(s)}
            aktif={statusAktif === s}
            jumlah={meta?.jumlahPerStatus[s] ?? 0}
          >
            {STATUS_PESANAN[s].label}
          </TabStatus>
        ))}
      </nav>

      {galat && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{galat}</p>}

      {pesanan.length === 0 && !galat ? (
        <div className="rounded-xl border border-neutral-200 bg-white py-16 text-center">
          <p className="text-sm text-neutral-600">
            {sp.q || statusAktif
              ? 'Tidak ada pesanan yang cocok dengan filter ini.'
              : 'Belum ada pesanan masuk.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="hidden w-full text-left text-sm lg:table">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Pesanan</th>
                <th className="px-4 py-3 font-semibold">Pembeli</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Masuk</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {pesanan.map((o) => (
                <tr key={o.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/pesanan/${o.id}`}
                      className="font-medium text-neutral-900 hover:text-merek-700"
                    >
                      {o.nomor}
                    </Link>
                    <p className="mt-0.5 max-w-xs truncate text-xs text-neutral-500">
                      {o.jumlahBarang} barang &middot; {o.ringkasanBarang}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-neutral-900">{o.namaPembeli}</p>
                    <p className="text-xs text-neutral-500">
                      {o.kota}, {o.provinsi}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-neutral-900">{rupiah(o.total)}</p>
                    {o.metodePembayaran && (
                      <p className="text-xs text-neutral-500">
                        {o.metodePembayaran.replace(/_/g, ' ')}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Lencana status={o.status} />
                    {o.nomorResi && (
                      <p className="mt-1 text-xs text-neutral-500">Resi {o.nomorResi}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-500">
                    {waktuRelatif(o.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/pesanan/${o.id}`}
                      className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-merek-700 hover:bg-merek-50"
                    >
                      Detail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul className="divide-y divide-neutral-100 lg:hidden">
            {pesanan.map((o) => (
              <li key={o.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/pesanan/${o.id}`}
                      className="font-medium text-neutral-900"
                    >
                      {o.nomor}
                    </Link>
                    <p className="mt-0.5 text-sm text-neutral-700">{o.namaPembeli}</p>
                    <p className="truncate text-xs text-neutral-500">
                      {o.jumlahBarang} barang &middot; {o.kota}
                    </p>
                  </div>
                  <Lencana status={o.status} />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-semibold text-neutral-900">{rupiah(o.total)}</span>
                  <Link
                    href={`/admin/pesanan/${o.id}`}
                    className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700"
                  >
                    Detail
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {meta && meta.totalHalaman > 1 && (
        <nav className="flex items-center justify-between" aria-label="Paginasi">
          <TautanHalaman sp={sp} halaman={halaman - 1} nonaktif={halaman <= 1}>
            &larr; Sebelumnya
          </TautanHalaman>
          <span className="text-sm text-neutral-600">
            Halaman {meta.page} dari {meta.totalHalaman}
          </span>
          <TautanHalaman sp={sp} halaman={halaman + 1} nonaktif={halaman >= meta.totalHalaman}>
            Berikutnya &rarr;
          </TautanHalaman>
        </nav>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function TabStatus({
  href,
  aktif,
  jumlah,
  children,
}: {
  href: string;
  aktif: boolean;
  jumlah: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={aktif ? 'page' : undefined}
      className={`shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
        aktif
          ? 'border-merek-700 bg-merek-700 text-white'
          : 'border-neutral-300 bg-white text-neutral-700 hover:border-merek-400'
      }`}
    >
      {children}
      <span className={`ml-1.5 text-xs ${aktif ? 'opacity-80' : 'text-neutral-400'}`}>
        {jumlah}
      </span>
    </Link>
  );
}

function Lencana({ status }: { status: StatusPesanan }) {
  const gaya = STATUS_PESANAN[status];
  return (
    <span
      className={`inline-block shrink-0 rounded-md px-2 py-1 text-xs font-semibold ${gaya.kelasLencana}`}
    >
      {gaya.label}
    </span>
  );
}

function TautanHalaman({
  sp,
  halaman,
  nonaktif,
  children,
}: {
  sp: Filter;
  halaman: number;
  nonaktif: boolean;
  children: React.ReactNode;
}) {
  if (nonaktif) return <span className="text-sm text-neutral-400">{children}</span>;

  const p = new URLSearchParams({ page: String(halaman) });
  if (sp.status) p.set('status', sp.status);
  if (sp.q) p.set('q', sp.q);

  return (
    <Link href={`/admin/pesanan?${p}`} className="text-sm font-medium text-merek-700 hover:text-merek-800">
      {children}
    </Link>
  );
}
