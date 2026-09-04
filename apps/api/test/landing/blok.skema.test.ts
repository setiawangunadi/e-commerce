import { describe, expect, it } from 'vitest';
import { JENIS_BLOK, validasiKontenBlok } from '../../src/landing/blok.skema';

/** Aksi tombol yang valid, dipakai sebagai dasar di banyak test. */
const aksiTautan = { tipe: 'tautan', url: '/produk' };
const tombolSah = { teks: 'Beli Sekarang', aksi: aksiTautan };

describe('validasiKontenBlok — jenis blok', () => {
  it('mengenali kedelapan jenis blok', () => {
    expect(JENIS_BLOK).toEqual([
      'HERO',
      'PRODUK',
      'KEUNGGULAN',
      'TESTIMONI',
      'FAQ',
      'HITUNG_MUNDUR',
      'CTA',
      'TEKS',
    ]);
  });

  it('menolak jenis blok yang tidak dikenal', () => {
    const hasil = validasiKontenBlok('SCRIPT' as never, {});

    expect(hasil.ok).toBe(false);
    expect(hasil.ok === false && hasil.pesan).toMatch(/tidak dikenal/i);
  });
});

describe('blok HERO', () => {
  it('menerima isi minimal', () => {
    const hasil = validasiKontenBlok('HERO', { judul: 'Diskon Akhir Tahun' });

    expect(hasil.ok).toBe(true);
    expect(hasil.ok && hasil.data.judul).toBe('Diskon Akhir Tahun');
  });

  it('mewajibkan judul, dengan pesan yang bisa dibaca admin', () => {
    // Form admin selalu mengirim kolomnya (mungkin kosong), jadi inilah jalur
    // yang benar-benar dilihat orang saat menekan Simpan.
    const hasil = validasiKontenBlok('HERO', { judul: '   ' });

    expect(hasil.ok).toBe(false);
    expect(hasil.ok === false && hasil.pesan).toMatch(/judul hero wajib/i);
  });

  it('tetap menolak bila kolom judul sama sekali tidak dikirim', () => {
    // Lewat API langsung, kolomnya bisa hilang sepenuhnya. Pesannya jadi pesan
    // bawaan Zod, tapi yang penting blok itu tidak pernah tersimpan.
    const hasil = validasiKontenBlok('HERO', { subjudul: 'tanpa judul' });

    expect(hasil.ok).toBe(false);
  });

  it('mengubah teks opsional yang kosong jadi null, bukan string kosong', () => {
    const hasil = validasiKontenBlok('HERO', { judul: 'X', subjudul: '   ' });

    expect(hasil.ok && hasil.data.subjudul).toBeNull();
  });

  it('membatasi jumlah poin singkat', () => {
    const hasil = validasiKontenBlok('HERO', { judul: 'X', poin: ['a', 'b', 'c', 'd', 'e'] });

    expect(hasil.ok).toBe(false);
  });

  it('memotong judul yang melebihi batas panjang', () => {
    const hasil = validasiKontenBlok('HERO', { judul: 'K'.repeat(200) });

    expect(hasil.ok).toBe(false);
  });
});

describe('keamanan URL gambar', () => {
  it.each([
    ['https://cdn.contoh.id/a.jpg', true],
    ['http://cdn.contoh.id/a.jpg', true],
    ['/uploads/a.jpg', true],
    ['javascript:alert(1)', false],
    ['data:text/html;base64,PHNjcmlwdD4=', false],
    ['vbscript:msgbox(1)', false],
  ])('%s → diterima: %s', (url, diterima) => {
    // Membatasi skema URL menutup penyisipan skrip lewat atribut src.
    const hasil = validasiKontenBlok('HERO', { judul: 'X', gambarUrl: url });

    expect(hasil.ok).toBe(diterima);
  });

  it('mengubah URL gambar kosong jadi null', () => {
    const hasil = validasiKontenBlok('HERO', { judul: 'X', gambarUrl: '' });

    expect(hasil.ok && hasil.data.gambarUrl).toBeNull();
  });
});

describe('keamanan tautan tombol', () => {
  it('menerima path internal', () => {
    const hasil = validasiKontenBlok('CTA', {
      judul: 'Ambil Sekarang',
      tombol: { teks: 'Beli', aksi: { tipe: 'tautan', url: '/produk/kemeja' } },
    });

    expect(hasil.ok).toBe(true);
  });

  it.each([
    'https://situs-lain.example/phishing',
    'http://situs-lain.example',
    '//situs-lain.example',
    'javascript:alert(1)',
  ])('menolak tautan keluar: %s', (url) => {
    // Landing page adalah tujuan iklan berbayar; tautan keluar sembarang di
    // sana adalah jalan pintas phishing bila akun admin dibajak.
    const hasil = validasiKontenBlok('CTA', {
      judul: 'X',
      tombol: { teks: 'Beli', aksi: { tipe: 'tautan', url } },
    });

    expect(hasil.ok).toBe(false);
  });

  it('mewajibkan tautan diisi untuk tombol bertipe tautan', () => {
    const hasil = validasiKontenBlok('CTA', {
      judul: 'X',
      tombol: { teks: 'Beli', aksi: { tipe: 'tautan' } },
    });

    expect(hasil.ok).toBe(false);
    expect(hasil.ok === false && hasil.pesan).toMatch(/tautan tujuan/i);
  });

  it('mewajibkan produk dipilih untuk tombol keranjang & checkout', () => {
    for (const tipe of ['keranjang', 'checkout']) {
      const hasil = validasiKontenBlok('CTA', {
        judul: 'X',
        tombol: { teks: 'Beli', aksi: { tipe } },
      });

      expect(hasil.ok).toBe(false);
      expect(hasil.ok === false && hasil.pesan).toMatch(/pilih produk/i);
    }
  });

  it('menerima tombol checkout yang produknya sudah dipilih', () => {
    const hasil = validasiKontenBlok('CTA', {
      judul: 'X',
      tombol: { teks: 'Beli', aksi: { tipe: 'checkout', produkId: 'produk-1', jumlah: 2 } },
    });

    expect(hasil.ok).toBe(true);
  });

  it('membatasi jumlah pembelian dari tombol CTA', () => {
    const hasil = validasiKontenBlok('CTA', {
      judul: 'X',
      tombol: { teks: 'Beli', aksi: { tipe: 'checkout', produkId: 'p1', jumlah: 100 } },
    });

    expect(hasil.ok).toBe(false);
  });

  it('mewajibkan teks tombol', () => {
    const hasil = validasiKontenBlok('CTA', { judul: 'X', tombol: { teks: '', aksi: aksiTautan } });

    expect(hasil.ok).toBe(false);
    expect(hasil.ok === false && hasil.pesan).toMatch(/teks tombol/i);
  });
});

describe('blok PRODUK', () => {
  it('mewajibkan minimal satu produk', () => {
    const hasil = validasiKontenBlok('PRODUK', { produkIds: [] });

    expect(hasil.ok).toBe(false);
    expect(hasil.ok === false && hasil.pesan).toMatch(/minimal satu produk/i);
  });

  it('membatasi jumlah produk per blok', () => {
    const hasil = validasiKontenBlok('PRODUK', {
      produkIds: Array.from({ length: 13 }, (_, i) => `p${i}`),
    });

    expect(hasil.ok).toBe(false);
  });

  it('menampilkan tombol beli secara bawaan', () => {
    const hasil = validasiKontenBlok('PRODUK', { produkIds: ['p1'] });

    expect(hasil.ok && hasil.data.tampilkanTombol).toBe(true);
  });
});

describe('blok KEUNGGULAN, TESTIMONI, dan FAQ', () => {
  it('mewajibkan minimal satu keunggulan', () => {
    expect(validasiKontenBlok('KEUNGGULAN', { items: [] }).ok).toBe(false);
  });

  it('membatasi ikon ke daftar yang tersedia', () => {
    const sah = validasiKontenBlok('KEUNGGULAN', {
      items: [{ ikon: 'truk', judul: 'Gratis Ongkir' }],
    });
    const tidakSah = validasiKontenBlok('KEUNGGULAN', {
      items: [{ ikon: 'unicorn', judul: 'Gratis Ongkir' }],
    });

    expect(sah.ok).toBe(true);
    expect(tidakSah.ok).toBe(false);
  });

  it('memakai ikon centang sebagai bawaan', () => {
    const hasil = validasiKontenBlok('KEUNGGULAN', { items: [{ judul: 'Garansi' }] });

    expect(hasil.ok && (hasil.data.items as { ikon: string }[])[0]!.ikon).toBe('centang');
  });

  it('membatasi rating testimoni di 1–5 bintang', () => {
    const dasar = { nama: 'Budi', teks: 'Bagus sekali' };

    expect(validasiKontenBlok('TESTIMONI', { items: [{ ...dasar, rating: 5 }] }).ok).toBe(true);
    expect(validasiKontenBlok('TESTIMONI', { items: [{ ...dasar, rating: 6 }] }).ok).toBe(false);
    expect(validasiKontenBlok('TESTIMONI', { items: [{ ...dasar, rating: 0 }] }).ok).toBe(false);
  });

  it('memakai 5 bintang sebagai bawaan testimoni', () => {
    const hasil = validasiKontenBlok('TESTIMONI', {
      items: [{ nama: 'Budi', teks: 'Bagus' }],
    });

    expect(hasil.ok && (hasil.data.items as { rating: number }[])[0]!.rating).toBe(5);
  });

  it('mewajibkan pertanyaan dan jawaban terisi di FAQ', () => {
    expect(validasiKontenBlok('FAQ', { items: [{ tanya: 'Kapan sampai?' }] }).ok).toBe(false);
    expect(
      validasiKontenBlok('FAQ', { items: [{ tanya: 'Kapan sampai?', jawab: '2-3 hari' }] }).ok,
    ).toBe(true);
  });
});

describe('blok HITUNG_MUNDUR', () => {
  it('menerima waktu berakhir ISO-8601', () => {
    const hasil = validasiKontenBlok('HITUNG_MUNDUR', {
      judul: 'Promo berakhir dalam',
      berakhirPada: '2026-12-31T23:59:59Z',
    });

    expect(hasil.ok).toBe(true);
  });

  it('menolak waktu yang tidak bisa dibaca', () => {
    const hasil = validasiKontenBlok('HITUNG_MUNDUR', {
      judul: 'X',
      berakhirPada: 'besok sore',
    });

    expect(hasil.ok).toBe(false);
    expect(hasil.ok === false && hasil.pesan).toMatch(/waktu berakhir/i);
  });
});

describe('blok TEKS', () => {
  it('menerima paragraf biasa', () => {
    const hasil = validasiKontenBlok('TEKS', { isi: 'Produk ini dibuat di Bandung.' });

    expect(hasil.ok).toBe(true);
  });

  it('mewajibkan isi terisi', () => {
    expect(validasiKontenBlok('TEKS', { isi: '   ' }).ok).toBe(false);
  });

  it('menyimpan markup sebagai teks biasa, karena perendernya tidak pernah memakai innerHTML', () => {
    // Skema tidak menolak tanda kurung sudut; yang menjaga dari XSS adalah
    // keputusan merender seluruh isi blok sebagai teks, bukan sebagai markup.
    const hasil = validasiKontenBlok('TEKS', { isi: '<script>alert(1)</script>' });

    expect(hasil.ok).toBe(true);
    expect(hasil.ok && hasil.data.isi).toBe('<script>alert(1)</script>');
  });
});

describe('pesan galat', () => {
  it('menyebut lokasi field yang bermasalah supaya admin tahu apa yang harus diperbaiki', () => {
    const hasil = validasiKontenBlok('KEUNGGULAN', {
      items: [{ judul: 'Sah' }, { judul: '' }],
    });

    expect(hasil.ok).toBe(false);
    expect(hasil.ok === false && hasil.pesan).toMatch(/items\.1\.judul/);
  });

  it('memperlakukan konten kosong sama seperti objek kosong', () => {
    expect(validasiKontenBlok('TEKS', null).ok).toBe(false);
    expect(validasiKontenBlok('TEKS', undefined).ok).toBe(false);
  });

  it('menerima blok yang seluruh isinya opsional walau kontennya kosong', () => {
    const hasil = validasiKontenBlok('CTA', { judul: 'X', tombol: tombolSah });

    expect(hasil.ok).toBe(true);
  });
});
