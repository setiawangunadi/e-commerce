'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { ApiError, apiPost } from '@/lib/api';
import { hapusToken, simpanToken } from '@/lib/sesi';
import type { ProfilAdmin } from '@/lib/types';

const skemaLogin = z.object({
  email: z.email({ message: 'Format email tidak valid' }),
  password: z.string().min(8, 'Password minimal 8 karakter'),
});

export interface StatusForm {
  galat?: string;
  galatField?: Record<string, string>;
}

/** Menukar email/password dengan JWT, lalu menyimpannya di cookie httpOnly. */
export async function masuk(_sebelumnya: StatusForm, formData: FormData): Promise<StatusForm> {
  const hasil = skemaLogin.safeParse({
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
  });

  if (!hasil.success) {
    const galatField: Record<string, string> = {};
    for (const isu of hasil.error.issues) {
      const field = isu.path[0];
      if (typeof field === 'string' && !galatField[field]) galatField[field] = isu.message;
    }
    return { galatField };
  }

  let lanjut = String(formData.get('lanjut') ?? '/admin');
  // Cegah open redirect — hanya path internal yang diterima.
  if (!lanjut.startsWith('/') || lanjut.startsWith('//')) lanjut = '/admin';

  try {
    const data = await apiPost<{ accessToken: string; expiresIn: string; user: ProfilAdmin }>(
      '/auth/login',
      { email: hasil.data.email, password: hasil.data.password },
    );
    await simpanToken(data.accessToken, 8 * 60 * 60);
  } catch (e) {
    if (e instanceof ApiError) return { galat: e.message };
    return { galat: 'Tidak bisa menghubungi server. Pastikan API sedang berjalan.' };
  }

  redirect(lanjut);
}

export async function keluar(): Promise<never> {
  await hapusToken();
  redirect('/admin/login');
}
