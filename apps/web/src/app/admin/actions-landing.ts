'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { ApiError, apiDelete, apiPatch, apiPost } from '@/lib/api';
import { ambilToken } from '@/lib/sesi';
import type { BlokAdmin, LandingAdmin } from '@/lib/types';

export interface HasilLanding {
  ok: boolean;
  galat?: string;
}

/** Muatan yang dikirim editor: pengaturan halaman + seluruh blok sekaligus. */
export interface MuatanLanding {
  nama: string;
  slug?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  judulMeta: string | null;
  deskripsiMeta: string | null;
  gambarOg: string | null;
  metaPixelId: string | null;
  ga4Id: string | null;
  googleAdsId: string | null;
  googleAdsLabel: string | null;
  gtmId: string | null;
  warnaAksen: string;
  mulaiTayang: string | null;
  selesaiTayang: string | null;
  blok: { tipe: BlokAdmin['tipe']; aktif: boolean; konten: Record<string, unknown> }[];
}

/**
 * `updateTag`, bukan `revalidateTag`: admin yang baru menekan Simpan lalu
 * membuka "Lihat halaman" harus melihat perubahannya saat itu juga, bukan
 * versi lama yang menyegar di belakang layar.
 */
function segarkan(slug?: string): void {
  revalidatePath('/admin/landing');
  updateTag('landing');
  if (slug) updateTag(`landing-${slug}`);
}

export async function simpanLanding(
  id: string | null,
  muatan: MuatanLanding,
): Promise<HasilLanding & { id?: string; slug?: string }> {
  const token = await ambilToken();
  if (!token) return { ok: false, galat: 'Sesi habis. Silakan masuk kembali.' };

  try {
    const hasil = id
      ? await apiPatch<LandingAdmin>(`/admin/landing/${id}`, muatan, { token })
      : await apiPost<LandingAdmin>('/admin/landing', muatan, { token });

    segarkan(hasil.slug);
    return { ok: true, id: hasil.id, slug: hasil.slug };
  } catch (e) {
    if (e instanceof ApiError) {
      const rincian = Array.isArray(e.details) ? ` (${e.details.join(', ')})` : '';
      return { ok: false, galat: `${e.message}${rincian}` };
    }
    return { ok: false, galat: 'Gagal menyimpan landing page. Coba lagi.' };
  }
}

/** Dipakai tombol simpan di form baru — perlu redirect setelah berhasil. */
export async function simpanLandingBaru(muatan: MuatanLanding): Promise<HasilLanding> {
  const hasil = await simpanLanding(null, muatan);
  if (!hasil.ok) return hasil;
  redirect(`/admin/landing/${hasil.id}?pesan=tersimpan`);
}

export async function hapusLanding(id: string): Promise<HasilLanding> {
  const token = await ambilToken();
  if (!token) return { ok: false, galat: 'Sesi habis. Silakan masuk kembali.' };

  try {
    await apiDelete(`/admin/landing/${id}`, { token });
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, galat: e.message };
    return { ok: false, galat: 'Gagal menghapus landing page' };
  }

  segarkan();
  return { ok: true };
}

export async function ubahStatusLanding(
  id: string,
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
): Promise<HasilLanding> {
  const token = await ambilToken();
  if (!token) return { ok: false, galat: 'Sesi habis. Silakan masuk kembali.' };

  try {
    const hasil = await apiPatch<LandingAdmin>(`/admin/landing/${id}`, { status }, { token });
    segarkan(hasil.slug);
    return { ok: true };
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, galat: e.message };
    return { ok: false, galat: 'Gagal mengubah status' };
  }
}
