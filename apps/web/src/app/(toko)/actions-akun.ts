'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { ApiError, apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import {
  ambilTokenPelanggan,
  hapusTokenPelanggan,
  simpanTokenPelanggan,
} from '@/lib/sesi-pelanggan';
import type { AlamatTersimpan, ProfilPelanggan } from '@/lib/types';

export interface HasilAkun {
  ok: boolean;
  galat?: string;
  galatField?: Record<string, string>;
  pesan?: string;
}

interface Sesi {
  accessToken: string;
  user: ProfilPelanggan;
  pesananDiklaim: number;
}

const TELEPON_ID = /^(\+?62|0)?8[1-9][0-9]{6,11}$/;

function teks(formData: FormData, nama: string): string {
  return String(formData.get(nama) ?? '');
}

function kumpulkanGalat(issues: z.ZodIssue[]): Record<string, string> {
  const galatField: Record<string, string> = {};
  for (const isu of issues) {
    const field = isu.path.join('.') || 'form';
    if (!galatField[field]) galatField[field] = isu.message;
  }
  return galatField;
}

function pesanApi(e: unknown, bawaan: string): string {
  if (e instanceof ApiError) {
    const rincian = Array.isArray(e.details) ? ` (${e.details.join(', ')})` : '';
    return `${e.message}${rincian}`;
  }
  return bawaan;
}

/** Menahan open redirect: hanya path internal yang diterima sebagai tujuan. */
function tujuanAman(nilai: string, bawaan = '/akun'): string {
  return nilai.startsWith('/') && !nilai.startsWith('//') ? nilai : bawaan;
}

// --- Daftar & masuk --------------------------------------------------------

const skemaDaftar = z
  .object({
    nama: z.string().trim().min(2, 'Nama minimal 2 karakter').max(120),
    email: z.email({ message: 'Format email tidak valid' }),
    telepon: z
      .string()
      .trim()
      .transform((v) => (v === '' ? undefined : v))
      .optional()
      .refine((v) => v === undefined || TELEPON_ID.test(v), {
        message: 'Nomor WhatsApp tidak valid, contoh: 081234567890',
      }),
    password: z.string().min(8, 'Kata sandi minimal 8 karakter'),
    ulangi: z.string(),
  })
  .refine((d) => d.password === d.ulangi, {
    message: 'Ulangi kata sandi belum sama',
    path: ['ulangi'],
  });

export async function daftar(_sebelumnya: HasilAkun, formData: FormData): Promise<HasilAkun> {
  const hasil = skemaDaftar.safeParse({
    nama: teks(formData, 'nama'),
    email: teks(formData, 'email'),
    telepon: teks(formData, 'telepon'),
    password: teks(formData, 'password'),
    ulangi: teks(formData, 'ulangi'),
  });

  if (!hasil.success) {
    return { ok: false, galat: 'Ada isian yang belum benar', galatField: kumpulkanGalat(hasil.error.issues) };
  }

  const lanjut = tujuanAman(teks(formData, 'lanjut'));

  try {
    const sesi = await apiPost<Sesi>('/pelanggan/daftar', {
      nama: hasil.data.nama,
      email: hasil.data.email,
      password: hasil.data.password,
      ...(hasil.data.telepon ? { telepon: hasil.data.telepon } : {}),
    });
    await simpanTokenPelanggan(sesi.accessToken);
  } catch (e) {
    return { ok: false, galat: pesanApi(e, 'Tidak bisa menghubungi server. Coba lagi.') };
  }

  redirect(lanjut);
}

const skemaMasuk = z.object({
  email: z.email({ message: 'Format email tidak valid' }),
  password: z.string().min(1, 'Kata sandi wajib diisi'),
});

export async function masukPelanggan(
  _sebelumnya: HasilAkun,
  formData: FormData,
): Promise<HasilAkun> {
  const hasil = skemaMasuk.safeParse({
    email: teks(formData, 'email'),
    password: teks(formData, 'password'),
  });

  if (!hasil.success) {
    return { ok: false, galatField: kumpulkanGalat(hasil.error.issues) };
  }

  const lanjut = tujuanAman(teks(formData, 'lanjut'));

  try {
    const sesi = await apiPost<Sesi>('/pelanggan/masuk', hasil.data);
    await simpanTokenPelanggan(sesi.accessToken);
  } catch (e) {
    return { ok: false, galat: pesanApi(e, 'Tidak bisa menghubungi server. Coba lagi.') };
  }

  redirect(lanjut);
}

export async function keluarPelanggan(): Promise<never> {
  await hapusTokenPelanggan();
  redirect('/');
}

// --- Profil ----------------------------------------------------------------

const skemaProfil = z.object({
  nama: z.string().trim().min(2, 'Nama minimal 2 karakter').max(120),
  telepon: z
    .string()
    .trim()
    .refine((v) => v === '' || TELEPON_ID.test(v), {
      message: 'Nomor WhatsApp tidak valid, contoh: 081234567890',
    }),
});

export async function simpanProfil(_sebelumnya: HasilAkun, formData: FormData): Promise<HasilAkun> {
  const token = await ambilTokenPelanggan();
  if (!token) return { ok: false, galat: 'Sesi habis. Silakan masuk kembali.' };

  const hasil = skemaProfil.safeParse({
    nama: teks(formData, 'nama'),
    telepon: teks(formData, 'telepon'),
  });
  if (!hasil.success) {
    return { ok: false, galatField: kumpulkanGalat(hasil.error.issues) };
  }

  try {
    await apiPatch('/pelanggan/saya', hasil.data, { token });
  } catch (e) {
    return { ok: false, galat: pesanApi(e, 'Gagal menyimpan profil') };
  }

  revalidatePath('/akun');
  return { ok: true, pesan: 'Profil tersimpan.' };
}

const skemaSandi = z
  .object({
    sandiLama: z.string().min(1, 'Kata sandi lama wajib diisi'),
    sandiBaru: z.string().min(8, 'Kata sandi baru minimal 8 karakter'),
    ulangi: z.string(),
  })
  .refine((d) => d.sandiBaru === d.ulangi, {
    message: 'Ulangi kata sandi belum sama',
    path: ['ulangi'],
  });

export async function gantiSandi(_sebelumnya: HasilAkun, formData: FormData): Promise<HasilAkun> {
  const token = await ambilTokenPelanggan();
  if (!token) return { ok: false, galat: 'Sesi habis. Silakan masuk kembali.' };

  const hasil = skemaSandi.safeParse({
    sandiLama: teks(formData, 'sandiLama'),
    sandiBaru: teks(formData, 'sandiBaru'),
    ulangi: teks(formData, 'ulangi'),
  });
  if (!hasil.success) {
    return { ok: false, galatField: kumpulkanGalat(hasil.error.issues) };
  }

  try {
    await apiPost(
      '/pelanggan/saya/sandi',
      { sandiLama: hasil.data.sandiLama, sandiBaru: hasil.data.sandiBaru },
      { token },
    );
  } catch (e) {
    return { ok: false, galat: pesanApi(e, 'Gagal mengganti kata sandi') };
  }

  return { ok: true, pesan: 'Kata sandi berhasil diganti.' };
}

// --- Buku alamat -----------------------------------------------------------

const skemaAlamat = z.object({
  label: z.string().trim().min(1, 'Beri nama alamat ini, mis. Rumah').max(40),
  namaPenerima: z.string().trim().min(2, 'Nama penerima minimal 2 karakter').max(120),
  teleponPenerima: z
    .string()
    .trim()
    .regex(TELEPON_ID, 'Nomor penerima tidak valid, contoh: 081234567890'),
  alamatLengkap: z.string().trim().min(10, 'Alamat terlalu pendek — tulis nama jalan dan nomor'),
  provinsi: z.string().trim().min(1, 'Provinsi wajib dipilih'),
  kota: z.string().trim().min(1, 'Kota/kabupaten wajib dipilih'),
  kecamatan: z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : v))
    .nullable(),
  kodePos: z.string().trim().regex(/^\d{5}$/, 'Kode pos harus 5 angka'),
  catatan: z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : v))
    .nullable(),
  utama: z.boolean(),
});

export async function simpanAlamat(_sebelumnya: HasilAkun, formData: FormData): Promise<HasilAkun> {
  const token = await ambilTokenPelanggan();
  if (!token) return { ok: false, galat: 'Sesi habis. Silakan masuk kembali.' };

  const id = teks(formData, 'id') || null;

  const hasil = skemaAlamat.safeParse({
    label: teks(formData, 'label'),
    namaPenerima: teks(formData, 'namaPenerima'),
    teleponPenerima: teks(formData, 'teleponPenerima'),
    alamatLengkap: teks(formData, 'alamatLengkap'),
    provinsi: teks(formData, 'provinsi'),
    kota: teks(formData, 'kota'),
    kecamatan: teks(formData, 'kecamatan'),
    kodePos: teks(formData, 'kodePos'),
    catatan: teks(formData, 'catatan'),
    utama: formData.get('utama') === 'on',
  });

  if (!hasil.success) {
    return { ok: false, galat: 'Ada isian yang belum benar', galatField: kumpulkanGalat(hasil.error.issues) };
  }

  try {
    if (id) await apiPatch(`/pelanggan/alamat/${id}`, hasil.data, { token });
    else await apiPost('/pelanggan/alamat', hasil.data, { token });
  } catch (e) {
    return { ok: false, galat: pesanApi(e, 'Gagal menyimpan alamat') };
  }

  revalidatePath('/akun');
  return { ok: true, pesan: 'Alamat tersimpan.' };
}

export async function hapusAlamat(id: string): Promise<{ ok: boolean; galat?: string }> {
  const token = await ambilTokenPelanggan();
  if (!token) return { ok: false, galat: 'Sesi habis. Silakan masuk kembali.' };

  try {
    await apiDelete(`/pelanggan/alamat/${id}`, { token });
  } catch (e) {
    return { ok: false, galat: pesanApi(e, 'Gagal menghapus alamat') };
  }

  revalidatePath('/akun');
  return { ok: true };
}

/** Dipakai checkout untuk mengisi form otomatis dari alamat tersimpan. */
export async function ambilAlamatSaya(): Promise<AlamatTersimpan[]> {
  const token = await ambilTokenPelanggan();
  if (!token) return [];

  try {
    return await apiGet<AlamatTersimpan[]>('/pelanggan/alamat', { token });
  } catch {
    return [];
  }
}

// --- Loyalty ---------------------------------------------------------------

export async function tukarPoinJadiVoucher(
  poin: number,
): Promise<{ ok: boolean; galat?: string; kode?: string; nilai?: number; sisaPoin?: number }> {
  const token = await ambilTokenPelanggan();
  if (!token) return { ok: false, galat: 'Sesi habis. Silakan masuk kembali.' };

  try {
    const hasil = await apiPost<{ kode: string; nilai: number; saldoPoin: number }>(
      '/pelanggan/loyalty/tukar-voucher',
      { poin },
      { token },
    );
    revalidatePath('/akun');
    return { ok: true, kode: hasil.kode, nilai: hasil.nilai, sisaPoin: hasil.saldoPoin };
  } catch (e) {
    return { ok: false, galat: pesanApi(e, 'Gagal menukar poin') };
  }
}
