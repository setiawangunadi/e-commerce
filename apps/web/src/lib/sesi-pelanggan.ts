import 'server-only';
import { cookies } from 'next/headers';
import { apiGet } from './api';
import type { ProfilPelanggan } from './types';

export const COOKIE_PELANGGAN = 'sesi_pelanggan';

/** 30 hari, sama dengan masa berlaku token yang diterbitkan API. */
const UMUR_DETIK = 30 * 24 * 60 * 60;

/**
 * Sama seperti sesi admin: token disimpan di cookie httpOnly agar tidak
 * terbaca JavaScript bila ada celah XSS. Cookie-nya terpisah supaya satu orang
 * bisa membuka panel admin dan berbelanja sebagai pelanggan di peramban yang
 * sama tanpa saling menimpa.
 */
export async function ambilTokenPelanggan(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_PELANGGAN)?.value ?? null;
}

export async function simpanTokenPelanggan(token: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_PELANGGAN, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: UMUR_DETIK,
  });
}

export async function hapusTokenPelanggan(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_PELANGGAN);
}

/** Profil pelanggan, atau null bila belum masuk / token sudah kedaluwarsa. */
export async function ambilPelanggan(): Promise<ProfilPelanggan | null> {
  const token = await ambilTokenPelanggan();
  if (!token) return null;

  try {
    return await apiGet<ProfilPelanggan>('/pelanggan/saya', { token });
  } catch {
    return null;
  }
}
