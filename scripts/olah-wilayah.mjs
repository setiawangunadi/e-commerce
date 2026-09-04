/**
 * Mengubah dump SQL wilayah Kemendagri jadi JSON ringkas 3 tingkat.
 *
 * Tingkat desa/kelurahan dibuang — checkout hanya butuh sampai kecamatan,
 * dan membuangnya memangkas datanya lebih dari 90%.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const sql = readFileSync('wilayah.sql', 'utf8');

// Baris data berbentuk: ('11.01.02','Nama Wilayah'),
const baris = [...sql.matchAll(/\('([\d.]+)','((?:[^']|'')*)'\)/g)].map((m) => ({
  kode: m[1],
  nama: m[2].replace(/''/g, "'"),
}));

const provinsi = [];
const kota = [];
const kecamatan = [];

for (const b of baris) {
  const tingkat = b.kode.split('.').length;
  if (tingkat === 1) provinsi.push(b);
  else if (tingkat === 2) kota.push(b);
  else if (tingkat === 3) kecamatan.push(b);
}

// Nama provinsi dari sumber ini huruf besar semua di sebagian rilis — dirapikan
// supaya tampil wajar di dropdown.
const rapikan = (s) =>
  s
    // Sumbernya mengandung spasi berlebih di beberapa baris, mis.
    // "Kota Administrasi Jakarta Utara " — dibersihkan supaya nama yang
    // tersimpan di pesanan tidak membawa spasi liar.
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b([a-z])/g, (c) => c.toUpperCase())
    .replace(/\bDki\b/g, 'DKI')
    .replace(/\bDi\b/g, 'DI')
    .replace(/\bKab\.\s*/g, 'Kabupaten ');

const hasil = {
  provinsi: provinsi.map((p) => ({ kode: p.kode, nama: rapikan(p.nama) })),
  kota: kota.map((k) => ({ kode: k.kode, nama: rapikan(k.nama) })),
  kecamatan: kecamatan.map((k) => ({ kode: k.kode, nama: rapikan(k.nama) })),
};

writeFileSync('wilayah.json', JSON.stringify(hasil));

const ukuran = (JSON.stringify(hasil).length / 1024 / 1024).toFixed(2);
console.log(`provinsi  : ${hasil.provinsi.length}`);
console.log(`kota/kab  : ${hasil.kota.length}`);
console.log(`kecamatan : ${hasil.kecamatan.length}`);
console.log(`ukuran    : ${ukuran} MB`);
console.log('\ncontoh:');
console.log(' ', hasil.provinsi.slice(0, 3).map((p) => `${p.kode} ${p.nama}`).join(' | '));
console.log(' ', hasil.kota.filter((k) => k.kode.startsWith('32.')).slice(0, 3).map((k) => `${k.kode} ${k.nama}`).join(' | '));
console.log(' ', hasil.kecamatan.filter((k) => k.kode.startsWith('32.04.')).slice(0, 3).map((k) => `${k.kode} ${k.nama}`).join(' | '));
