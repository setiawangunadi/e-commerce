import type { MetaPaginasi } from './types';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const BASE = `${API_URL}/api/v1`;

interface Envelope<T> {
  data: T | null;
  error: { code: string; message: string; details?: unknown } | null;
  meta: MetaPaginasi | Record<string, unknown> | null;
}

/** Error dari API dengan pesan yang sudah siap ditampilkan ke pengguna. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface OpsiRequest extends Omit<RequestInit, 'body'> {
  body?: unknown;
  token?: string;
  /** Detik revalidasi ISR. `0` = selalu dinamis. */
  revalidate?: number;
  tags?: string[];
}

async function request<T>(path: string, opsi: OpsiRequest = {}): Promise<{ data: T; meta: Envelope<T>['meta'] }> {
  const { body, token, revalidate, tags, headers, ...sisa } = opsi;

  const res = await fetch(`${BASE}${path}`, {
    ...sisa,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    ...(revalidate !== undefined
      ? { next: { revalidate, ...(tags ? { tags } : {}) } }
      : { cache: 'no-store' as const }),
  });

  let envelope: Envelope<T>;
  try {
    envelope = (await res.json()) as Envelope<T>;
  } catch {
    throw new ApiError(
      `Server membalas ${res.status} tanpa isi yang bisa dibaca`,
      res.status,
      'INVALID_RESPONSE',
    );
  }

  if (!res.ok || envelope.error) {
    throw new ApiError(
      envelope.error?.message ?? 'Terjadi kesalahan pada server',
      res.status,
      envelope.error?.code ?? 'UNKNOWN',
      envelope.error?.details,
    );
  }

  return { data: envelope.data as T, meta: envelope.meta };
}

/** Mengembalikan hanya `data` — dipakai saat metadata paginasi tidak dibutuhkan. */
export async function apiGet<T>(path: string, opsi: OpsiRequest = {}): Promise<T> {
  const { data } = await request<T>(path, { ...opsi, method: 'GET' });
  return data;
}

export function apiGetWithMeta<T>(path: string, opsi: OpsiRequest = {}) {
  return request<T>(path, { ...opsi, method: 'GET' });
}

export async function apiPost<T>(path: string, body: unknown, opsi: OpsiRequest = {}): Promise<T> {
  const { data } = await request<T>(path, { ...opsi, method: 'POST', body });
  return data;
}

export async function apiPatch<T>(path: string, body: unknown, opsi: OpsiRequest = {}): Promise<T> {
  const { data } = await request<T>(path, { ...opsi, method: 'PATCH', body });
  return data;
}

export async function apiDelete<T>(path: string, opsi: OpsiRequest = {}): Promise<T> {
  const { data } = await request<T>(path, { ...opsi, method: 'DELETE' });
  return data;
}

/** Upload multipart — Content-Type sengaja tidak di-set agar boundary diisi browser. */
export async function apiUpload(
  file: File,
  token: string,
): Promise<{ url: string; namaBerkas: string; ukuran: number }> {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${BASE}/admin/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  const envelope = (await res.json()) as Envelope<{ url: string; namaBerkas: string; ukuran: number }>;
  if (!res.ok || envelope.error) {
    throw new ApiError(
      envelope.error?.message ?? 'Gagal mengunggah gambar',
      res.status,
      envelope.error?.code ?? 'UPLOAD_FAILED',
    );
  }
  return envelope.data!;
}
