import { z } from 'zod';

/**
 * Bentuk isi tiap jenis blok landing page.
 *
 * Kolom `konten` di database bertipe Json, jadi skema inilah satu-satunya yang
 * menentukan apa yang boleh masuk. Tanpa ini, kolom Json berarti "apa saja" —
 * termasuk data yang nanti dirender ke halaman publik.
 */

const teks = (maks: number) => z.string().trim().max(maks);
const teksWajib = (maks: number, pesan: string) => z.string().trim().min(1, pesan).max(maks);

const teksOpsional = (maks: number) =>
  z
    .string()
    .trim()
    .max(maks)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .default(null);

/**
 * Gambar harus berupa URL http(s) atau path internal.
 * Membatasi skema URL menutup `javascript:` dan `data:` yang bisa dipakai
 * menyisipkan skrip lewat atribut src.
 */
const urlGambar = z
  .string()
  .trim()
  .refine((v) => v === '' || /^https?:\/\//i.test(v) || v.startsWith('/'), {
    message: 'URL gambar tidak valid',
  })
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .default(null);

/** Tujuan tombol CTA. Admin memilih salah satu dari tiga perilaku. */
export const skemaAksi = z
  .object({
    tipe: z.enum(['checkout', 'keranjang', 'tautan']).default('tautan'),
    produkId: teksOpsional(64),
    varianId: teksOpsional(64),
    jumlah: z.number().int().min(1).max(99).default(1),
    /** Hanya path internal — landing page adalah tujuan iklan berbayar, dan
     *  tautan keluar sembarang di sana adalah jalan pintas phishing. */
    url: z
      .string()
      .trim()
      .transform((v) => (v === '' ? null : v))
      .nullable()
      .default(null)
      .refine((v) => v === null || (v.startsWith('/') && !v.startsWith('//')), {
        message: 'Tautan harus berupa path internal, contoh: /produk',
      }),
  })
  .refine((a) => a.tipe === 'tautan' || !!a.produkId, {
    message: 'Pilih produk untuk tombol yang menuju keranjang atau checkout',
    path: ['produkId'],
  })
  .refine((a) => a.tipe !== 'tautan' || !!a.url, {
    message: 'Isi tautan tujuan tombol',
    path: ['url'],
  });

export type AksiCta = z.infer<typeof skemaAksi>;

const tombol = z.object({
  teks: teksWajib(40, 'Teks tombol wajib diisi'),
  aksi: skemaAksi,
});

// --- Skema per jenis blok ---------------------------------------------------

const hero = z.object({
  badge: teksOpsional(60),
  judul: teksWajib(120, 'Judul hero wajib diisi'),
  subjudul: teksOpsional(300),
  gambarUrl: urlGambar,
  tombol: tombol.nullable().default(null),
  /** Poin singkat di bawah tombol, mis. "Gratis ongkir · Garansi 7 hari". */
  poin: z.array(teks(60)).max(4).default([]),
});

const produk = z.object({
  judul: teksOpsional(120),
  subjudul: teksOpsional(300),
  produkIds: z.array(z.string().trim().min(1)).min(1, 'Pilih minimal satu produk').max(12),
  tampilkanTombol: z.boolean().default(true),
});

const keunggulan = z.object({
  judul: teksOpsional(120),
  items: z
    .array(
      z.object({
        ikon: z.enum(['truk', 'perisai', 'kembali', 'chat', 'bintang', 'centang']).default('centang'),
        judul: teksWajib(80, 'Judul keunggulan wajib diisi'),
        teks: teksOpsional(200),
      }),
    )
    .min(1, 'Tambahkan minimal satu keunggulan')
    .max(8),
});

const testimoni = z.object({
  judul: teksOpsional(120),
  items: z
    .array(
      z.object({
        nama: teksWajib(60, 'Nama wajib diisi'),
        kota: teksOpsional(60),
        teks: teksWajib(400, 'Isi testimoni wajib diisi'),
        rating: z.number().int().min(1).max(5).default(5),
      }),
    )
    .min(1, 'Tambahkan minimal satu testimoni')
    .max(12),
});

const faq = z.object({
  judul: teksOpsional(120),
  items: z
    .array(
      z.object({
        tanya: teksWajib(200, 'Pertanyaan wajib diisi'),
        jawab: teksWajib(1000, 'Jawaban wajib diisi'),
      }),
    )
    .min(1, 'Tambahkan minimal satu pertanyaan')
    .max(20),
});

const hitungMundur = z.object({
  judul: teksWajib(120, 'Judul wajib diisi'),
  subjudul: teksOpsional(200),
  /** Waktu berakhir promo dalam ISO-8601. */
  berakhirPada: z.string().trim().refine((v) => !Number.isNaN(Date.parse(v)), {
    message: 'Waktu berakhir tidak valid',
  }),
  teksSetelahHabis: teksOpsional(120),
});

const cta = z.object({
  judul: teksWajib(120, 'Judul wajib diisi'),
  subjudul: teksOpsional(300),
  tombol,
  catatanKecil: teksOpsional(150),
});

const tekstual = z.object({
  judul: teksOpsional(120),
  /** Paragraf polos, bukan HTML — dirender sebagai teks, tidak pernah sebagai markup. */
  isi: teksWajib(4000, 'Isi teks wajib diisi'),
});

export const SKEMA_BLOK = {
  HERO: hero,
  PRODUK: produk,
  KEUNGGULAN: keunggulan,
  TESTIMONI: testimoni,
  FAQ: faq,
  HITUNG_MUNDUR: hitungMundur,
  CTA: cta,
  TEKS: tekstual,
} as const;

export type JenisBlok = keyof typeof SKEMA_BLOK;

export const JENIS_BLOK = Object.keys(SKEMA_BLOK) as JenisBlok[];

/** Memvalidasi & menormalkan isi blok sesuai jenisnya. */
export function validasiKontenBlok(tipe: JenisBlok, konten: unknown) {
  const skema = SKEMA_BLOK[tipe];
  if (!skema) {
    return { ok: false as const, pesan: `Jenis blok "${tipe}" tidak dikenal` };
  }

  const hasil = skema.safeParse(konten ?? {});
  if (!hasil.success) {
    const pertama = hasil.error.issues[0];
    const lokasi = pertama?.path.length ? `${pertama.path.join('.')}: ` : '';
    return { ok: false as const, pesan: `${lokasi}${pertama?.message ?? 'Isi blok tidak valid'}` };
  }

  return { ok: true as const, data: hasil.data as Record<string, unknown> };
}
