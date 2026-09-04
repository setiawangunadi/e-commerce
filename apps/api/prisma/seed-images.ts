import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

/**
 * Membuat gambar placeholder SVG di folder uploads saat seeding.
 *
 * Alasan digenerate lokal, bukan memakai URL gambar dari internet: seed harus
 * jalan tanpa koneksi, dan `next/image` tidak perlu di-whitelist ke domain acak.
 * Saat produk asli diunggah lewat admin, berkas-berkas ini tidak dipakai lagi.
 */

/** `lebar` = rasio banner hero (1600x600), `persegi` = kartu produk/kategori. */
export type Bentuk = 'lebar' | 'persegi';

const PALET: [string, string][] = [
  ['#1e3a5f', '#4a7fb5'],
  ['#3d2b1f', '#8b6f47'],
  ['#1f3d2b', '#5a9367'],
  ['#4a1f3d', '#a5588b'],
  ['#3d3a1f', '#9a8f4a'],
  ['#2b1f3d', '#6f5a93'],
  ['#3d1f1f', '#a55858'],
  ['#1f3d3d', '#4a9393'],
];

function escapeXml(teks: string): string {
  return teks.replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!,
  );
}

/** Memecah teks jadi beberapa baris agar muat di lebar gambar. */
function bagiBaris(teks: string, maksPerBaris: number): string[] {
  const kata = teks.split(' ');
  const baris: string[] = [];
  let sekarang = '';

  for (const k of kata) {
    if ((sekarang + ' ' + k).trim().length > maksPerBaris && sekarang) {
      baris.push(sekarang.trim());
      sekarang = k;
    } else {
      sekarang = `${sekarang} ${k}`.trim();
    }
  }
  if (sekarang) baris.push(sekarang);
  return baris.slice(0, 3);
}

function buatSvg(
  judul: string,
  subjudul: string,
  indeksWarna: number,
  bentuk: Bentuk = 'persegi',
): string {
  const [gelap, terang] = PALET[indeksWarna % PALET.length]!;
  const lebar = bentuk === 'lebar' ? 1600 : 800;
  const tinggi = bentuk === 'lebar' ? 600 : 800;

  // Banner memakai teks rata kiri seperti hero sungguhan; kartu produk rata tengah.
  const rataKiri = bentuk === 'lebar';
  const x = rataKiri ? 90 : lebar / 2;
  const anchor = rataKiri ? 'start' : 'middle';
  const ukuranJudul = rataKiri ? 62 : 42;
  const jarakBaris = rataKiri ? 74 : 52;

  const baris = bagiBaris(judul, 18);
  const mulaiY = tinggi / 2 - (baris.length - 1) * (jarakBaris / 2);

  // Banner sengaja TIDAK memuat teks di dalam gambarnya: judul & subjudul
  // dirender sebagai HTML di atas gambar oleh slider. Kalau teksnya ikut
  // dibakar ke gambar, keduanya akan tumpang tindih. Banner asli yang diunggah
  // admin juga semestinya berupa foto polos tanpa teks.
  const teksJudul = rataKiri
    ? `<text x="${lebar - 40}" y="${tinggi - 28}" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="20" fill="#ffffff" opacity="0.35" text-anchor="end">contoh gambar banner</text>`
    : baris
        .map(
          (b, i) =>
            `<text x="${x}" y="${mulaiY + i * jarakBaris}" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="${ukuranJudul}" font-weight="600" fill="#ffffff" text-anchor="${anchor}">${escapeXml(b)}</text>`,
        )
        .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lebar}" height="${tinggi}" viewBox="0 0 ${lebar} ${tinggi}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${terang}"/>
      <stop offset="100%" stop-color="${gelap}"/>
    </linearGradient>
  </defs>
  <rect width="${lebar}" height="${tinggi}" fill="url(#g)"/>
  <circle cx="${lebar * 0.8}" cy="${tinggi * 0.21}" r="${tinggi * 0.28}" fill="#ffffff" opacity="0.06"/>
  <circle cx="${lebar * 0.19}" cy="${tinggi * 0.81}" r="${tinggi * 0.23}" fill="#ffffff" opacity="0.05"/>
  ${teksJudul}
  ${
    rataKiri
      ? ''
      : `<text x="${x}" y="${mulaiY + baris.length * jarakBaris + 14}" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="22" fill="#ffffff" opacity="0.75" text-anchor="${anchor}">${escapeXml(subjudul)}</text>`
  }
</svg>`;
}

export async function tulisGambarPlaceholder(
  berkas: { nama: string; judul: string; subjudul: string; bentuk?: Bentuk }[],
  uploadDir: string,
): Promise<void> {
  const dir = resolve(uploadDir, 'seed');
  await mkdir(dir, { recursive: true });

  await Promise.all(
    berkas.map((b, i) =>
      writeFile(join(dir, `${b.nama}.svg`), buatSvg(b.judul, b.subjudul, i, b.bentuk)),
    ),
  );
}
