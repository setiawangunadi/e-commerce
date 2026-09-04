import 'server-only';
import { cookies } from 'next/headers';
import { randomBytes } from 'node:crypto';
import { apiGet } from './api';
import type { RingkasanKeranjang } from './types';

export const COOKIE_KERANJANG = 'keranjang';

const KERANJANG_KOSONG: RingkasanKeranjang = {
  id: null,
  items: [],
  jumlahItem: 0,
  subtotal: 0,
  beratTotal: 0,
  adaMasalah: false,
};

/**
 * Token keranjang disimpan di cookie httpOnly.
 *
 * Browser tidak pernah menyentuh token ini — Server Action yang membacanya lalu
 * meneruskannya ke API lewat header. Dengan begitu skrip pihak ketiga di halaman
 * tidak bisa membaca atau mengubah isi keranjang pembeli.
 */
export async function ambilTokenKeranjang(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_KERANJANG)?.value ?? null;
}

/** Membuat token bila belum ada. Hanya boleh dipanggil dari Server Action. */
export async function pastikanTokenKeranjang(): Promise<string> {
  const store = await cookies();
  const adaSekarang = store.get(COOKIE_KERANJANG)?.value;
  if (adaSekarang) return adaSekarang;

  const token = randomBytes(24).toString('base64url');
  store.set(COOKIE_KERANJANG, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 hari
  });
  return token;
}

/** Isi keranjang saat ini. Aman dipanggil dari Server Component mana pun. */
export async function ambilKeranjang(): Promise<RingkasanKeranjang> {
  const token = await ambilTokenKeranjang();
  if (!token) return KERANJANG_KOSONG;

  try {
    return await apiGet<RingkasanKeranjang>('/keranjang', {
      headers: { 'X-Cart-Token': token },
    });
  } catch {
    // Keranjang yang gagal dimuat tidak boleh menjatuhkan halaman apa pun.
    return KERANJANG_KOSONG;
  }
}
