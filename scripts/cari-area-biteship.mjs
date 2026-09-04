#!/usr/bin/env node
/**
 * Mencari Area ID Biteship untuk dipakai sebagai titik asal pengiriman.
 *
 * Biteship tidak menampilkan daftar Area ID di dashboard — nilainya hanya bisa
 * didapat lewat API pencarian wilayah. Skrip ini membungkus panggilan itu
 * supaya cukup dijalankan sekali saat setup gudang.
 *
 * Pakai:
 *   npm run cari-area -- "Bojongsoang Bandung"
 *   npm run cari-area -- "40288"
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const kunci = ambilApiKey();
const kataKunci = process.argv.slice(2).join(' ').trim();

if (!kataKunci) {
  console.error('Sertakan kata kunci wilayah, contoh:\n  npm run cari-area -- "Bojongsoang Bandung"');
  process.exit(1);
}

const base = (prosesEnv('BITESHIP_BASE_URL') || 'https://api.biteship.com').replace(/\/$/, '');
const url = new URL(`${base}/v1/maps/areas`);
url.searchParams.set('countries', 'ID');
url.searchParams.set('input', kataKunci);
url.searchParams.set('type', 'single');

const res = await fetch(url, {
  headers: { Authorization: kunci, Accept: 'application/json' },
  signal: AbortSignal.timeout(15_000),
});

const data = await res.json().catch(() => null);

if (!res.ok || !data || data.success === false) {
  console.error(`Biteship membalas ${res.status}: ${data?.error ?? 'tidak diketahui'}`);
  if (res.status === 401) {
    console.error('\nApi key ditolak. Pastikan BITESHIP_API_KEY di apps/api/.env sudah benar.');
  }
  process.exit(1);
}

const areas = data.areas ?? [];
if (areas.length === 0) {
  console.log(`Tidak ada wilayah yang cocok dengan "${kataKunci}".`);
  console.log('Coba kata kunci lain, misalnya nama kecamatan atau kode pos saja.');
  process.exit(0);
}

console.log(`\n${areas.length} wilayah cocok dengan "${kataKunci}":\n`);

for (const a of areas.slice(0, 15)) {
  const bagian = [
    a.administrative_division_level_3_name, // kecamatan
    a.administrative_division_level_2_name, // kota/kabupaten
    a.administrative_division_level_1_name, // provinsi
  ].filter(Boolean);

  console.log(`  ${a.id}`);
  console.log(`    ${bagian.join(', ')}${a.postal_code ? ` — ${a.postal_code}` : ''}`);
  console.log('');
}

console.log('Salin salah satu id di atas ke apps/api/.env:\n');
console.log(`  GUDANG_AREA_ID="${areas[0].id}"\n`);
console.log('Lalu jalankan ulang API — .env tidak diawasi nest --watch.\n');

// ---------------------------------------------------------------------------

function prosesEnv(nama) {
  const isi = bacaEnv();
  const cocok = isi.match(new RegExp(`^${nama}\\s*=\\s*"?([^"\\n]*)"?`, 'm'));
  return cocok?.[1]?.trim() ?? '';
}

function bacaEnv() {
  try {
    return readFileSync(resolve(process.cwd(), 'apps/api/.env'), 'utf8');
  } catch {
    return '';
  }
}

function ambilApiKey() {
  const kunci = process.env.BITESHIP_API_KEY?.trim() || prosesEnv('BITESHIP_API_KEY');
  if (!kunci) {
    console.error(
      'BITESHIP_API_KEY belum diisi di apps/api/.env.\n' +
        'Ambil dulu dari dashboard Biteship, lalu jalankan perintah ini lagi.',
    );
    process.exit(1);
  }
  return kunci;
}
