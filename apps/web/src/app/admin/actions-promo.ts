'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { ApiError, apiDelete, apiPatch, apiPost } from '@/lib/api';
import { ambilToken } from '@/lib/sesi';

export interface HasilForm {
  ok: boolean;
  galat?: string;
  galatField?: Record<string, string>;
}

// --- Pembantu bersama ------------------------------------------------------

function teks(formData: FormData, nama: string): string {
  return String(formData.get(nama) ?? '');
}

/** `datetime-local` mengirim "2026-08-20T09:00" — API mengharapkan ISO-8601. */
function keIso(nilai: string | null): string | null {
  if (!nilai) return null;
  const tgl = new Date(nilai);
  return Number.isNaN(tgl.getTime()) ? null : tgl.toISOString();
}

const teksOpsional = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullable();

/** Angka opsional: string kosong berarti "tidak dibatasi", bukan 0. */
const angkaOpsional = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : Number(v)))
  .refine((v) => v === null || (Number.isFinite(v) && v >= 0), 'Harus berupa angka positif')
  .transform((v) => (v === null ? null : Math.round(v)));

const angkaWajib = (pesan: string) =>
  z
    .string()
    .trim()
    .transform((v) => Number(v))
    .refine((v) => Number.isFinite(v), pesan)
    .transform((v) => Math.round(v));

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

/**
 * Kategori, label, dan voucher semuanya ikut menentukan apa yang tampil di
 * etalase, jadi setiap perubahan menyegarkan halaman publik juga — bukan hanya
 * halaman admin tempat perubahan dibuat.
 */
function segarkanEtalase() {
  revalidatePath('/');
  revalidatePath('/produk');
  revalidatePath('/kategori');
}

// --- Kategori --------------------------------------------------------------

const skemaKategori = z.object({
  nama: z.string().trim().min(2, 'Nama kategori minimal 2 karakter').max(120),
  slug: z
    .string()
    .trim()
    .transform((v) => (v === '' ? undefined : v))
    .optional(),
  deskripsi: teksOpsional,
  parentId: z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : v))
    .nullable(),
  urutan: z
    .string()
    .trim()
    .transform((v) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
    }),
  aktif: z.boolean(),
});

export async function simpanKategori(_sebelumnya: HasilForm, formData: FormData): Promise<HasilForm> {
  const token = await ambilToken();
  if (!token) return { ok: false, galat: 'Sesi habis. Silakan masuk kembali.' };

  const id = teks(formData, 'id') || null;

  const hasil = skemaKategori.safeParse({
    nama: teks(formData, 'nama'),
    slug: teks(formData, 'slug'),
    deskripsi: teks(formData, 'deskripsi'),
    parentId: teks(formData, 'parentId'),
    urutan: teks(formData, 'urutan') || '0',
    aktif: formData.get('aktif') === 'on',
  });

  if (!hasil.success) {
    return {
      ok: false,
      galat: 'Ada isian yang belum benar',
      galatField: kumpulkanGalat(hasil.error.issues),
    };
  }

  try {
    if (id) await apiPatch(`/admin/kategori/${id}`, hasil.data, { token });
    else await apiPost('/admin/kategori', hasil.data, { token });
  } catch (e) {
    return { ok: false, galat: pesanApi(e, 'Gagal menyimpan kategori. Coba lagi.') };
  }

  revalidatePath('/admin/kategori');
  segarkanEtalase();
  redirect('/admin/kategori?pesan=tersimpan');
}

export async function hapusKategori(id: string): Promise<{ ok: boolean; galat?: string }> {
  const token = await ambilToken();
  if (!token) return { ok: false, galat: 'Sesi habis. Silakan masuk kembali.' };

  try {
    await apiDelete(`/admin/kategori/${id}`, { token });
  } catch (e) {
    return { ok: false, galat: pesanApi(e, 'Gagal menghapus kategori') };
  }

  revalidatePath('/admin/kategori');
  segarkanEtalase();
  return { ok: true };
}

// --- Merek -----------------------------------------------------------------

const skemaMerek = z.object({
  nama: z.string().trim().min(2, 'Nama merek minimal 2 karakter').max(100),
  slug: z
    .string()
    .trim()
    .transform((v) => (v === '' ? undefined : v))
    .optional(),
  deskripsi: teksOpsional,
  logoUrl: teksOpsional,
  urutan: z
    .string()
    .trim()
    .transform((v) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
    }),
  aktif: z.boolean(),
});

export async function simpanMerek(_sebelumnya: HasilForm, formData: FormData): Promise<HasilForm> {
  const token = await ambilToken();
  if (!token) return { ok: false, galat: 'Sesi habis. Silakan masuk kembali.' };

  const id = teks(formData, 'id') || null;

  const hasil = skemaMerek.safeParse({
    nama: teks(formData, 'nama'),
    slug: teks(formData, 'slug'),
    deskripsi: teks(formData, 'deskripsi'),
    logoUrl: teks(formData, 'logoUrl'),
    urutan: teks(formData, 'urutan') || '0',
    aktif: formData.get('aktif') === 'on',
  });

  if (!hasil.success) {
    return {
      ok: false,
      galat: 'Ada isian yang belum benar',
      galatField: kumpulkanGalat(hasil.error.issues),
    };
  }

  try {
    if (id) await apiPatch(`/admin/merek/${id}`, hasil.data, { token });
    else await apiPost('/admin/merek', hasil.data, { token });
  } catch (e) {
    return { ok: false, galat: pesanApi(e, 'Gagal menyimpan merek. Coba lagi.') };
  }

  revalidatePath('/admin/merek');
  revalidatePath('/admin/produk');
  segarkanEtalase();
  redirect('/admin/merek?pesan=tersimpan');
}

export async function hapusMerek(id: string): Promise<{ ok: boolean; galat?: string }> {
  const token = await ambilToken();
  if (!token) return { ok: false, galat: 'Sesi habis. Silakan masuk kembali.' };

  try {
    await apiDelete(`/admin/merek/${id}`, { token });
  } catch (e) {
    return { ok: false, galat: pesanApi(e, 'Gagal menghapus merek') };
  }

  revalidatePath('/admin/merek');
  segarkanEtalase();
  return { ok: true };
}

// --- Label promosi ---------------------------------------------------------

const skemaLabel = z
  .object({
    nama: z.string().trim().min(2, 'Nama label minimal 2 karakter').max(40),
    slug: z
      .string()
      .trim()
      .transform((v) => (v === '' ? undefined : v))
      .optional(),
    warna: z
      .string()
      .trim()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Warna harus kode heks 6 digit, mis. #c96442'),
    urutan: z
      .string()
      .trim()
      .transform((v) => {
        const n = Number(v);
        return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
      }),
    aktif: z.boolean(),
    mulai: teksOpsional,
    selesai: teksOpsional,
  })
  .refine((d) => !(d.mulai && d.selesai) || new Date(d.mulai) < new Date(d.selesai), {
    message: 'Waktu selesai harus setelah waktu mulai',
    path: ['selesai'],
  });

export async function simpanLabel(_sebelumnya: HasilForm, formData: FormData): Promise<HasilForm> {
  const token = await ambilToken();
  if (!token) return { ok: false, galat: 'Sesi habis. Silakan masuk kembali.' };

  const id = teks(formData, 'id') || null;

  const hasil = skemaLabel.safeParse({
    nama: teks(formData, 'nama'),
    slug: teks(formData, 'slug'),
    warna: teks(formData, 'warna') || '#c96442',
    urutan: teks(formData, 'urutan') || '0',
    aktif: formData.get('aktif') === 'on',
    mulai: teks(formData, 'mulai'),
    selesai: teks(formData, 'selesai'),
  });

  if (!hasil.success) {
    return {
      ok: false,
      galat: 'Ada isian yang belum benar',
      galatField: kumpulkanGalat(hasil.error.issues),
    };
  }

  const muatan = {
    ...hasil.data,
    mulai: keIso(hasil.data.mulai),
    selesai: keIso(hasil.data.selesai),
  };

  try {
    if (id) await apiPatch(`/admin/label/${id}`, muatan, { token });
    else await apiPost('/admin/label', muatan, { token });
  } catch (e) {
    return { ok: false, galat: pesanApi(e, 'Gagal menyimpan label. Coba lagi.') };
  }

  revalidatePath('/admin/label');
  revalidatePath('/admin/produk');
  segarkanEtalase();
  redirect('/admin/label?pesan=tersimpan');
}

export async function hapusLabel(id: string): Promise<{ ok: boolean; galat?: string }> {
  const token = await ambilToken();
  if (!token) return { ok: false, galat: 'Sesi habis. Silakan masuk kembali.' };

  try {
    await apiDelete(`/admin/label/${id}`, { token });
  } catch (e) {
    return { ok: false, galat: pesanApi(e, 'Gagal menghapus label') };
  }

  revalidatePath('/admin/label');
  segarkanEtalase();
  return { ok: true };
}

// --- Voucher ---------------------------------------------------------------

const skemaVoucher = z
  .object({
    kode: z
      .string()
      .trim()
      .min(3, 'Kode voucher minimal 3 karakter')
      .max(32)
      .regex(/^[A-Za-z0-9_-]+$/, 'Kode hanya boleh huruf, angka, tanda hubung, dan garis bawah'),
    deskripsi: teksOpsional,
    tipe: z.enum(['PERSEN', 'NOMINAL']),
    nilai: angkaWajib('Nilai potongan wajib diisi').refine((v) => v >= 1, 'Nilai minimal 1'),
    maksPotongan: angkaOpsional,
    minBelanja: z
      .string()
      .trim()
      .transform((v) => {
        const n = Number(v);
        return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
      }),
    kuota: angkaOpsional,
    mulai: teksOpsional,
    selesai: teksOpsional,
    aktif: z.boolean(),
    produkIds: z.array(z.string()),
    kategoriIds: z.array(z.string()),
  })
  .refine((d) => d.tipe !== 'PERSEN' || d.nilai <= 100, {
    message: 'Diskon persen tidak boleh lebih dari 100%',
    path: ['nilai'],
  })
  .refine((d) => !(d.mulai && d.selesai) || new Date(d.mulai) < new Date(d.selesai), {
    message: 'Tanggal selesai harus setelah tanggal mulai',
    path: ['selesai'],
  })
  .refine((d) => d.kuota === null || d.kuota >= 1, {
    message: 'Kuota minimal 1',
    path: ['kuota'],
  });

export async function simpanVoucher(_sebelumnya: HasilForm, formData: FormData): Promise<HasilForm> {
  const token = await ambilToken();
  if (!token) return { ok: false, galat: 'Sesi habis. Silakan masuk kembali.' };

  const id = teks(formData, 'id') || null;

  const hasil = skemaVoucher.safeParse({
    kode: teks(formData, 'kode'),
    deskripsi: teks(formData, 'deskripsi'),
    tipe: teks(formData, 'tipe') || 'PERSEN',
    nilai: teks(formData, 'nilai'),
    maksPotongan: teks(formData, 'maksPotongan'),
    minBelanja: teks(formData, 'minBelanja') || '0',
    kuota: teks(formData, 'kuota'),
    mulai: teks(formData, 'mulai'),
    selesai: teks(formData, 'selesai'),
    aktif: formData.get('aktif') === 'on',
    produkIds: formData.getAll('produkIds').map(String).filter(Boolean),
    kategoriIds: formData.getAll('kategoriIds').map(String).filter(Boolean),
  });

  if (!hasil.success) {
    return {
      ok: false,
      galat: 'Ada isian yang belum benar',
      galatField: kumpulkanGalat(hasil.error.issues),
    };
  }

  // maksPotongan hanya bermakna untuk diskon persen — mengirimnya pada voucher
  // nominal cuma jadi angka menyesatkan di daftar voucher.
  const muatan = {
    ...hasil.data,
    maksPotongan: hasil.data.tipe === 'PERSEN' ? hasil.data.maksPotongan : null,
    mulai: keIso(hasil.data.mulai),
    selesai: keIso(hasil.data.selesai),
  };

  try {
    if (id) await apiPatch(`/admin/voucher/${id}`, muatan, { token });
    else await apiPost('/admin/voucher', muatan, { token });
  } catch (e) {
    return { ok: false, galat: pesanApi(e, 'Gagal menyimpan voucher. Coba lagi.') };
  }

  revalidatePath('/admin/voucher');
  redirect('/admin/voucher?pesan=tersimpan');
}

export async function hapusVoucher(id: string): Promise<{ ok: boolean; galat?: string }> {
  const token = await ambilToken();
  if (!token) return { ok: false, galat: 'Sesi habis. Silakan masuk kembali.' };

  try {
    await apiDelete(`/admin/voucher/${id}`, { token });
  } catch (e) {
    return { ok: false, galat: pesanApi(e, 'Gagal menghapus voucher') };
  }

  revalidatePath('/admin/voucher');
  return { ok: true };
}

/** Menyalakan/mematikan voucher langsung dari daftar, tanpa membuka form. */
export async function ubahAktifVoucher(
  id: string,
  aktif: boolean,
): Promise<{ ok: boolean; galat?: string }> {
  const token = await ambilToken();
  if (!token) return { ok: false, galat: 'Sesi habis. Silakan masuk kembali.' };

  try {
    await apiPatch(`/admin/voucher/${id}`, { aktif }, { token });
  } catch (e) {
    return { ok: false, galat: pesanApi(e, 'Gagal mengubah status voucher') };
  }

  revalidatePath('/admin/voucher');
  return { ok: true };
}

/** Sakelar aktif untuk label — lencana promo bisa dimatikan cepat saat stok habis. */
export async function ubahAktifLabel(
  id: string,
  aktif: boolean,
): Promise<{ ok: boolean; galat?: string }> {
  const token = await ambilToken();
  if (!token) return { ok: false, galat: 'Sesi habis. Silakan masuk kembali.' };

  try {
    await apiPatch(`/admin/label/${id}`, { aktif }, { token });
  } catch (e) {
    return { ok: false, galat: pesanApi(e, 'Gagal mengubah status label') };
  }

  revalidatePath('/admin/label');
  segarkanEtalase();
  return { ok: true };
}
