import 'server-only';
import { cookies } from 'next/headers';
import { apiGet } from './api';
import type { ProfilAdmin } from './types';

export const NAMA_COOKIE = 'sesi_admin';

/**
 * Token admin disimpan di cookie httpOnly, bukan localStorage — supaya tidak
 * bisa dibaca JavaScript bila ada celah XSS (research/tech/04-authentication-security.md).
 */
export async function ambilToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(NAMA_COOKIE)?.value ?? null;
}

export async function simpanToken(token: string, detikBerlaku: number): Promise<void> {
  const store = await cookies();
  store.set(NAMA_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: detikBerlaku,
  });
}

export async function hapusToken(): Promise<void> {
  const store = await cookies();
  store.delete(NAMA_COOKIE);
}

/** Mengembalikan profil admin, atau null bila token tidak ada / sudah kedaluwarsa. */
export async function ambilProfil(): Promise<ProfilAdmin | null> {
  const token = await ambilToken();
  if (!token) return null;

  try {
    return await apiGet<ProfilAdmin>('/auth/me', { token });
  } catch {
    return null;
  }
}
