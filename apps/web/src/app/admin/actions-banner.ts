'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { ApiError, apiDelete, apiPatch, apiPost } from '@/lib/api';
import { ambilToken } from '@/lib/sesi';
import type { BannerAdmin } from '@/lib/types';

export interface HasilBanner {
  ok: boolean;
  galat?: string;
  galatField?: Record<string, string>;
}

const teksOpsional = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullable();

/**
 * Tautan tombol banner dibatasi ke path internal saja.
 * Banner adalah konten yang tampil paling menonjol di home — membiarkannya
 * menerima URL eksternal sembarang membuka jalan phishing bila akun admin dibajak.
 */
const tautanInternal = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .refine((v) => v === null || (v.startsWith('/') && !v.startsWith('//')), {
    message: 'Tautan harus berupa path internal, contoh: /produk?kategori=aksesoris',
  });

const skemaBanner = z
  .object({
    judul: z.string().trim().min(3, 'Judul banner minimal 3 karakter').max(120),
    subjudul: teksOpsional,
    gambarUrl: z.string().trim().min(1, 'Gambar banner wajib diunggah'),
    gambarMobileUrl: teksOpsional,
    teksTombol: teksOpsional,
    tautanTombol: tautanInternal,
    urutan: z
      .union([z.string(), z.number()])
      .transform((v) => {
        const n = Number(v);
        return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
      }),
    aktif: z.boolean(),
    mulaiTayang: teksOpsional,
    selesaiTayang: teksOpsional,
  })
  .refine((d) => !(d.teksTombol && !d.tautanTombol), {
    message: 'Tautan tombol wajib diisi bila teks tombol diisi',
    path: ['tautanTombol'],
  })
  .refine((d) => !(d.tautanTombol && !d.teksTombol), {
    message: 'Teks tombol wajib diisi bila tautan diisi',
    path: ['teksTombol'],
  });

function teks(formData: FormData, nama: string): string {
  return String(formData.get(nama) ?? '');
}

/** `datetime-local` mengirim "2026-08-20T09:00" — API mengharapkan ISO-8601. */
function keIso(nilai: string | null): string | null {
  if (!nilai) return null;
  const tgl = new Date(nilai);
  return Number.isNaN(tgl.getTime()) ? null : tgl.toISOString();
}

export async function simpanBanner(
  _sebelumnya: HasilBanner,
  formData: FormData,
): Promise<HasilBanner> {
  const token = await ambilToken();
  if (!token) return { ok: false, galat: 'Sesi habis. Silakan masuk kembali.' };

  const id = teks(formData, 'id') || null;

  const hasil = skemaBanner.safeParse({
    judul: teks(formData, 'judul'),
    subjudul: teks(formData, 'subjudul'),
    gambarUrl: teks(formData, 'gambarUrl'),
    gambarMobileUrl: teks(formData, 'gambarMobileUrl'),
    teksTombol: teks(formData, 'teksTombol'),
    tautanTombol: teks(formData, 'tautanTombol'),
    urutan: teks(formData, 'urutan') || '0',
    aktif: formData.get('aktif') === 'on',
    mulaiTayang: teks(formData, 'mulaiTayang'),
    selesaiTayang: teks(formData, 'selesaiTayang'),
  });

  if (!hasil.success) {
    const galatField: Record<string, string> = {};
    for (const isu of hasil.error.issues) {
      const field = isu.path.join('.') || 'form';
      if (!galatField[field]) galatField[field] = isu.message;
    }
    return { ok: false, galat: 'Ada isian yang belum benar', galatField };
  }

  const muatan = {
    ...hasil.data,
    mulaiTayang: keIso(hasil.data.mulaiTayang),
    selesaiTayang: keIso(hasil.data.selesaiTayang),
  };

  try {
    if (id) {
      await apiPatch<BannerAdmin>(`/admin/banner/${id}`, muatan, { token });
    } else {
      await apiPost<BannerAdmin>('/admin/banner', muatan, { token });
    }
  } catch (e) {
    if (e instanceof ApiError) {
      const rincian = Array.isArray(e.details) ? ` (${e.details.join(', ')})` : '';
      return { ok: false, galat: `${e.message}${rincian}` };
    }
    return { ok: false, galat: 'Gagal menyimpan banner. Coba lagi.' };
  }

  revalidatePath('/admin/banner');
  revalidatePath('/'); // slider di home ikut diperbarui
  redirect('/admin/banner?pesan=tersimpan');
}

export async function hapusBanner(id: string): Promise<{ ok: boolean; galat?: string }> {
  const token = await ambilToken();
  if (!token) return { ok: false, galat: 'Sesi habis. Silakan masuk kembali.' };

  try {
    await apiDelete(`/admin/banner/${id}`, { token });
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, galat: e.message };
    return { ok: false, galat: 'Gagal menghapus banner' };
  }

  revalidatePath('/admin/banner');
  revalidatePath('/');
  return { ok: true };
}

/** Mengaktifkan/menonaktifkan banner langsung dari daftar, tanpa buka form. */
export async function ubahAktifBanner(
  id: string,
  aktif: boolean,
): Promise<{ ok: boolean; galat?: string }> {
  const token = await ambilToken();
  if (!token) return { ok: false, galat: 'Sesi habis. Silakan masuk kembali.' };

  try {
    await apiPatch<BannerAdmin>(`/admin/banner/${id}`, { aktif }, { token });
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, galat: e.message };
    return { ok: false, galat: 'Gagal mengubah status banner' };
  }

  revalidatePath('/admin/banner');
  revalidatePath('/');
  return { ok: true };
}
