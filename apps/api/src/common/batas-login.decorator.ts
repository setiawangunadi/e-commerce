import { Throttle } from '@nestjs/throttler';

/**
 * Pembatasan ketat untuk endpoint yang menerima kata sandi.
 *
 * Batas umum (ratusan permintaan per menit) memang pantas untuk penelusuran
 * katalog, tapi terlalu longgar untuk login: dengan kuota sebesar itu, satu IP
 * bisa mencoba ratusan ribu sandi per hari. Angka pastinya diatur lewat
 * RATE_LIMIT_LOGIN supaya bisa diketatkan tanpa deploy ulang kode.
 *
 * Ini melengkapi, bukan menggantikan, hash argon2id dan pesan galat yang
 * seragam — masing-masing menutup celah yang berbeda.
 */
export const BatasiPercobaanLogin = () =>
  Throttle({
    umum: {
      ttl: 60_000,
      limit: Number(process.env.RATE_LIMIT_LOGIN ?? 10),
    },
  });
