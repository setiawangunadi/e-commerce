'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { ApiError, apiDelete, apiPatch, apiPost, apiUpload } from '@/lib/api';
import { ambilToken } from '@/lib/sesi';
import type { ProdukAdmin } from '@/lib/types';

/** Angka opsional dari input form: "" dianggap kosong, bukan 0. */
const angkaOpsional = z
  .union([z.string(), z.number(), z.null()])
  .transform((v) => {
    if (v === null || v === '' || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n) : null;
  })
  .nullable();

const angkaWajib = (pesan: string, min = 0) =>
  z.union([z.string(), z.number()]).transform((v, ctx) => {
    const n = Number(v);
    if (!Number.isFinite(n) || String(v).trim() === '') {
      ctx.addIssue({ code: 'custom', message: pesan });
      return z.NEVER;
    }
    if (n < min) {
      ctx.addIssue({ code: 'custom', message: pesan });
      return z.NEVER;
    }
    return Math.round(n);
  });

/** URL marketplace opsional: string kosong dianggap "tidak diisi". */
const tautanMarketplace = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .refine((v) => v === null || /^https?:\/\//i.test(v), {
    message: 'Tautan harus diawali http:// atau https://',
  });

const skemaGambar = z.object({
  url: z.string().min(1),
  alt: z.string().nullable().default(null),
});

const skemaVarian = z.object({
  nama: z.string().min(1, 'Nama varian wajib diisi'),
  sku: z.string().min(1, 'SKU varian wajib diisi'),
  harga: angkaOpsional,
  stok: angkaWajib('Stok varian tidak boleh negatif'),
  aktif: z.boolean().default(true),
  gambar: z.array(skemaGambar).max(10, 'Maksimal 10 gambar per varian').default([]),
});

const skemaProduk = z.object({
  nama: z.string().min(3, 'Nama produk minimal 3 karakter').max(200),
  sku: z.string().min(1, 'SKU wajib diisi').max(64),
  slug: z.string().max(200).optional(),
  brandId: z.string().nullable(),
  categoryId: z.string().nullable(),
  deskripsiSingkat: z.string().max(300).nullable(),
  deskripsi: z.string().nullable(),
  harga: angkaWajib('Harga wajib diisi dan tidak boleh negatif'),
  hargaCoret: angkaOpsional,
  hpp: angkaOpsional,
  berat: angkaWajib('Berat wajib diisi, minimal 1 gram', 1),
  panjang: angkaOpsional,
  lebar: angkaOpsional,
  tinggi: angkaOpsional,
  stok: angkaWajib('Stok tidak boleh negatif'),
  stokMinimum: angkaWajib('Stok minimum tidak boleh negatif'),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  unggulan: z.boolean(),
  kenaPpn: z.boolean(),
  metaTitle: z.string().max(120).nullable(),
  metaDescription: z.string().max(320).nullable(),
  // Validasi host-nya dilakukan API — di sini cukup dipastikan berupa URL
  // http/https, bukan skema lain seperti `javascript:`.
  linkShopee: tautanMarketplace,
  linkTiktok: tautanMarketplace,
  gambar: z.array(skemaGambar).max(10),
  varian: z.array(skemaVarian).max(50),
  labelIds: z.array(z.string()).max(10),
});

export interface HasilSimpan {
  ok: boolean;
  galat?: string;
  galatField?: Record<string, string>;
}

function teksAtauNull(formData: FormData, nama: string): string | null {
  const nilai = formData.get(nama);
  if (nilai === null) return null;
  const teks = String(nilai).trim();
  return teks === '' ? null : teks;
}

function jsonAtauKosong<T>(formData: FormData, nama: string): T[] {
  const mentah = formData.get(nama);
  if (!mentah) return [];
  try {
    const hasil = JSON.parse(String(mentah));
    return Array.isArray(hasil) ? (hasil as T[]) : [];
  } catch {
    return [];
  }
}

/**
 * Menyimpan produk baru atau memperbarui yang sudah ada.
 * Dipanggil dari form admin lewat `useActionState`.
 */
export async function simpanProduk(
  _sebelumnya: HasilSimpan,
  formData: FormData,
): Promise<HasilSimpan> {
  const token = await ambilToken();
  if (!token) return { ok: false, galat: 'Sesi habis. Silakan masuk kembali.' };

  const id = teksAtauNull(formData, 'id');

  const hasil = skemaProduk.safeParse({
    nama: String(formData.get('nama') ?? ''),
    sku: String(formData.get('sku') ?? ''),
    slug: teksAtauNull(formData, 'slug') ?? undefined,
    brandId: teksAtauNull(formData, 'brandId'),
    categoryId: teksAtauNull(formData, 'categoryId'),
    deskripsiSingkat: teksAtauNull(formData, 'deskripsiSingkat'),
    deskripsi: teksAtauNull(formData, 'deskripsi'),
    harga: String(formData.get('harga') ?? ''),
    hargaCoret: teksAtauNull(formData, 'hargaCoret'),
    hpp: teksAtauNull(formData, 'hpp'),
    berat: String(formData.get('berat') ?? ''),
    panjang: teksAtauNull(formData, 'panjang'),
    lebar: teksAtauNull(formData, 'lebar'),
    tinggi: teksAtauNull(formData, 'tinggi'),
    stok: String(formData.get('stok') ?? '0'),
    stokMinimum: String(formData.get('stokMinimum') ?? '5'),
    status: String(formData.get('status') ?? 'DRAFT'),
    unggulan: formData.get('unggulan') === 'on',
    kenaPpn: formData.get('kenaPpn') === 'on',
    metaTitle: teksAtauNull(formData, 'metaTitle'),
    metaDescription: teksAtauNull(formData, 'metaDescription'),
    linkShopee: String(formData.get('linkShopee') ?? ''),
    linkTiktok: String(formData.get('linkTiktok') ?? ''),
    gambar: jsonAtauKosong(formData, 'gambar'),
    varian: jsonAtauKosong(formData, 'varian'),
    labelIds: formData.getAll('labelIds').map(String).filter(Boolean),
  });

  if (!hasil.success) {
    const galatField: Record<string, string> = {};
    for (const isu of hasil.error.issues) {
      const field = isu.path.join('.');
      if (!galatField[field]) galatField[field] = isu.message;
    }
    return { ok: false, galat: 'Ada isian yang belum benar', galatField };
  }

  const muatan = hasil.data;

  try {
    if (id) {
      await apiPatch<ProdukAdmin>(`/admin/produk/${id}`, muatan, { token });
    } else {
      await apiPost<ProdukAdmin>('/admin/produk', muatan, { token });
    }
  } catch (e) {
    if (e instanceof ApiError) {
      const rincian = Array.isArray(e.details) ? ` (${e.details.join(', ')})` : '';
      return { ok: false, galat: `${e.message}${rincian}` };
    }
    return { ok: false, galat: 'Gagal menyimpan produk. Coba lagi.' };
  }

  revalidatePath('/admin/produk');
  revalidatePath('/admin');
  revalidatePath('/'); // katalog publik ikut diperbarui
  redirect('/admin/produk?pesan=tersimpan');
}

export async function hapusProduk(id: string): Promise<{ ok: boolean; galat?: string }> {
  const token = await ambilToken();
  if (!token) return { ok: false, galat: 'Sesi habis. Silakan masuk kembali.' };

  try {
    await apiDelete(`/admin/produk/${id}`, { token });
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, galat: e.message };
    return { ok: false, galat: 'Gagal menghapus produk' };
  }

  revalidatePath('/admin/produk');
  revalidatePath('/admin');
  revalidatePath('/');
  return { ok: true };
}

/**
 * Unggah gambar produk. Token tidak pernah menyentuh browser — Server Action
 * ini yang membacanya dari cookie httpOnly lalu meneruskan ke API.
 */
export async function unggahGambar(
  formData: FormData,
): Promise<{ ok: boolean; url?: string; galat?: string }> {
  const token = await ambilToken();
  if (!token) return { ok: false, galat: 'Sesi habis. Silakan masuk kembali.' };

  const berkas = formData.get('file');
  if (!(berkas instanceof File) || berkas.size === 0) {
    return { ok: false, galat: 'Tidak ada berkas yang dipilih' };
  }

  try {
    const { url } = await apiUpload(berkas, token);
    return { ok: true, url };
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, galat: e.message };
    return { ok: false, galat: 'Gagal mengunggah gambar' };
  }
}
