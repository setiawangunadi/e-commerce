import { describe, expect, it } from 'vitest';
import {
  MAKS_POIN_DARI_SUBTOTAL,
  NILAI_POIN,
  RUPIAH_PER_POIN,
  aturanTier,
  maksPoinUntuk,
  nilaiRupiah,
  poinDariPesanan,
  tierBerikutnya,
  tierUntuk,
} from '../../src/customer/loyalty.config';

describe('tierUntuk', () => {
  it('memberi tier tertinggi yang ambangnya sudah terlampaui', () => {
    expect(tierUntuk(0).tier).toBe('BRONZE');
    expect(tierUntuk(2_000_000).tier).toBe('SILVER');
    expect(tierUntuk(6_000_000).tier).toBe('GOLD');
    expect(tierUntuk(15_000_000).tier).toBe('PLATINUM');
    expect(tierUntuk(99_000_000).tier).toBe('PLATINUM');
  });

  it('belum menaikkan tier saat belanja kurang satu rupiah dari ambang', () => {
    expect(tierUntuk(1_999_999).tier).toBe('BRONZE');
    expect(tierUntuk(5_999_999).tier).toBe('SILVER');
  });

  it('memperlakukan belanja negatif sebagai tier terendah', () => {
    // Tidak seharusnya terjadi, tapi tier adalah hal pertama yang dilihat
    // pelanggan di halaman akun — ia tidak boleh undefined karena data aneh.
    expect(tierUntuk(-1).tier).toBe('BRONZE');
  });
});

describe('aturanTier', () => {
  it('mengembalikan pengali poin sesuai tier', () => {
    expect(aturanTier('BRONZE').pengali).toBe(1);
    expect(aturanTier('SILVER').pengali).toBe(1.25);
    expect(aturanTier('GOLD').pengali).toBe(1.5);
    expect(aturanTier('PLATINUM').pengali).toBe(2);
  });

  it('jatuh ke Bronze untuk tier yang tidak dikenal', () => {
    expect(aturanTier('TIDAK_ADA' as never).tier).toBe('BRONZE');
  });
});

describe('tierBerikutnya', () => {
  it('menyebut berapa lagi yang dibutuhkan untuk naik tier', () => {
    const berikut = tierBerikutnya(500_000);
    expect(berikut?.tier.tier).toBe('SILVER');
    expect(berikut?.kurang).toBe(1_500_000);
  });

  it('mengembalikan null saat sudah di tier puncak', () => {
    expect(tierBerikutnya(20_000_000)).toBeNull();
  });

  it('melompati tier yang sudah terlewati', () => {
    expect(tierBerikutnya(7_000_000)?.tier.tier).toBe('PLATINUM');
  });
});

describe('poinDariPesanan', () => {
  it('memberi 1 poin per Rp10.000 nilai barang bersih', () => {
    expect(poinDariPesanan(100_000, 1)).toBe(10);
    expect(RUPIAH_PER_POIN).toBe(10_000);
  });

  it('mengalikan perolehan dengan pengali tier', () => {
    expect(poinDariPesanan(100_000, 1.5)).toBe(15);
    expect(poinDariPesanan(100_000, 2)).toBe(20);
  });

  it('membulatkan ke bawah, tidak pernah memberi poin pecahan', () => {
    expect(poinDariPesanan(19_999, 1)).toBe(1);
    expect(poinDariPesanan(100_000, 1.25)).toBe(12); // 10 × 1,25 = 12,5
  });

  it('tidak memberi poin untuk nilai nol atau negatif', () => {
    expect(poinDariPesanan(0, 2)).toBe(0);
    expect(poinDariPesanan(-50_000, 2)).toBe(0);
  });

  it('tidak memberi poin bila belanjanya di bawah satu poin', () => {
    expect(poinDariPesanan(9_999, 1)).toBe(0);
  });
});

describe('nilaiRupiah', () => {
  it('menilai satu poin Rp100', () => {
    expect(nilaiRupiah(100)).toBe(10_000);
    expect(NILAI_POIN).toBe(100);
  });

  it('mengembalikan nol untuk saldo kosong', () => {
    expect(nilaiRupiah(0)).toBe(0);
  });
});

describe('maksPoinUntuk', () => {
  it('membatasi potongan poin di separuh subtotal', () => {
    expect(MAKS_POIN_DARI_SUBTOTAL).toBe(0.5);
    // Rp100.000 → batas Rp50.000 → 500 poin.
    expect(maksPoinUntuk(100_000, 10_000)).toBe(500);
  });

  it('tidak pernah melebihi saldo yang dimiliki pelanggan', () => {
    expect(maksPoinUntuk(100_000, 120)).toBe(120);
  });

  it('mengembalikan nol saat tidak ada yang bisa dipotong', () => {
    expect(maksPoinUntuk(0, 5_000)).toBe(0);
    expect(maksPoinUntuk(100_000, 0)).toBe(0);
  });

  it('tidak pernah negatif walau subtotalnya aneh', () => {
    expect(maksPoinUntuk(-100_000, 5_000)).toBe(0);
  });

  it('membulatkan ke bawah ke poin utuh', () => {
    // Batas Rp7.550 hanya cukup untuk 75 poin, bukan 75,5.
    expect(maksPoinUntuk(15_100, 10_000)).toBe(75);
  });
});
