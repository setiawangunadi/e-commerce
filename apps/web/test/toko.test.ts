import { describe, expect, it } from 'vitest';
import { TOKO, tautanWhatsApp } from '@/lib/toko';

describe('identitas toko', () => {
  it('punya nilai bawaan supaya halaman tetap terender tanpa .env.local', () => {
    expect(TOKO.nama).toBeTruthy();
    expect(TOKO.tagline).toBeTruthy();
    expect(TOKO.whatsapp).toBeTruthy();
    expect(TOKO.url).toBeTruthy();
  });

  it('membuang garis miring di akhir URL situs', () => {
    // URL kanonik dan structured data akan ganda garis miring tanpa ini.
    expect(TOKO.url.endsWith('/')).toBe(false);
  });
});

describe('tautanWhatsApp', () => {
  it('menyusun tautan wa.me dengan nomor toko', () => {
    expect(tautanWhatsApp('Halo')).toBe(`https://wa.me/${TOKO.whatsapp}?text=Halo`);
  });

  it('meng-encode pesan supaya spasi dan simbol tidak merusak URL', () => {
    const tautan = tautanWhatsApp('Halo, saya mau tanya soal pesanan #INV-001');

    expect(tautan).toContain('%20');
    expect(tautan).toContain('%23INV-001');
    expect(() => new URL(tautan)).not.toThrow();
  });

  it('menangani pesan berisi baris baru dan ampersand', () => {
    const tautan = tautanWhatsApp('Produk A & B\nJumlah: 2');

    expect(tautan).not.toContain('\n');
    expect(tautan).not.toMatch(/&(?!amp)/); // tidak ada & mentah yang jadi parameter baru
  });
});
