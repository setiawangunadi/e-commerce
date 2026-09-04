'use server';

import { revalidatePath } from 'next/cache';
import { ApiError, apiPatch, apiPost } from '@/lib/api';
import { ambilToken } from '@/lib/sesi';

export interface HasilPelanggan {
  ok: boolean;
  galat?: string;
  pesan?: string;
}

function pesanApi(e: unknown, bawaan: string): string {
  if (e instanceof ApiError) {
    const rincian = Array.isArray(e.details) ? ` (${e.details.join(', ')})` : '';
    return `${e.message}${rincian}`;
  }
  return bawaan;
}

/**
 * Menonaktifkan atau mengaktifkan kembali akun pelanggan.
 *
 * Akun yang dinonaktifkan tidak bisa masuk, tapi datanya tetap ada — riwayat
 * pesanannya masih dibutuhkan untuk pembukuan.
 */
export async function ubahAktifPelanggan(
  id: string,
  aktif: boolean,
): Promise<HasilPelanggan> {
  const token = await ambilToken();
  if (!token) return { ok: false, galat: 'Sesi habis. Silakan masuk kembali.' };

  try {
    await apiPatch(`/admin/pelanggan/${id}`, { aktif }, { token });
  } catch (e) {
    return { ok: false, galat: pesanApi(e, 'Gagal mengubah status pelanggan') };
  }

  revalidatePath('/admin/pelanggan');
  revalidatePath(`/admin/pelanggan/${id}`);
  return { ok: true };
}

/**
 * Penyesuaian poin manual. Alasannya wajib dan ikut tersimpan di buku besar
 * bersama email admin yang melakukannya — mutasi ini setara memberi uang.
 */
export async function sesuaikanPoin(
  id: string,
  jumlah: number,
  alasan: string,
): Promise<HasilPelanggan> {
  const token = await ambilToken();
  if (!token) return { ok: false, galat: 'Sesi habis. Silakan masuk kembali.' };

  if (!Number.isFinite(jumlah) || jumlah === 0) {
    return { ok: false, galat: 'Jumlah penyesuaian tidak boleh nol' };
  }
  if (alasan.trim().length < 5) {
    return { ok: false, galat: 'Alasan minimal 5 karakter' };
  }

  try {
    await apiPost(
      `/admin/pelanggan/${id}/poin`,
      { jumlah: Math.round(jumlah), alasan: alasan.trim() },
      { token },
    );
  } catch (e) {
    return { ok: false, galat: pesanApi(e, 'Gagal menyesuaikan poin') };
  }

  revalidatePath(`/admin/pelanggan/${id}`);
  revalidatePath('/admin/pelanggan');
  return { ok: true, pesan: 'Poin berhasil disesuaikan.' };
}
