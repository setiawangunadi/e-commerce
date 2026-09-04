import { afterEach, describe, expect, it, vi } from 'vitest';
import { berat, rupiah, rupiahRingkas, tanggal, waktuRelatif } from '@/lib/format';

/** Menyamakan spasi non-breaking dari Intl dengan spasi biasa agar mudah dibaca. */
const rapikan = (teks: string) => teks.replace(/ /g, ' ');

describe('rupiah', () => {
  it('memformat harga dengan pemisah ribuan Indonesia', () => {
    expect(rapikan(rupiah(189_000))).toBe('Rp 189.000');
    expect(rapikan(rupiah(1_250_000))).toBe('Rp 1.250.000');
  });

  it('memakai spasi non-breaking supaya label harga tidak terpotong saat kartu menyempit', () => {
    expect(rupiah(189_000)).toContain(' ');
    expect(rupiah(189_000)).not.toMatch(/Rp /);
  });

  it('tidak menampilkan sen — Rupiah tidak dipakai dalam pecahan', () => {
    expect(rupiah(189_000)).not.toContain(',');
    expect(rupiah(189_499)).toBe(rupiah(189_000).replace('189.000', '189.499'));
  });

  it('memformat nol dan nilai kecil', () => {
    expect(rapikan(rupiah(0))).toBe('Rp 0');
    expect(rapikan(rupiah(500))).toBe('Rp 500');
  });

  it('memformat nilai negatif untuk baris potongan', () => {
    expect(rapikan(rupiah(-20_000))).toBe('-Rp 20.000');
  });
});

describe('rupiahRingkas', () => {
  it('meringkas jutaan untuk kartu statistik yang sempit', () => {
    expect(rupiahRingkas(1_250_000)).toBe('Rp1,3 jt');
    expect(rupiahRingkas(15_000_000)).toBe('Rp15,0 jt');
  });

  it('meringkas miliaran', () => {
    expect(rupiahRingkas(2_500_000_000)).toBe('Rp2,50 M');
  });

  it('meringkas ribuan', () => {
    expect(rupiahRingkas(189_000)).toBe('Rp189 rb');
  });

  it('memakai format penuh di bawah seribu', () => {
    expect(rapikan(rupiahRingkas(500))).toBe('Rp 500');
    expect(rapikan(rupiahRingkas(0))).toBe('Rp 0');
  });

  it('memakai koma sebagai pemisah desimal, sesuai kebiasaan Indonesia', () => {
    expect(rupiahRingkas(1_500_000)).not.toContain('.');
    expect(rupiahRingkas(1_500_000)).toContain(',');
  });
});

describe('berat', () => {
  it('menampilkan gram di bawah 1 kg', () => {
    expect(berat(350)).toBe('350 g');
    expect(berat(999)).toBe('999 g');
  });

  it('beralih ke kilogram mulai 1000 gram', () => {
    expect(berat(1_000)).toBe('1,0 kg');
    expect(berat(1_200)).toBe('1,2 kg');
  });

  it('memakai koma sebagai pemisah desimal', () => {
    expect(berat(2_500)).toBe('2,5 kg');
  });
});

describe('tanggal', () => {
  it('memformat tanggal dalam Bahasa Indonesia', () => {
    expect(tanggal(new Date('2026-08-17T10:00:00Z'))).toMatch(/2026/);
    expect(tanggal(new Date('2026-08-17T10:00:00Z'))).toMatch(/Agu/);
  });

  it('menerima string ISO dari API', () => {
    expect(tanggal('2026-08-17T10:00:00.000Z')).toBe(tanggal(new Date('2026-08-17T10:00:00Z')));
  });
});

describe('waktuRelatif', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function padaSaat(sekarang: string) {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(sekarang));
  }

  it('menyebut "baru saja" untuk kejadian di bawah satu menit', () => {
    padaSaat('2026-08-17T10:00:30Z');
    expect(waktuRelatif('2026-08-17T10:00:00Z')).toBe('baru saja');
  });

  it('menghitung dalam menit di bawah satu jam', () => {
    padaSaat('2026-08-17T10:45:00Z');
    expect(waktuRelatif('2026-08-17T10:00:00Z')).toBe('45 menit lalu');
  });

  it('menghitung dalam jam di bawah sehari', () => {
    padaSaat('2026-08-17T13:00:00Z');
    expect(waktuRelatif('2026-08-17T10:00:00Z')).toBe('3 jam lalu');
  });

  it('menyebut "kemarin" untuk sehari yang lalu', () => {
    padaSaat('2026-08-18T12:00:00Z');
    expect(waktuRelatif('2026-08-17T10:00:00Z')).toBe('kemarin');
  });

  it('menghitung dalam hari sampai sebulan', () => {
    padaSaat('2026-08-27T10:00:00Z');
    expect(waktuRelatif('2026-08-17T10:00:00Z')).toBe('10 hari lalu');
  });

  it('jatuh ke tanggal penuh untuk kejadian lebih dari sebulan lalu', () => {
    // "62 hari lalu" tidak membantu siapa pun; tanggalnya lebih berguna.
    padaSaat('2026-11-17T10:00:00Z');
    expect(waktuRelatif('2026-08-17T10:00:00Z')).toMatch(/2026/);
  });
});
