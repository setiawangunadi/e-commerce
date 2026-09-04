'use server';

import { revalidatePath } from 'next/cache';
import { ApiError, apiPost } from '@/lib/api';

export interface HasilSnap {
  ok: boolean;
  snapToken?: string;
  clientKey?: string;
  redirectUrl?: string;
  galat?: string;
}

/**
 * Meminta token Snap ke API.
 *
 * Server key Midtrans tidak pernah menyentuh browser — API yang memanggil
 * Midtrans, lalu hanya token sekali pakai dan client key yang dikembalikan.
 */
export async function siapkanPembayaran(nomor: string, token: string): Promise<HasilSnap> {
  try {
    const hasil = await apiPost<{ snapToken: string; redirectUrl: string; clientKey: string }>(
      `/pesanan/${encodeURIComponent(nomor)}/bayar`,
      { token },
    );
    return {
      ok: true,
      snapToken: hasil.snapToken,
      clientKey: hasil.clientKey,
      redirectUrl: hasil.redirectUrl,
    };
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, galat: e.message };
    return { ok: false, galat: 'Gagal menyiapkan pembayaran. Coba lagi.' };
  }
}

/** Dipanggil setelah popup Snap ditutup agar status terbaru ikut termuat. */
export async function segarkanPesanan(nomor: string): Promise<void> {
  revalidatePath(`/pesanan/${nomor}`);
}
