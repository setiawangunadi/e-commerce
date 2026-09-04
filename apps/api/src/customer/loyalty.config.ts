import type { CustomerTier } from '../generated/prisma/enums.ts';

/**
 * Aturan program loyalty. Dikumpulkan di satu berkas agar nilainya bisa
 * ditinjau sekali jalan — angka-angka ini langsung menentukan biaya program,
 * jadi tersebar di banyak service akan menyulitkan saat mau disetel ulang.
 *
 * Mengacu pada research/business/09-marketing-promotion.md.
 */

/** Belanja Rp10.000 menghasilkan 1 poin. Ongkir tidak ikut dihitung. */
export const RUPIAH_PER_POIN = 10_000;

/** Satu poin bernilai Rp100 saat ditukar. Jadi tingkat balik modalnya 1%. */
export const NILAI_POIN = 100;

/**
 * Batas atas potongan poin per transaksi, sebagai pecahan dari subtotal.
 * Tanpa ini, pelanggan lama bisa membayar nyaris nol dan toko tetap menanggung
 * ongkir serta biaya payment gateway.
 */
export const MAKS_POIN_DARI_SUBTOTAL = 0.5;

/** Poin minimum yang bisa ditukar jadi voucher, supaya tidak ada voucher recehan. */
export const MIN_POIN_JADI_VOUCHER = 100;

/** Masa berlaku voucher hasil penukaran poin. */
export const VOUCHER_POIN_BERLAKU_HARI = 90;

export interface AturanTier {
  tier: CustomerTier;
  nama: string;
  /** Ambang belanja 12 bulan terakhir (Rupiah) untuk mencapai tier ini. */
  minBelanja: number;
  /**
   * Pengali perolehan poin. Sengaja ini satu-satunya manfaat tier: menambah
   * diskon otomatis per tier akan bertabrakan dengan voucher dan potongan poin,
   * dan riset menandai penumpukan promo sebagai risiko yang perlu aturan jelas
   * lebih dulu (research/business/09-marketing-promotion.md).
   */
  pengali: number;
  warna: string;
}

export const TIER: AturanTier[] = [
  { tier: 'BRONZE', nama: 'Bronze', minBelanja: 0, pengali: 1, warna: '#a16207' },
  { tier: 'SILVER', nama: 'Silver', minBelanja: 2_000_000, pengali: 1.25, warna: '#64748b' },
  { tier: 'GOLD', nama: 'Gold', minBelanja: 6_000_000, pengali: 1.5, warna: '#ca8a04' },
  { tier: 'PLATINUM', nama: 'Platinum', minBelanja: 15_000_000, pengali: 2, warna: '#0f766e' },
];

/** Tier tertinggi yang ambangnya sudah terlampaui. */
export function tierUntuk(belanja12Bulan: number): AturanTier {
  let hasil = TIER[0]!;
  for (const t of TIER) if (belanja12Bulan >= t.minBelanja) hasil = t;
  return hasil;
}

export function aturanTier(tier: CustomerTier): AturanTier {
  return TIER.find((t) => t.tier === tier) ?? TIER[0]!;
}

/** Tier berikutnya beserta sisa belanja yang dibutuhkan, atau null bila sudah puncak. */
export function tierBerikutnya(
  belanja12Bulan: number,
): { tier: AturanTier; kurang: number } | null {
  const berikut = TIER.find((t) => belanja12Bulan < t.minBelanja);
  return berikut ? { tier: berikut, kurang: berikut.minBelanja - belanja12Bulan } : null;
}

/**
 * Poin yang dihasilkan sebuah pesanan.
 *
 * Dihitung dari nilai barang setelah seluruh potongan, bukan dari subtotal
 * kotor: kalau tidak, pesanan yang dibayar sebagian besar dengan poin akan
 * menghasilkan poin baru hampir sebanyak yang barusan dipakai.
 */
export function poinDariPesanan(
  nilaiBarangBersih: number,
  pengaliTier: number,
): number {
  if (nilaiBarangBersih <= 0) return 0;
  return Math.floor((nilaiBarangBersih / RUPIAH_PER_POIN) * pengaliTier);
}

/** Rupiah yang didapat dari sejumlah poin. */
export function nilaiRupiah(poin: number): number {
  return poin * NILAI_POIN;
}

/** Poin terbanyak yang boleh dipakai untuk satu subtotal. */
export function maksPoinUntuk(subtotalSetelahVoucher: number, saldo: number): number {
  const batasRupiah = Math.floor(subtotalSetelahVoucher * MAKS_POIN_DARI_SUBTOTAL);
  return Math.max(0, Math.min(saldo, Math.floor(batasRupiah / NILAI_POIN)));
}
