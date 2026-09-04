import { describe, expect, it } from 'vitest';
import { buatSlug } from '../../src/common/slug';

describe('buatSlug', () => {
  it('mengubah judul produk menjadi slug URL', () => {
    expect(buatSlug('Kemeja Flanel Lengan Panjang')).toBe('kemeja-flanel-lengan-panjang');
  });

  it('membuang diakritik supaya slug tetap ASCII', () => {
    expect(buatSlug('Café Latté')).toBe('cafe-latte');
  });

  it('menggabungkan tanda baca dan spasi beruntun jadi satu tanda hubung', () => {
    expect(buatSlug('Tas  Ransel — Kanvas 20L!!')).toBe('tas-ransel-kanvas-20l');
  });

  it('tidak menyisakan tanda hubung di awal atau akhir', () => {
    expect(buatSlug('  --- Sepatu ---  ')).toBe('sepatu');
  });

  it('mempertahankan angka', () => {
    expect(buatSlug('Kaos Katun Combed 30s')).toBe('kaos-katun-combed-30s');
  });

  it('mengembalikan string kosong bila tidak ada karakter yang bisa dipakai', () => {
    // Pemanggilnya (slugUnik di service produk/kategori) mengandalkan ini untuk
    // jatuh ke slug cadangan seperti "produk".
    expect(buatSlug('!!! ???')).toBe('');
    expect(buatSlug('')).toBe('');
  });

  it('memotong slug yang sangat panjang di 120 karakter', () => {
    const panjang = 'a'.repeat(200);
    expect(buatSlug(panjang)).toHaveLength(120);
  });
});
