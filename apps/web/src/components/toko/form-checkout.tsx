'use client';

import Link from 'next/link';
import { startTransition, useActionState, useEffect, useState, useTransition } from 'react';
import {
  ambilKecamatan,
  ambilKota,
  buatPesanan,
  cekVoucher,
  hitungOngkir,
  type HasilCheckout,
} from '@/app/(toko)/actions-checkout';
import { berat as formatBerat, rupiah } from '@/lib/format';
import { bacaAtribusi, lacakMulaiCheckout, type Atribusi } from '@/lib/tracking';
import type {
  AlamatTersimpan,
  HasilOngkir,
  HasilVoucher,
  RingkasanKeranjang,
} from '@/lib/types';

const awal: HasilCheckout = { ok: false };

export function FormCheckout({
  keranjang,
  provinsi,
  pelanggan,
  alamatTersimpan,
}: {
  keranjang: RingkasanKeranjang;
  provinsi: string[];
  /** Null bila pembeli belanja sebagai tamu — checkout tetap jalan penuh. */
  pelanggan: { nama: string; email: string; telepon: string | null; poin: number } | null;
  alamatTersimpan: AlamatTersimpan[];
}) {
  const [status, kirim, menunggu] = useActionState(buatPesanan, awal);

  const [alamat, setAlamat] = useState({ provinsi: '', kota: '', kecamatan: '', kodePos: '' });

  // Isian teks dikendalikan state supaya tombol "pakai alamat tersimpan" bisa
  // mengisinya sekaligus. Untuk pembeli tamu perilakunya sama seperti dulu:
  // kolom kosong yang diketik sendiri.
  const [isian, setIsian] = useState({
    nama: pelanggan?.nama ?? '',
    email: pelanggan?.email ?? '',
    telepon: pelanggan?.telepon ?? '',
    alamatLengkap: '',
    catatan: '',
  });

  function pakaiAlamat(a: AlamatTersimpan) {
    setIsian((i) => ({
      ...i,
      nama: a.namaPenerima,
      telepon: a.teleponPenerima,
      alamatLengkap: a.alamatLengkap,
      catatan: a.catatan ?? '',
    }));
    setAlamat({
      provinsi: a.provinsi,
      kota: a.kota,
      kecamatan: a.kecamatan ?? '',
      kodePos: a.kodePos,
    });
  }
  const [ongkir, setOngkir] = useState<HasilOngkir | null>(null);
  const [galatOngkir, setGalatOngkir] = useState<string | null>(null);
  const [kodeOngkir, setKodeOngkir] = useState('');
  const [menghitung, mulaiHitung] = useTransition();

  // Atribusi dibaca sekali di browser lalu ikut terkirim sebagai hidden input,
  // supaya pesanan tahu dari kampanye iklan mana ia datang.
  // Daftar kota & kecamatan diambil bertingkat mengikuti pilihan di atasnya.
  const [daftarKota, setDaftarKota] = useState<string[]>([]);
  const [daftarKecamatan, setDaftarKecamatan] = useState<string[]>([]);
  const [memuatKota, setMemuatKota] = useState(false);
  const [memuatKecamatan, setMemuatKecamatan] = useState(false);

  // Voucher: kode yang diketik vs voucher yang sudah lolos pemeriksaan.
  const [kodeVoucher, setKodeVoucher] = useState('');
  const [voucher, setVoucher] = useState<HasilVoucher | null>(null);
  const [galatVoucher, setGalatVoucher] = useState<string | null>(null);

  // Poin yang ingin dipakai. Angkanya cuma untuk pratinjau — potongan
  // sebenarnya dihitung ulang API dari jumlah poin ini saat pesanan dibuat.
  const [poin, setPoin] = useState(0);
  const [memeriksaVoucher, mulaiPeriksaVoucher] = useTransition();

  const [atribusi, setAtribusi] = useState<Atribusi>({});
  useEffect(() => {
    setAtribusi(bacaAtribusi());
    lacakMulaiCheckout(keranjang.subtotal);
  }, [keranjang.subtotal]);

  // Ganti provinsi → daftar kota dimuat ulang, kota & kecamatan dikosongkan
  // supaya tidak tertinggal pilihan dari provinsi sebelumnya.
  useEffect(() => {
    let batal = false;
    setDaftarKota([]);
    setDaftarKecamatan([]);

    if (!alamat.provinsi) return;

    setMemuatKota(true);
    ambilKota(alamat.provinsi)
      .then((daftar) => {
        if (!batal) setDaftarKota(daftar);
      })
      .finally(() => {
        if (!batal) setMemuatKota(false);
      });

    return () => {
      batal = true;
    };
  }, [alamat.provinsi]);

  useEffect(() => {
    let batal = false;
    setDaftarKecamatan([]);

    if (!alamat.provinsi || !alamat.kota) return;

    setMemuatKecamatan(true);
    ambilKecamatan(alamat.provinsi, alamat.kota)
      .then((daftar) => {
        if (!batal) setDaftarKecamatan(daftar);
      })
      .finally(() => {
        if (!batal) setMemuatKecamatan(false);
      });

    return () => {
      batal = true;
    };
  }, [alamat.provinsi, alamat.kota]);

  const alamatLengkap =
    alamat.provinsi !== '' && alamat.kota.trim().length >= 2 && /^\d{5}$/.test(alamat.kodePos);

  // Ongkir dihitung ulang tiap kali alamat berubah, dengan jeda supaya tidak
  // memanggil API di setiap ketikan kode pos.
  useEffect(() => {
    if (!alamatLengkap) {
      setOngkir(null);
      setKodeOngkir('');
      return;
    }

    const timer = setTimeout(() => {
      mulaiHitung(async () => {
        setGalatOngkir(null);
        const hasil = await hitungOngkir(alamat);
        if (hasil.ok && hasil.hasil) {
          setOngkir(hasil.hasil);
          // Opsi termurah dipilih otomatis agar pembeli tidak harus memilih
          // sendiri untuk bisa lanjut.
          setKodeOngkir((sekarang) =>
            hasil.hasil!.opsi.some((o) => o.kode === sekarang)
              ? sekarang
              : (hasil.hasil!.opsi[0]?.kode ?? ''),
          );
        } else {
          setOngkir(null);
          setKodeOngkir('');
          setGalatOngkir(hasil.galat ?? 'Gagal menghitung ongkir');
        }
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [alamat, alamatLengkap]);

  const opsiTerpilih = ongkir?.opsi.find((o) => o.kode === kodeOngkir) ?? null;
  const diskon = voucher?.potongan ?? 0;

  // Batasannya persis sama dengan yang dipakai API (maksPoinUntuk): setengah
  // nilai belanja setelah voucher, dan tidak melebihi saldo. Menghitungnya di
  // sini hanya agar penggeser tidak bisa diseret ke angka yang pasti ditolak.
  const maksPoin = pelanggan
    ? Math.max(0, Math.min(pelanggan.poin, Math.floor(((keranjang.subtotal - diskon) * 0.5) / 100)))
    : 0;
  const poinTerpakai = Math.min(poin, maksPoin);
  const potonganPoin = poinTerpakai * 100;

  const total =
    Math.max(0, keranjang.subtotal - diskon - potonganPoin) + (opsiTerpilih?.ongkir ?? 0);

  function terapkanVoucher() {
    setGalatVoucher(null);
    mulaiPeriksaVoucher(async () => {
      const hasil = await cekVoucher(kodeVoucher);
      if (hasil.ok && hasil.hasil) {
        setVoucher(hasil.hasil);
      } else {
        setVoucher(null);
        setGalatVoucher(hasil.galat ?? 'Kode voucher tidak berlaku');
      }
    });
  }

  function lepasVoucher() {
    setVoucher(null);
    setKodeVoucher('');
    setGalatVoucher(null);
  }
  const g = status.galatField ?? {};

  function tanganiSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => kirim(formData));
  }

  return (
    <form onSubmit={tanganiSubmit} className="grid gap-6 lg:grid-cols-3 lg:gap-8">
      <input type="hidden" name="kodeOngkir" value={kodeOngkir} />
      <input type="hidden" name="kodeVoucher" value={voucher?.kode ?? ''} />
      <input type="hidden" name="poinDipakai" value={poinTerpakai} />
      <input type="hidden" name="utmSource" value={atribusi.utmSource ?? ''} />
      <input type="hidden" name="utmMedium" value={atribusi.utmMedium ?? ''} />
      <input type="hidden" name="utmCampaign" value={atribusi.utmCampaign ?? ''} />
      <input type="hidden" name="utmContent" value={atribusi.utmContent ?? ''} />
      <input type="hidden" name="utmTerm" value={atribusi.utmTerm ?? ''} />
      <input type="hidden" name="landingSlug" value={atribusi.landingSlug ?? ''} />

      <div className="space-y-5 lg:col-span-2">
        {status.galat && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {status.galat}
          </p>
        )}

        {alamatTersimpan.length > 0 && (
          <Kartu judul="Alamat Tersimpan">
            <p className="text-sm text-neutral-600">
              Pilih salah satu untuk mengisi form di bawah.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {alamatTersimpan.map((a) => {
                const dipakai =
                  isian.alamatLengkap === a.alamatLengkap &&
                  alamat.kota === a.kota &&
                  alamat.kodePos === a.kodePos;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => pakaiAlamat(a)}
                    aria-pressed={dipakai}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      dipakai
                        ? 'border-merek-600 bg-merek-50'
                        : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-medium text-neutral-900">{a.label}</span>
                      {a.utama && (
                        <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-700">
                          Utama
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-xs text-neutral-600">{a.namaPenerima}</span>
                    <span className="mt-0.5 line-clamp-2 block text-xs text-neutral-500">
                      {a.alamatLengkap}, {a.kota}
                    </span>
                  </button>
                );
              })}
            </div>
          </Kartu>
        )}

        <Kartu judul="Data Penerima">
          <Bidang label="Nama lengkap" nama="nama" galat={g.nama} wajib>
            <input
              name="nama"
              id="nama"
              required
              autoComplete="name"
              value={isian.nama}
              onChange={(e) => setIsian((i) => ({ ...i, nama: e.target.value }))}
              className={kelasInput}
              placeholder="Budi Santoso"
            />
          </Bidang>

          <div className="grid gap-4 sm:grid-cols-2">
            <Bidang
              label="Email"
              nama="email"
              galat={g.email}
              petunjuk="Bukti pembayaran dikirim ke sini"
              wajib
            >
              <input
                name="email"
                id="email"
                type="email"
                required
                autoComplete="email"
                value={isian.email}
                onChange={(e) => setIsian((i) => ({ ...i, email: e.target.value }))}
                className={kelasInput}
                placeholder="budi@contoh.id"
              />
            </Bidang>

            <Bidang
              label="Nomor WhatsApp"
              nama="telepon"
              galat={g.telepon}
              petunjuk="Kami hubungi lewat sini kalau ada kendala"
              wajib
            >
              <input
                name="telepon"
                id="telepon"
                type="tel"
                required
                autoComplete="tel"
                inputMode="numeric"
                value={isian.telepon}
                onChange={(e) => setIsian((i) => ({ ...i, telepon: e.target.value }))}
                className={kelasInput}
                placeholder="081234567890"
              />
            </Bidang>
          </div>
        </Kartu>

        <Kartu judul="Alamat Pengiriman">
          <Bidang label="Alamat lengkap" nama="alamatLengkap" galat={g.alamatLengkap} wajib>
            <textarea
              name="alamatLengkap"
              id="alamatLengkap"
              rows={3}
              required
              autoComplete="street-address"
              value={isian.alamatLengkap}
              onChange={(e) => setIsian((i) => ({ ...i, alamatLengkap: e.target.value }))}
              className={kelasInput}
              placeholder="Jl. Merdeka No. 12, RT 03 RW 05, Blok C"
            />
          </Bidang>

          <div className="grid gap-4 sm:grid-cols-2">
            <Bidang label="Provinsi" nama="provinsi" galat={g.provinsi} wajib>
              <select
                name="provinsi" id="provinsi"
                required
                value={alamat.provinsi}
                onChange={(e) =>
                  setAlamat({ provinsi: e.target.value, kota: '', kecamatan: '', kodePos: alamat.kodePos })
                }
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

            <Bidang
              label="Kota / Kabupaten"
              nama="kota"
              galat={g.kota}
              petunjuk={!alamat.provinsi ? 'Pilih provinsi dulu' : undefined}
              wajib
            >
              <select
                name="kota"
                id="kota"
                required
                disabled={!alamat.provinsi || memuatKota}
                value={alamat.kota}
                onChange={(e) => setAlamat((a) => ({ ...a, kota: e.target.value, kecamatan: '' }))}
                className={kelasInput}
              >
                <option value="">
                  {memuatKota ? 'Memuat...' : '— Pilih kota/kabupaten —'}
                </option>
                {daftarKota.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </Bidang>

            <Bidang
              label="Kecamatan"
              nama="kecamatan"
              galat={g.kecamatan}
              petunjuk={!alamat.kota ? 'Pilih kota/kabupaten dulu' : undefined}
            >
              <select
                name="kecamatan"
                id="kecamatan"
                disabled={!alamat.kota || memuatKecamatan}
                value={alamat.kecamatan}
                onChange={(e) => setAlamat((a) => ({ ...a, kecamatan: e.target.value }))}
                className={kelasInput}
              >
                <option value="">
                  {memuatKecamatan ? 'Memuat...' : '— Pilih kecamatan —'}
                </option>
                {daftarKecamatan.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </Bidang>

            <Bidang label="Kode pos" nama="kodePos" galat={g.kodePos} wajib>
              <input
                name="kodePos" id="kodePos"
                required
                inputMode="numeric"
                maxLength={5}
                value={alamat.kodePos}
                onChange={(e) =>
                  setAlamat((a) => ({ ...a, kodePos: e.target.value.replace(/\D/g, '').slice(0, 5) }))
                }
                className={kelasInput}
                placeholder="12110"
              />
            </Bidang>
          </div>

          <Bidang
            label="Catatan untuk kurir"
            nama="catatan"
            galat={g.catatan}
            petunjuk="Opsional — patokan rumah, jam terima, dsb."
          >
            <input
              name="catatan"
              id="catatan"
              maxLength={300}
              value={isian.catatan}
              onChange={(e) => setIsian((i) => ({ ...i, catatan: e.target.value }))}
              className={kelasInput}
              placeholder="Rumah pagar hijau, titip ke satpam bila tidak ada orang"
            />
          </Bidang>
        </Kartu>

        <Kartu judul="Pilih Pengiriman">
          {!alamatLengkap ? (
            <p className="rounded-lg bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
              Lengkapi provinsi, kota, dan kode pos untuk melihat pilihan pengiriman.
            </p>
          ) : menghitung ? (
            <p className="rounded-lg bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
              Menghitung ongkos kirim...
            </p>
          ) : galatOngkir ? (
            <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {galatOngkir}
            </p>
          ) : (
            <>
              {ongkir?.catatan && (
                <p className="rounded-lg bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
                  {ongkir.catatan}
                </p>
              )}

              <fieldset className="space-y-2">
                <legend className="sr-only">Layanan pengiriman</legend>
                {ongkir?.opsi.map((o) => (
                  <label
                    key={o.kode}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3.5 transition-colors ${
                      kodeOngkir === o.kode
                        ? 'border-merek-600 bg-merek-50'
                        : 'border-neutral-200 hover:border-merek-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="pilihOngkir"
                      checked={kodeOngkir === o.kode}
                      onChange={() => setKodeOngkir(o.kode)}
                      className="h-4 w-4 shrink-0 text-merek-600"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-neutral-900">
                        {o.kurir} &mdash; {o.nama}
                      </span>
                      <span className="block text-xs text-neutral-500">{o.deskripsi}</span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-neutral-900">
                      {rupiah(o.ongkir)}
                    </span>
                  </label>
                ))}
              </fieldset>
            </>
          )}

          {g.kodeOngkir && (
            <p role="alert" className="text-sm text-red-600">
              {g.kodeOngkir}
            </p>
          )}
        </Kartu>
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="text-base font-semibold text-neutral-900">Ringkasan Pesanan</h2>

          <ul className="mt-4 space-y-3 border-b border-neutral-100 pb-4">
            {keranjang.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate text-neutral-800">{i.nama}</span>
                  <span className="text-xs text-neutral-500">
                    {i.namaVarian ? `${i.namaVarian} · ` : ''}
                    {i.jumlah} &times; {rupiah(i.harga)}
                  </span>
                </span>
                <span className="shrink-0 font-medium text-neutral-900">{rupiah(i.subtotal)}</span>
              </li>
            ))}
          </ul>

          {/* Voucher diletakkan tepat di atas rincian harga, supaya potongannya
              langsung terlihat begitu diterapkan. */}
          <div className="mt-4 border-t border-neutral-100 pt-4">
            {voucher ? (
              <div className="flex items-start justify-between gap-3 rounded-lg bg-merek-50 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-merek-800">{voucher.kode}</p>
                  {voucher.deskripsi && (
                    <p className="text-xs text-merek-700">{voucher.deskripsi}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={lepasVoucher}
                  className="shrink-0 text-xs font-medium text-neutral-600 hover:text-red-600"
                >
                  Lepas
                </button>
              </div>
            ) : (
              <>
                <label htmlFor="inputVoucher" className="text-sm font-medium text-neutral-700">
                  Punya kode voucher?
                </label>
                <div className="mt-1.5 flex gap-2">
                  <input
                    id="inputVoucher"
                    value={kodeVoucher}
                    onChange={(e) => setKodeVoucher(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      // Enter di kolom voucher tidak boleh mengirim seluruh form.
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        terapkanVoucher();
                      }
                    }}
                    placeholder="HEMAT10"
                    className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm uppercase focus:border-merek-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={terapkanVoucher}
                    disabled={memeriksaVoucher || kodeVoucher.trim().length < 3}
                    className="shrink-0 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                  >
                    {memeriksaVoucher ? '...' : 'Pakai'}
                  </button>
                </div>
                {galatVoucher && (
                  <p role="alert" className="mt-1.5 text-xs text-red-600">
                    {galatVoucher}
                  </p>
                )}
              </>
            )}
          </div>

          {pelanggan && pelanggan.poin > 0 && (
            <div className="mt-4 rounded-lg border border-neutral-200 p-3">
              {maksPoin === 0 ? (
                <p className="text-xs text-neutral-500">
                  Saldo {pelanggan.poin.toLocaleString('id-ID')} poin belum bisa dipakai untuk
                  belanja sekecil ini.
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <label htmlFor="poin" className="text-sm font-medium text-neutral-700">
                      Pakai poin
                    </label>
                    <span className="text-xs text-neutral-500">
                      saldo {pelanggan.poin.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <input
                    id="poin"
                    type="range"
                    min={0}
                    max={maksPoin}
                    step={10}
                    value={poinTerpakai}
                    onChange={(e) => setPoin(Number(e.target.value))}
                    className="mt-2 w-full accent-merek-700"
                  />
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span>{poinTerpakai.toLocaleString('id-ID')} poin</span>
                    <span>
                      hemat {rupiah(potonganPoin)}
                      {poinTerpakai === maksPoin && maksPoin < pelanggan.poin && ' (maksimal)'}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-neutral-500">
                    Poin bisa menutup paling banyak setengah nilai belanja, di luar ongkir.
                  </p>
                </>
              )}
            </div>
          )}

          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-600">Subtotal</dt>
              <dd className="font-medium text-neutral-900">{rupiah(keranjang.subtotal)}</dd>
            </div>
            {diskon > 0 && (
              <div className="flex justify-between">
                <dt className="text-neutral-600">Diskon voucher</dt>
                <dd className="font-medium text-merek-700">-{rupiah(diskon)}</dd>
              </div>
            )}
            {potonganPoin > 0 && (
              <div className="flex justify-between">
                <dt className="text-neutral-600">
                  Potongan poin ({poinTerpakai.toLocaleString('id-ID')} poin)
                </dt>
                <dd className="font-medium text-merek-700">-{rupiah(potonganPoin)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-neutral-600">Berat</dt>
              <dd className="text-neutral-700">{formatBerat(keranjang.beratTotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-600">Ongkos kirim</dt>
              <dd className={opsiTerpilih ? 'font-medium text-neutral-900' : 'text-neutral-500'}>
                {opsiTerpilih ? rupiah(opsiTerpilih.ongkir) : 'Belum dipilih'}
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex items-baseline justify-between border-t border-neutral-200 pt-4">
            <span className="font-semibold text-neutral-900">Total</span>
            <span className="text-xl font-semibold text-neutral-900">{rupiah(total)}</span>
          </div>

          <button
            type="submit"
            disabled={menunggu || !opsiTerpilih}
            className="mt-5 w-full rounded-lg bg-merek-700 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-merek-800 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500 sm:text-base"
          >
            {menunggu ? 'Membuat pesanan...' : 'Lanjut ke Pembayaran'}
          </button>

          <p className="mt-3 text-center text-xs leading-relaxed text-neutral-500">
            Dengan melanjutkan, Anda menyetujui{' '}
            <Link href="/legal/syarat-ketentuan" className="underline hover:text-merek-700">
              syarat &amp; ketentuan
            </Link>{' '}
            kami.
          </p>

          <Link
            href="/keranjang"
            className="mt-3 block text-center text-sm font-medium text-merek-700 hover:text-merek-800"
          >
            Kembali ke keranjang
          </Link>
        </div>
      </aside>
    </form>
  );
}

// ---------------------------------------------------------------------------

const kelasInput =
  'w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-merek-500 focus:outline-none';

function Kartu({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5">
      <h2 className="text-base font-semibold text-neutral-900">{judul}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Bidang({
  label,
  nama,
  galat,
  petunjuk,
  wajib,
  children,
}: {
  label: string;
  nama: string;
  galat?: string;
  petunjuk?: string;
  wajib?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={nama} className="block text-sm font-medium text-neutral-700">
        {label}
        {wajib && <span className="ml-0.5 text-red-500">*</span>}
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
