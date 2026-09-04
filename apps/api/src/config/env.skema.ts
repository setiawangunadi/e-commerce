import { z } from 'zod';

/**
 * Validasi environment saat aplikasi dinyalakan.
 *
 * Kesalahan konfigurasi adalah penyebab paling sering dari kegagalan produksi
 * yang sulit dilacak: JWT_SECRET bawaan yang lupa diganti, key Midtrans sandbox
 * yang terpasang di produksi, atau CORS yang masih menunjuk localhost. Semua
 * itu tidak menimbulkan galat sampai ada orang yang benar-benar memakainya —
 * biasanya pembeli pertama.
 *
 * Karena itu pemeriksaannya dilakukan sekali di awal dan menolak menyalakan
 * proses bila ada yang salah. Server yang mati saat deploy jauh lebih mudah
 * diperbaiki daripada server yang hidup tapi diam-diam salah.
 */

/** Nilai bawaan dari .env.example yang WAJIB diganti sebelum produksi. */
const JWT_SECRET_CONTOH = 'ganti-dengan-string-acak-minimal-32-karakter';

const bolean = (bawaan: 'true' | 'false') =>
  z
    .enum(['true', 'false'])
    .default(bawaan)
    .transform((v) => v === 'true');

const angka = (bawaan: number) =>
  z.coerce.number().int().positive().default(bawaan);

const skemaDasar = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: angka(4000),

  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL wajib diisi')
    .refine((v) => v.startsWith('postgres://') || v.startsWith('postgresql://'), {
      message: 'DATABASE_URL harus URL PostgreSQL (postgresql://...)',
    }),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET minimal 32 karakter'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  CUSTOMER_JWT_EXPIRES_IN: z.string().default('30d'),

  /** Boleh lebih dari satu origin, dipisah koma. */
  WEB_ORIGIN: z.string().min(1).default('http://localhost:3000'),

  UPLOAD_DIR: z.string().default('./uploads'),
  PUBLIC_BASE_URL: z.url('PUBLIC_BASE_URL harus URL lengkap').default('http://localhost:4000'),

  // --- Pengiriman ---------------------------------------------------------
  BITESHIP_API_KEY: z.string().default(''),
  BITESHIP_BASE_URL: z.url().default('https://api.biteship.com'),
  BITESHIP_KURIR: z.string().default('jne,jnt,sicepat,anteraja,pos,tiki'),
  GUDANG_AREA_ID: z.string().default(''),
  GUDANG_KODE_POS: z.string().default(''),

  // --- Pembayaran ---------------------------------------------------------
  MIDTRANS_SERVER_KEY: z.string().default(''),
  MIDTRANS_CLIENT_KEY: z.string().default(''),
  MIDTRANS_PRODUKSI: bolean('false'),
  BATAS_BAYAR_MENIT: angka(1440),

  // --- Pembatasan laju ----------------------------------------------------
  /** Permintaan per menit per IP untuk endpoint umum. */
  RATE_LIMIT_UMUM: angka(300),
  /** Percobaan login per menit per IP. Sengaja jauh lebih ketat. */
  RATE_LIMIT_LOGIN: angka(10),

  /**
   * Jumlah proxy tepercaya di depan API (mis. 1 bila hanya ada satu load
   * balancer). Menentukan seberapa jauh Fastify boleh mempercayai
   * `X-Forwarded-For` — salah setel berarti pembatasan laju memakai IP yang
   * bisa dipalsukan penyerang.
   */
  TRUST_PROXY: angka(1),

  SEED_ADMIN_EMAIL: z.string().default('admin@toko.local'),
  SEED_ADMIN_PASSWORD: z.string().default('admin12345'),
});

export type EnvTervalidasi = z.infer<typeof skemaDasar>;

/**
 * Aturan tambahan yang hanya berlaku di produksi.
 *
 * Dipisahkan supaya development tetap bisa jalan dengan `.env.example` apa
 * adanya, tanpa melunakkan syarat di tempat yang benar-benar penting.
 */
function periksaAturanProduksi(env: EnvTervalidasi): string[] {
  if (env.NODE_ENV !== 'production') return [];

  const masalah: string[] = [];

  if (env.JWT_SECRET === JWT_SECRET_CONTOH) {
    masalah.push(
      'JWT_SECRET masih memakai nilai contoh dari .env.example. ' +
        'Buat yang baru: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"',
    );
  }

  if (env.SEED_ADMIN_PASSWORD === 'admin12345') {
    masalah.push('SEED_ADMIN_PASSWORD masih memakai sandi contoh — ganti sebelum menjalankan seed');
  }

  for (const origin of env.WEB_ORIGIN.split(',').map((o) => o.trim())) {
    if (!origin.startsWith('https://')) {
      masalah.push(`WEB_ORIGIN "${origin}" harus memakai https di produksi`);
    }
  }

  if (!env.PUBLIC_BASE_URL.startsWith('https://')) {
    masalah.push('PUBLIC_BASE_URL harus memakai https di produksi');
  }

  // Key sandbox berawalan "SB-Mid-". Salah pasang menghasilkan
  // "401 Unknown Merchant server_key" yang baru ketahuan saat pembeli membayar.
  const serverKeySandbox = env.MIDTRANS_SERVER_KEY.startsWith('SB-Mid-');
  const clientKeySandbox = env.MIDTRANS_CLIENT_KEY.startsWith('SB-Mid-');

  if (env.MIDTRANS_PRODUKSI && env.MIDTRANS_SERVER_KEY && serverKeySandbox) {
    masalah.push('MIDTRANS_PRODUKSI="true" tapi MIDTRANS_SERVER_KEY masih key sandbox (SB-Mid-)');
  }
  if (env.MIDTRANS_PRODUKSI && env.MIDTRANS_CLIENT_KEY && clientKeySandbox) {
    masalah.push('MIDTRANS_PRODUKSI="true" tapi MIDTRANS_CLIENT_KEY masih key sandbox (SB-Mid-)');
  }
  if (!env.MIDTRANS_PRODUKSI && env.MIDTRANS_SERVER_KEY && !serverKeySandbox) {
    masalah.push(
      'MIDTRANS_SERVER_KEY tampak key produksi tapi MIDTRANS_PRODUKSI belum "true" — ' +
        'transaksi akan dikirim ke sandbox dan pembayaran nyata tidak akan tercatat',
    );
  }

  if (!env.MIDTRANS_SERVER_KEY || !env.MIDTRANS_CLIENT_KEY) {
    masalah.push('Kunci Midtrans belum diisi — pembeli tidak akan bisa membayar');
  }

  // Biteship butuh titik asal; tanpa itu API-nya tidak bisa menghitung apa pun
  // dan seluruh ongkir diam-diam jatuh ke tarif perkiraan.
  if (env.BITESHIP_API_KEY && !env.GUDANG_AREA_ID && !env.GUDANG_KODE_POS) {
    masalah.push(
      'BITESHIP_API_KEY terisi tapi GUDANG_AREA_ID maupun GUDANG_KODE_POS kosong — ' +
        'ongkir akan memakai tarif perkiraan, bukan tarif kurir sungguhan',
    );
  }

  return masalah;
}

/**
 * Dipanggil ConfigModule saat boot. Melempar galat berarti proses berhenti
 * sebelum menerima satu pun request.
 */
export function validasiEnv(mentah: Record<string, unknown>): EnvTervalidasi {
  const hasil = skemaDasar.safeParse(mentah);

  if (!hasil.success) {
    const daftar = hasil.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Konfigurasi environment tidak valid:\n${daftar.join('\n')}`);
  }

  const masalah = periksaAturanProduksi(hasil.data);
  if (masalah.length > 0) {
    throw new Error(
      `Konfigurasi tidak layak produksi:\n${masalah.map((m) => `  - ${m}`).join('\n')}`,
    );
  }

  return hasil.data;
}
