'use server';

import { revalidatePath } from 'next/cache';
import { ApiError, apiPatch, apiPost } from '@/lib/api';
import { ambilToken } from '@/lib/sesi';
import type { PesananAdmin, StatusPesanan } from '@/lib/types';

export interface HasilPesanan {
  ok: boolean;
  galat?: string;
}

function segarkan(id: string): void {
  revalidatePath('/admin/pesanan');
  revalidatePath(`/admin/pesanan/${id}`);
  revalidatePath('/admin');
}

export async function ubahStatusPesanan(
  id: string,
  status: StatusPesanan,
  nomorResi?: string,
): Promise<HasilPesanan> {
  const token = await ambilToken();
  if (!token) return { ok: false, galat: 'Sesi habis. Silakan masuk kembali.' };

  try {
    await apiPatch<PesananAdmin>(
      `/admin/pesanan/${id}/status`,
      { status, nomorResi: nomorResi?.trim() || null },
      { token },
    );
  } catch (e) {
    if (e instanceof ApiError) {
      const rincian = Array.isArray(e.details) ? ` (${e.details.join(', ')})` : '';
      return { ok: false, galat: `${e.message}${rincian}` };
    }
    return { ok: false, galat: 'Gagal mengubah status pesanan' };
  }

  segarkan(id);
  return { ok: true };
}

export async function ubahResiPesanan(id: string, nomorResi: string): Promise<HasilPesanan> {
  const token = await ambilToken();
  if (!token) return { ok: false, galat: 'Sesi habis. Silakan masuk kembali.' };

  try {
    await apiPatch<PesananAdmin>(`/admin/pesanan/${id}/resi`, { nomorResi }, { token });
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, galat: e.message };
    return { ok: false, galat: 'Gagal memperbarui nomor resi' };
  }

  segarkan(id);
  return { ok: true };
}

/**
 * Menanyakan status pembayaran langsung ke Midtrans.
 *
 * Dipakai saat webhook tidak sampai — mis. Notification URL belum dipasang,
 * atau server sempat mati waktu Midtrans mengirim notifikasi.
 */
export async function sinkronPesanan(
  id: string,
): Promise<HasilPesanan & { diperbarui?: boolean; statusMidtrans?: string }> {
  const token = await ambilToken();
  if (!token) return { ok: false, galat: 'Sesi habis. Silakan masuk kembali.' };

  try {
    const hasil = await apiPost<{ diperbarui: boolean; status: string }>(
      `/admin/pesanan/${id}/sinkron`,
      {},
      { token },
    );
    segarkan(id);
    return { ok: true, diperbarui: hasil.diperbarui, statusMidtrans: hasil.status };
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, galat: e.message };
    return { ok: false, galat: 'Gagal menghubungi Midtrans' };
  }
}
