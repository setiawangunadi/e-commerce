'use client';

import Link from 'next/link';
import { startTransition, useActionState } from 'react';
import { daftar, masukPelanggan, type HasilAkun } from '@/app/(toko)/actions-akun';

const awal: HasilAkun = { ok: false };

const kelasInput =
  'w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-merek-500 focus:outline-none';

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

export function FormMasuk({ lanjut }: { lanjut?: string }) {
  const [status, kirim, menunggu] = useActionState(masukPelanggan, awal);
  const g = status.galatField ?? {};

  // action dipanggil manual agar React tidak mereset isian saat validasi gagal.
  function tanganiSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => kirim(formData));
  }

  return (
    <form onSubmit={tanganiSubmit} className="space-y-4">
      <input type="hidden" name="lanjut" value={lanjut ?? '/akun'} />

      {status.galat && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {status.galat}
        </p>
      )}

      <Bidang label="Email" nama="email" galat={g.email}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className={kelasInput}
          placeholder="budi@contoh.id"
        />
      </Bidang>

      <Bidang label="Kata sandi" nama="password" galat={g.password}>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={kelasInput}
          placeholder="••••••••"
        />
      </Bidang>

      <button
        type="submit"
        disabled={menunggu}
        className="w-full rounded-lg bg-merek-700 px-4 py-3 text-sm font-semibold text-white hover:bg-merek-800 disabled:opacity-60"
      >
        {menunggu ? 'Memproses...' : 'Masuk'}
      </button>

      <p className="text-center text-sm text-neutral-600">
        Belum punya akun?{' '}
        <Link
          href={lanjut ? `/daftar?lanjut=${encodeURIComponent(lanjut)}` : '/daftar'}
          className="font-medium text-merek-700 hover:text-merek-800"
        >
          Daftar sekarang
        </Link>
      </p>
    </form>
  );
}

export function FormDaftar({ lanjut }: { lanjut?: string }) {
  const [status, kirim, menunggu] = useActionState(daftar, awal);
  const g = status.galatField ?? {};

  function tanganiSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => kirim(formData));
  }

  return (
    <form onSubmit={tanganiSubmit} className="space-y-4">
      <input type="hidden" name="lanjut" value={lanjut ?? '/akun'} />

      {status.galat && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {status.galat}
        </p>
      )}

      <Bidang label="Nama lengkap" nama="nama" galat={g.nama}>
        <input
          id="nama"
          name="nama"
          autoComplete="name"
          required
          className={kelasInput}
          placeholder="Budi Santoso"
        />
      </Bidang>

      <Bidang
        label="Email"
        nama="email"
        galat={g.email}
        petunjuk="Dipakai untuk masuk dan menerima bukti pembayaran."
      >
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className={kelasInput}
          placeholder="budi@contoh.id"
        />
      </Bidang>

      <Bidang
        label="Nomor WhatsApp"
        nama="telepon"
        galat={g.telepon}
        petunjuk="Opsional. Kami hubungi lewat sini kalau ada kendala pengiriman."
      >
        <input
          id="telepon"
          name="telepon"
          type="tel"
          autoComplete="tel"
          className={kelasInput}
          placeholder="081234567890"
        />
      </Bidang>

      <Bidang
        label="Kata sandi"
        nama="password"
        galat={g.password}
        petunjuk="Minimal 8 karakter."
      >
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className={kelasInput}
          placeholder="••••••••"
        />
      </Bidang>

      <Bidang label="Ulangi kata sandi" nama="ulangi" galat={g.ulangi}>
        <input
          id="ulangi"
          name="ulangi"
          type="password"
          autoComplete="new-password"
          required
          className={kelasInput}
          placeholder="••••••••"
        />
      </Bidang>

      <button
        type="submit"
        disabled={menunggu}
        className="w-full rounded-lg bg-merek-700 px-4 py-3 text-sm font-semibold text-white hover:bg-merek-800 disabled:opacity-60"
      >
        {menunggu ? 'Mendaftarkan...' : 'Buat Akun'}
      </button>

      <p className="text-center text-sm text-neutral-600">
        Sudah punya akun?{' '}
        <Link
          href={lanjut ? `/masuk?lanjut=${encodeURIComponent(lanjut)}` : '/masuk'}
          className="font-medium text-merek-700 hover:text-merek-800"
        >
          Masuk di sini
        </Link>
      </p>
    </form>
  );
}
