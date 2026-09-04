'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { ApiError, apiPost } from '@/lib/api';
import { ambilTokenKeranjang } from '@/lib/keranjang';
import { ambilTokenPelanggan } from '@/lib/sesi-pelanggan';
import type { HasilOngkir, HasilVoucher, Pesanan } from '@/lib/types';

/** Bentuk alamat yang sama dipakai untuk hitung ongkir maupun buat pesanan. */
const skemaAlamat = {
  provinsi: z.string().trim().min(1, 'Provinsi wajib dipilih'),
  kota: z.string().trim().min(2, 'Kota/kabupaten wajib diisi').max(100),
  kecamatan: z
    .string()
    .trim()
    .max(100)
    .transform((v) => (v === '' ? null : v))
    .nullable(),
  kodePos: z.string().trim().regex(/^\d{5}$/, 'Kode pos harus 5 digit angka'),
};

const teksAtribusi = z
  .string()
  .trim()
  .max(200)
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .default(null);

const skemaCheckout = z.object({
  nama: z.string().trim().min(3, 'Nama penerima minimal 3 karakter').max(100),
  email: z.email({ message: 'Format email tidak valid' }),
  telepon: z
    .string()
    .trim()
    .regex(/^(\+?62|0)8\d{7,13}$/, 'Nomor WhatsApp tidak valid (contoh: 081234567890)'),
  alamatLengkap: z
    .string()
    .trim()
    .min(10, 'Alamat terlalu pendek — sertakan nama jalan dan nomor rumah')
    .max(500),
  ...skemaAlamat,
  catatan: z
    .string()
    .trim()
    .max(300)
    .transform((v) => (v === '' ? null : v))
    .nullable(),
  kodeOngkir: z.string().trim().min(1, 'Pilih layanan pengiriman'),
  kodeVoucher: teksAtribusi,
  poinDipakai: z
    .string()
    .trim()
    .transform((v) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
    }),
  // Atribusi iklan — diisi otomatis dari sessionStorage, bukan diketik pembeli.
  utmSource: teksAtribusi,
  utmMedium: teksAtribusi,
  utmCampaign: teksAtribusi,
  utmContent: teksAtribusi,
  utmTerm: teksAtribusi,
  landingSlug: teksAtribusi,
});

export interface HasilCheckout {
  ok: boolean;
  galat?: string;
  galatField?: Record<string, string>;
}

function kumpulkanGalat(error: z.ZodError): Record<string, string> {
  const galat: Record<string, string> = {};
  for (const isu of error.issues) {
    const field = isu.path.join('.');
    if (!galat[field]) galat[field] = isu.message;
  }
  return galat;
}

/**
 * Menghitung ongkir untuk alamat yang sedang diisi.
 *
 * Dipanggil dari form saat provinsi/kota/kode pos lengkap. Nilai yang dipakai
 * sebagai harga final tetap dihitung ulang di API saat pesanan dibuat.
 */
export async function hitungOngkir(input: {
  provinsi: string;
  kota: string;
  kecamatan?: string;
  kodePos: string;
}): Promise<{ ok: boolean; hasil?: HasilOngkir; galat?: string }> {
  const token = await ambilTokenKeranjang();
  if (!token) return { ok: false, galat: 'Keranjang Anda kosong' };

  const cek = z.object(skemaAlamat).safeParse(input);
  if (!cek.success) {
    return { ok: false, galat: cek.error.issues[0]?.message ?? 'Alamat belum lengkap' };
  }

  // Berat & nilai barang diambil dari keranjang di server, bukan dari client.
  const { apiGet } = await import('@/lib/api');
  const keranjang = await apiGet<{ beratTotal: number; subtotal: number; items: unknown[] }>(
    '/keranjang',
    { headers: { 'X-Cart-Token': token } },
  ).catch(() => null);

  if (!keranjang || keranjang.items.length === 0) {
    return { ok: false, galat: 'Keranjang Anda kosong' };
  }

  try {
    const hasil = await apiPost<HasilOngkir>('/pengiriman/ongkir', {
      tujuan: {
        provinsi: cek.data.provinsi,
        kota: cek.data.kota,
        kecamatan: cek.data.kecamatan,
        kodePos: cek.data.kodePos,
      },
      berat: keranjang.beratTotal,
      nilaiBarang: keranjang.subtotal,
    });
    return { ok: true, hasil };
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, galat: e.message };
    return { ok: false, galat: 'Gagal menghitung ongkir. Coba lagi.' };
  }
}

/** Kota/kabupaten di bawah satu provinsi, untuk dropdown bertingkat. */
export async function ambilKota(provinsi: string): Promise<string[]> {
  if (!provinsi) return [];
  const { apiGet } = await import('@/lib/api');
  return apiGet<string[]>(`/pengiriman/kota?provinsi=${encodeURIComponent(provinsi)}`, {
    revalidate: 86_400,
  }).catch(() => []);
}

export async function ambilKecamatan(provinsi: string, kota: string): Promise<string[]> {
  if (!provinsi || !kota) return [];
  const { apiGet } = await import('@/lib/api');
  return apiGet<string[]>(
    `/pengiriman/kecamatan?provinsi=${encodeURIComponent(provinsi)}&kota=${encodeURIComponent(kota)}`,
    { revalidate: 86_400 },
  ).catch(() => []);
}

/**
 * Memeriksa kode voucher terhadap isi keranjang.
 *
 * Hasilnya hanya untuk ditampilkan — potongan dihitung ulang di server saat
 * pesanan dibuat, jadi angka dari sini tidak pernah jadi harga final.
 */
export async function cekVoucher(
  kode: string,
): Promise<{ ok: boolean; hasil?: HasilVoucher; galat?: string }> {
  const token = await ambilTokenKeranjang();
  if (!token) return { ok: false, galat: 'Keranjang Anda kosong' };

  const bersih = kode.trim();
  if (bersih.length < 3) return { ok: false, galat: 'Kode voucher terlalu pendek' };

  try {
    const hasil = await apiPost<HasilVoucher>(
      '/keranjang/voucher',
      { kode: bersih },
      { headers: { 'X-Cart-Token': token } },
    );
    return { ok: true, hasil };
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, galat: e.message };
    return { ok: false, galat: 'Gagal memeriksa voucher. Coba lagi.' };
  }
}

export async function buatPesanan(
  _sebelumnya: HasilCheckout,
  formData: FormData,
): Promise<HasilCheckout> {
  const token = await ambilTokenKeranjang();
  if (!token) return { ok: false, galat: 'Keranjang Anda kosong' };

  const teks = (nama: string) => String(formData.get(nama) ?? '');

  const hasil = skemaCheckout.safeParse({
    nama: teks('nama'),
    email: teks('email'),
    telepon: teks('telepon'),
    alamatLengkap: teks('alamatLengkap'),
    provinsi: teks('provinsi'),
    kota: teks('kota'),
    kecamatan: teks('kecamatan'),
    kodePos: teks('kodePos'),
    catatan: teks('catatan'),
    kodeOngkir: teks('kodeOngkir'),
    kodeVoucher: teks('kodeVoucher'),
    poinDipakai: teks('poinDipakai') || '0',
    utmSource: teks('utmSource'),
    utmMedium: teks('utmMedium'),
    utmCampaign: teks('utmCampaign'),
    utmContent: teks('utmContent'),
    utmTerm: teks('utmTerm'),
    landingSlug: teks('landingSlug'),
  });

  if (!hasil.success) {
    return {
      ok: false,
      galat: 'Ada isian yang belum benar',
      galatField: kumpulkanGalat(hasil.error),
    };
  }

  // Token pelanggan hanya menandai siapa yang memesan. Besar potongan poin
  // tetap dihitung ulang di API dari jumlah poinnya — tidak ada nilai uang
  // yang berasal dari browser.
  const tokenPelanggan = await ambilTokenPelanggan();

  let pesanan: Pesanan;
  try {
    pesanan = await apiPost<Pesanan>('/pesanan', hasil.data, {
      headers: { 'X-Cart-Token': token },
      ...(tokenPelanggan ? { token: tokenPelanggan } : {}),
    });
  } catch (e) {
    if (e instanceof ApiError) {
      const rincian = Array.isArray(e.details) ? ` (${e.details.join(', ')})` : '';
      return { ok: false, galat: `${e.message}${rincian}` };
    }
    return { ok: false, galat: 'Gagal membuat pesanan. Coba lagi.' };
  }

  revalidatePath('/keranjang');
  revalidatePath('/', 'layout');

  // Token pesanan ikut di URL supaya pembeli tamu bisa membuka status
  // pesanannya kembali tanpa perlu akun.
  redirect(`/pesanan/${pesanan.nomor}?token=${encodeURIComponent(pesanan.token)}`);
}
