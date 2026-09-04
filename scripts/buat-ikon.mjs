#!/usr/bin/env node
/**
 * Membangkitkan seluruh ikon aplikasi dari satu berkas logo.
 *
 * Sumbernya `apps/web/brand/logo.png` bila ada, kalau tidak jatuh ke
 * `apps/web/brand/logo.svg`. Jadi mengganti logo cukup menaruh berkas PNG di
 * sana lalu menjalankan ulang skrip ini — tidak ada ukuran yang perlu disunting
 * satu per satu, dan tidak ada ikon yang tertinggal di versi lama.
 *
 * Pakai: npm run buat-ikon
 */

import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const AKAR = path.resolve(import.meta.dirname, '..');
const WEB = path.join(AKAR, 'apps/web');
const MEREK = path.join(WEB, 'brand');
const APP = path.join(WEB, 'src/app');
const PUBLIK = path.join(WEB, 'public');

/** Kuning logo — dipakai melatari ikon iOS yang tidak boleh transparan. */
const KUNING = '#f5b301';

const png = path.join(MEREK, 'logo.png');
const svg = path.join(MEREK, 'logo.svg');
const sumber = existsSync(png) ? png : svg;

if (!existsSync(sumber)) {
  console.error(`Tidak ada logo di ${MEREK}. Taruh logo.png (atau logo.svg) di sana.`);
  process.exit(1);
}

console.log(`Sumber: ${path.relative(AKAR, sumber)}\n`);

/** density hanya berpengaruh untuk SVG, tapi aman diberikan ke keduanya. */
const muat = () => sharp(sumber, { density: 512 });

await mkdir(PUBLIK, { recursive: true });

const keluaran = [
  // Ikon web biasa. Transparansi dipertahankan supaya sudut lingkaran tidak
  // menabrak latar gelap di tab peramban bertema gelap.
  { file: path.join(APP, 'icon.png'), ukuran: 512, latar: null },
  { file: path.join(PUBLIK, 'ikon-192.png'), ukuran: 192, latar: null },
  { file: path.join(PUBLIK, 'ikon-512.png'), ukuran: 512, latar: null },

  // iOS memberi masker sudut membulat sendiri dan tidak mendukung transparansi:
  // tanpa latar penuh, sudutnya jadi hitam di layar utama.
  { file: path.join(APP, 'apple-icon.png'), ukuran: 180, latar: KUNING },

  // Versi "maskable" untuk Android: ikon diperkecil ke area aman 80% supaya
  // masker bulat/kotak-membulat tidak memotong hurufnya.
  { file: path.join(PUBLIK, 'ikon-maskable-512.png'), ukuran: 512, latar: KUNING, aman: 0.8 },
];

for (const { file, ukuran, latar, aman } of keluaran) {
  const isi = Math.round(ukuran * (aman ?? 1));
  const tepi = Math.round((ukuran - isi) / 2);

  let gambar = muat().resize(isi, isi, {
    fit: 'contain',
    background: latar ?? { r: 0, g: 0, b: 0, alpha: 0 },
  });

  if (tepi > 0 || latar) {
    gambar = gambar.extend({
      top: tepi,
      bottom: ukuran - isi - tepi,
      left: tepi,
      right: ukuran - isi - tepi,
      background: latar ?? { r: 0, g: 0, b: 0, alpha: 0 },
    });
  }

  if (latar) gambar = gambar.flatten({ background: latar });

  const info = await gambar.png().toFile(file);
  console.log(`  ${path.relative(AKAR, file).padEnd(46)} ${info.width}×${info.height}`);
}

console.log('\nSelesai. Jalankan ulang dev server bila ikon lama masih ter-cache.');
