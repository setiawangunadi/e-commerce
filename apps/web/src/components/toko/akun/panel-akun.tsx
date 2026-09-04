'use client';

import Link from 'next/link';
import Image from 'next/image';
import { startTransition, useActionState, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  gantiSandi,
  hapusAlamat,
  simpanAlamat,
  simpanProfil,
  type HasilAkun,
} from '@/app/(toko)/actions-akun';
import { ambilKecamatan, ambilKota } from '@/app/(toko)/actions-checkout';
import { rupiah, tanggal } from '@/lib/format';
import { STATUS_PESANAN } from '@/lib/status-pesanan';
import type { AlamatTersimpan, MutasiPoin, PesananSaya, ProfilPelanggan } from '@/lib/types';

const awal: HasilAkun = { ok: false };

const kelasInput =
  'w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-merek-500 focus:outline-none disabled:bg-neutral-100';

type Tab = 'pesanan' | 'poin' | 'alamat' | 'profil';

const TAB: { id: Tab; label: string }[] = [
  { id: 'pesanan', label: 'Pesanan Saya' },
  { id: 'poin', label: 'Riwayat Poin' },
  { id: 'alamat', label: 'Buku Alamat' },
  { id: 'profil', label: 'Profil' },
];

export function PanelAkun({
  profil,
  pesanan,
  mutasi,
  alamat,
  provinsi,
}: {
  profil: ProfilPelanggan;
  pesanan: PesananSaya[];
  mutasi: MutasiPoin[];
  alamat: AlamatTersimpan[];
  provinsi: string[];
}) {
  const [tab, setTab] = useState<Tab>('pesanan');

  return (
    <div>
      <div className="border-b border-neutral-200">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Bagian akun">
          {TAB.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'border-merek-700 text-merek-800'
                  : 'border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="pt-6">
        {tab === 'pesanan' && <DaftarPesanan pesanan={pesanan} />}
        {tab === 'poin' && <RiwayatPoin mutasi={mutasi} />}
        {tab === 'alamat' && <BukuAlamat alamat={alamat} provinsi={provinsi} />}
        {tab === 'profil' && <PengaturanProfil profil={profil} />}
      </div>
    </div>
  );
}

// --- Pesanan ---------------------------------------------------------------

function DaftarPesanan({ pesanan }: { pesanan: PesananSaya[] }) {
  if (pesanan.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white py-16 text-center">
        <p className="text-sm text-neutral-600">Belum ada pesanan.</p>
        <Link
          href="/produk"
          className="mt-4 inline-block rounded-lg bg-merek-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-merek-800"
        >
          Mulai belanja
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {pesanan.map((o) => {
        const gaya = STATUS_PESANAN[o.status];
        return (
          <li key={o.nomor} className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 gap-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                  {o.gambarUtama && (
                    <Image src={o.gambarUtama} alt="" fill sizes="64px" className="object-cover" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-medium text-neutral-900">
                      {o.nomor}
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-semibold ${gaya.kelasLencana}`}
                    >
                      {gaya.label}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm text-neutral-700">{o.ringkasanBarang}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {tanggal(o.createdAt)} &middot; {o.jumlahBarang} barang
                    {o.nomorResi && ` · resi ${o.nomorResi}`}
                  </p>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <p className="font-semibold text-neutral-900">{rupiah(o.total)}</p>
                {o.poinDidapat > 0 ? (
                  <p className="mt-0.5 text-xs font-medium text-merek-700">
                    +{o.poinDidapat.toLocaleString('id-ID')} poin
                  </p>
                ) : o.poinTertunda > 0 ? (
                  <p className="mt-0.5 text-xs text-neutral-500">
                    +{o.poinTertunda.toLocaleString('id-ID')} poin menunggu
                  </p>
                ) : null}
                <Link
                  href={`/pesanan/${o.nomor}?token=${o.token}`}
                  className="mt-1.5 inline-block text-xs font-medium text-merek-700 hover:text-merek-800"
                >
                  Lihat detail
                </Link>
              </div>
            </div>

            {(o.diskon > 0 || o.potonganPoin > 0) && (
              <p className="mt-3 border-t border-neutral-100 pt-2 text-xs text-neutral-500">
                Hemat{' '}
                {[
                  o.diskon > 0 ? `${rupiah(o.diskon)} dari voucher` : null,
                  o.potonganPoin > 0 ? `${rupiah(o.potonganPoin)} dari poin` : null,
                ]
                  .filter(Boolean)
                  .join(' dan ')}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// --- Riwayat poin ----------------------------------------------------------

const LABEL_MUTASI: Record<MutasiPoin['tipe'], string> = {
  EARN: 'Poin masuk',
  REDEEM: 'Dipakai belanja',
  TO_VOUCHER: 'Ditukar voucher',
  ADJUST: 'Penyesuaian',
  REFUND: 'Dikembalikan',
};

function RiwayatPoin({ mutasi }: { mutasi: MutasiPoin[] }) {
  if (mutasi.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white py-16 text-center">
        <p className="text-sm text-neutral-600">
          Belum ada mutasi poin. Poin masuk setelah pesanan Anda diterima.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 bg-white">
      {mutasi.map((m) => (
        <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-neutral-800">{LABEL_MUTASI[m.tipe]}</p>
            <p className="mt-0.5 truncate text-xs text-neutral-500">{m.keterangan}</p>
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
  );
}

// --- Buku alamat -----------------------------------------------------------

function BukuAlamat({ alamat, provinsi }: { alamat: AlamatTersimpan[]; provinsi: string[] }) {
  const [sunting, setSunting] = useState<AlamatTersimpan | 'baru' | null>(null);

  if (sunting) {
    return (
      <FormAlamat
        alamat={sunting === 'baru' ? undefined : sunting}
        provinsi={provinsi}
        onSelesai={() => setSunting(null)}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setSunting('baru')}
          className="rounded-lg bg-merek-700 px-4 py-2 text-sm font-semibold text-white hover:bg-merek-800"
        >
          + Tambah Alamat
        </button>
      </div>

      {alamat.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white py-16 text-center">
          <p className="text-sm text-neutral-600">
            Belum ada alamat tersimpan. Tambahkan satu agar checkout berikutnya lebih cepat.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {alamat.map((a) => (
            <li key={a.id} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-neutral-900">{a.label}</span>
                    {a.utama && (
                      <span className="rounded-md bg-merek-100 px-2 py-0.5 text-xs font-semibold text-merek-800">
                        Utama
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-neutral-700">
                    {a.namaPenerima} &middot; {a.teleponPenerima}
                  </p>
                  <p className="mt-0.5 text-sm text-neutral-600">
                    {a.alamatLengkap}, {a.kecamatan ? `${a.kecamatan}, ` : ''}
                    {a.kota}, {a.provinsi} {a.kodePos}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSunting(a)}
                    className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-merek-700 hover:bg-merek-50"
                  >
                    Ubah
                  </button>
                  <TombolHapusAlamat id={a.id} label={a.label} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TombolHapusAlamat({ id, label }: { id: string; label: string }) {
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [menunggu, mulai] = useTransition();
  const router = useRouter();

  if (!konfirmasi) {
    return (
      <button
        type="button"
        onClick={() => setKonfirmasi(true)}
        className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
      >
        Hapus
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-xs text-neutral-600">Hapus &ldquo;{label}&rdquo;?</span>
      <button
        type="button"
        disabled={menunggu}
        onClick={() =>
          mulai(async () => {
            await hapusAlamat(id);
            router.refresh();
          })
        }
        className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
      >
        {menunggu ? '...' : 'Ya'}
      </button>
      <button
        type="button"
        onClick={() => setKonfirmasi(false)}
        className="rounded-lg px-2 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
      >
        Batal
      </button>
    </span>
  );
}

function FormAlamat({
  alamat,
  provinsi,
  onSelesai,
}: {
  alamat?: AlamatTersimpan;
  provinsi: string[];
  onSelesai: () => void;
}) {
  const [status, kirim, menunggu] = useActionState(simpanAlamat, awal);
  const [pilihProvinsi, setPilihProvinsi] = useState(alamat?.provinsi ?? '');
  const [pilihKota, setPilihKota] = useState(alamat?.kota ?? '');
  const [pilihKecamatan, setPilihKecamatan] = useState(alamat?.kecamatan ?? '');
  const [kota, setKota] = useState<string[]>([]);
  const [kecamatan, setKecamatan] = useState<string[]>([]);
  const router = useRouter();

  const g = status.galatField ?? {};

  useEffect(() => {
    if (!pilihProvinsi) {
      setKota([]);
      return;
    }
    let batal = false;
    ambilKota(pilihProvinsi).then((d) => {
      if (!batal) setKota(d);
    });
    return () => {
      batal = true;
    };
  }, [pilihProvinsi]);

  useEffect(() => {
    if (!pilihProvinsi || !pilihKota) {
      setKecamatan([]);
      return;
    }
    let batal = false;
    ambilKecamatan(pilihProvinsi, pilihKota).then((d) => {
      if (!batal) setKecamatan(d);
    });
    return () => {
      batal = true;
    };
  }, [pilihProvinsi, pilihKota]);

  useEffect(() => {
    if (status.ok) {
      router.refresh();
      onSelesai();
    }
  }, [status.ok, router, onSelesai]);

  function tanganiSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => kirim(formData));
  }

  return (
    <form onSubmit={tanganiSubmit} className="rounded-xl border border-neutral-200 bg-white p-5">
      {alamat && <input type="hidden" name="id" value={alamat.id} />}

      <h2 className="text-base font-semibold text-neutral-900">
        {alamat ? 'Ubah Alamat' : 'Alamat Baru'}
      </h2>

      {status.galat && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {status.galat}
        </p>
      )}

      <div className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Bidang label="Nama alamat" nama="label" galat={g.label}>
            <input
              id="label"
              name="label"
              defaultValue={alamat?.label}
              required
              className={kelasInput}
              placeholder="Rumah"
            />
          </Bidang>
          <Bidang label="Nama penerima" nama="namaPenerima" galat={g.namaPenerima}>
            <input
              id="namaPenerima"
              name="namaPenerima"
              defaultValue={alamat?.namaPenerima}
              required
              className={kelasInput}
              placeholder="Budi Santoso"
            />
          </Bidang>
        </div>

        <Bidang label="Nomor penerima" nama="teleponPenerima" galat={g.teleponPenerima}>
          <input
            id="teleponPenerima"
            name="teleponPenerima"
            type="tel"
            defaultValue={alamat?.teleponPenerima}
            required
            className={kelasInput}
            placeholder="081234567890"
          />
        </Bidang>

        <Bidang label="Alamat lengkap" nama="alamatLengkap" galat={g.alamatLengkap}>
          <textarea
            id="alamatLengkap"
            name="alamatLengkap"
            rows={3}
            defaultValue={alamat?.alamatLengkap}
            required
            className={kelasInput}
            placeholder="Jl. Merdeka No. 12, RT 03 RW 05, Blok C"
          />
        </Bidang>

        <div className="grid gap-4 sm:grid-cols-2">
          <Bidang label="Provinsi" nama="provinsi" galat={g.provinsi}>
            <select
              id="provinsi"
              name="provinsi"
              value={pilihProvinsi}
              onChange={(e) => {
                setPilihProvinsi(e.target.value);
                setPilihKota('');
                setPilihKecamatan('');
              }}
              required
              className={kelasInput}
            >
              <option value="">— Pilih provinsi —</option>
              {provinsi.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Bidang>

          <Bidang label="Kota / Kabupaten" nama="kota" galat={g.kota}>
            <select
              id="kota"
              name="kota"
              value={pilihKota}
              onChange={(e) => {
                setPilihKota(e.target.value);
                setPilihKecamatan('');
              }}
              required
              disabled={kota.length === 0}
              className={kelasInput}
            >
              <option value="">— Pilih kota/kabupaten —</option>
              {kota.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </Bidang>

          <Bidang label="Kecamatan" nama="kecamatan" galat={g.kecamatan}>
            <select
              id="kecamatan"
              name="kecamatan"
              value={pilihKecamatan}
              onChange={(e) => setPilihKecamatan(e.target.value)}
              disabled={kecamatan.length === 0}
              className={kelasInput}
            >
              <option value="">— Pilih kecamatan —</option>
              {kecamatan.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </Bidang>

          <Bidang label="Kode pos" nama="kodePos" galat={g.kodePos}>
            <input
              id="kodePos"
              name="kodePos"
              inputMode="numeric"
              maxLength={5}
              defaultValue={alamat?.kodePos}
              required
              className={kelasInput}
              placeholder="40132"
            />
          </Bidang>
        </div>

        <Bidang label="Catatan untuk kurir" nama="catatan" galat={g.catatan}>
          <input
            id="catatan"
            name="catatan"
            defaultValue={alamat?.catatan ?? ''}
            className={kelasInput}
            placeholder="Pagar hijau, titip ke satpam bila tidak ada orang"
          />
        </Bidang>

        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            name="utama"
            defaultChecked={alamat?.utama ?? false}
            className="h-4 w-4 rounded border-neutral-300 text-merek-600 focus:ring-merek-500"
          />
          <span className="text-sm text-neutral-700">Jadikan alamat utama</span>
        </label>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="submit"
          disabled={menunggu}
          className="rounded-lg bg-merek-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-merek-800 disabled:opacity-60"
        >
          {menunggu ? 'Menyimpan...' : 'Simpan alamat'}
        </button>
        <button
          type="button"
          onClick={onSelesai}
          className="rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
        >
          Batal
        </button>
      </div>
    </form>
  );
}

// --- Profil ----------------------------------------------------------------

function PengaturanProfil({ profil }: { profil: ProfilPelanggan }) {
  const [statusProfil, kirimProfil, menungguProfil] = useActionState(simpanProfil, awal);
  const [statusSandi, kirimSandi, menungguSandi] = useActionState(gantiSandi, awal);

  const gp = statusProfil.galatField ?? {};
  const gs = statusSandi.galatField ?? {};

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => kirimProfil(fd));
        }}
        className="rounded-xl border border-neutral-200 bg-white p-5"
      >
        <h2 className="text-base font-semibold text-neutral-900">Data Diri</h2>

        {statusProfil.galat && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {statusProfil.galat}
          </p>
        )}
        {statusProfil.pesan && (
          <p className="mt-3 rounded-lg bg-merek-50 px-3 py-2 text-sm text-merek-800">
            {statusProfil.pesan}
          </p>
        )}

        <div className="mt-4 space-y-4">
          <Bidang label="Nama lengkap" nama="nama" galat={gp.nama}>
            <input
              id="nama"
              name="nama"
              defaultValue={profil.nama}
              required
              className={kelasInput}
            />
          </Bidang>

          <Bidang label="Nomor WhatsApp" nama="telepon" galat={gp.telepon}>
            <input
              id="telepon"
              name="telepon"
              type="tel"
              defaultValue={profil.telepon ?? ''}
              className={kelasInput}
              placeholder="081234567890"
            />
          </Bidang>

          <Bidang
            label="Email"
            nama="email-tampil"
            petunjuk="Email dipakai untuk masuk dan tidak bisa diubah sendiri. Hubungi kami bila perlu diganti."
          >
            <input
              id="email-tampil"
              value={profil.email}
              disabled
              className={kelasInput}
              readOnly
            />
          </Bidang>
        </div>

        <button
          type="submit"
          disabled={menungguProfil}
          className="mt-5 rounded-lg bg-merek-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-merek-800 disabled:opacity-60"
        >
          {menungguProfil ? 'Menyimpan...' : 'Simpan perubahan'}
        </button>
      </form>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => kirimSandi(fd));
          e.currentTarget.reset();
        }}
        className="rounded-xl border border-neutral-200 bg-white p-5"
      >
        <h2 className="text-base font-semibold text-neutral-900">Ganti Kata Sandi</h2>

        {statusSandi.galat && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {statusSandi.galat}
          </p>
        )}
        {statusSandi.pesan && (
          <p className="mt-3 rounded-lg bg-merek-50 px-3 py-2 text-sm text-merek-800">
            {statusSandi.pesan}
          </p>
        )}

        <div className="mt-4 space-y-4">
          <Bidang label="Kata sandi lama" nama="sandiLama" galat={gs.sandiLama}>
            <input
              id="sandiLama"
              name="sandiLama"
              type="password"
              autoComplete="current-password"
              required
              className={kelasInput}
            />
          </Bidang>

          <Bidang
            label="Kata sandi baru"
            nama="sandiBaru"
            galat={gs.sandiBaru}
            petunjuk="Minimal 8 karakter."
          >
            <input
              id="sandiBaru"
              name="sandiBaru"
              type="password"
              autoComplete="new-password"
              required
              className={kelasInput}
            />
          </Bidang>

          <Bidang label="Ulangi kata sandi baru" nama="ulangi" galat={gs.ulangi}>
            <input
              id="ulangi"
              name="ulangi"
              type="password"
              autoComplete="new-password"
              required
              className={kelasInput}
            />
          </Bidang>
        </div>

        <button
          type="submit"
          disabled={menungguSandi}
          className="mt-5 rounded-lg border border-neutral-300 px-5 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
        >
          {menungguSandi ? 'Memproses...' : 'Ganti kata sandi'}
        </button>
      </form>
    </div>
  );
}

function Bidang({
  label,
  nama,
  galat,
  petunjuk,
  children,
}: {
  label: string;
  nama: string;
  galat?: string;
  petunjuk?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={nama} className="block text-sm font-medium text-neutral-700">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {petunjuk && !galat && <p className="mt-1 text-xs text-neutral-500">{petunjuk}</p>}
      {galat && (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {galat}
        </p>
      )}
    </div>
  );
}
