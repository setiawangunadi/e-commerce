'use server';

import { revalidatePath } from 'next/cache';
import { ApiError, apiDelete, apiPatch, apiPost } from '@/lib/api';
import { ambilKeranjang, ambilTokenKeranjang, pastikanTokenKeranjang } from '@/lib/keranjang';
import type { RingkasanKeranjang } from '@/lib/types';

export interface HasilKeranjang {
  ok: boolean;
  galat?: string;
  jumlahItem?: number;
}

/** Halaman yang menampilkan isi keranjang perlu ikut disegarkan setelah berubah. */
function segarkan(): void {
  revalidatePath('/keranjang');
  revalidatePath('/checkout');
  // Layout etalase menampilkan jumlah item di ikon keranjang.
  revalidatePath('/', 'layout');
}

export async function tambahKeKeranjang(input: {
  produkId: string;
  varianId?: string | null;
  jumlah?: number;
}): Promise<HasilKeranjang> {
  const token = await pastikanTokenKeranjang();

  try {
    const keranjang = await apiPost<RingkasanKeranjang>(
      '/keranjang/item',
      {
        produkId: input.produkId,
        varianId: input.varianId ?? null,
        jumlah: input.jumlah ?? 1,
      },
      { headers: { 'X-Cart-Token': token } },
    );

    segarkan();
    return { ok: true, jumlahItem: keranjang.jumlahItem };
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, galat: e.message };
    return { ok: false, galat: 'Gagal menambahkan ke keranjang. Coba lagi.' };
  }
}

export async function ubahJumlahItem(itemId: string, jumlah: number): Promise<HasilKeranjang> {
  const token = await ambilTokenKeranjang();
  if (!token) return { ok: false, galat: 'Keranjang Anda kosong' };

  try {
    const keranjang = await apiPatch<RingkasanKeranjang>(
      `/keranjang/item/${itemId}`,
      { jumlah },
      { headers: { 'X-Cart-Token': token } },
    );
    segarkan();
    return { ok: true, jumlahItem: keranjang.jumlahItem };
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, galat: e.message };
    return { ok: false, galat: 'Gagal mengubah jumlah' };
  }
}

export async function hapusItem(itemId: string): Promise<HasilKeranjang> {
  const token = await ambilTokenKeranjang();
  if (!token) return { ok: false, galat: 'Keranjang Anda kosong' };

  try {
    const keranjang = await apiDelete<RingkasanKeranjang>(`/keranjang/item/${itemId}`, {
      headers: { 'X-Cart-Token': token },
    });
    segarkan();
    return { ok: true, jumlahItem: keranjang.jumlahItem };
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, galat: e.message };
    return { ok: false, galat: 'Gagal menghapus item' };
  }
}

/**
 * Jumlah item untuk badge di header.
 *
 * Badge sengaja dibaca dari client, bukan dioper lewat layout: memanggil
 * `cookies()` di layout akan memaksa SELURUH etalase jadi dinamis dan
 * menghilangkan ISR di home & katalog, padahal itu halaman yang paling butuh
 * cepat dan SEO-friendly (research/tech/01-frontend.md).
 */
export async function ambilJumlahItemKeranjang(): Promise<number> {
  const keranjang = await ambilKeranjang();
  return keranjang.jumlahItem;
}
