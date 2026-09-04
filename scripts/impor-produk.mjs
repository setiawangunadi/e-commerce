#!/usr/bin/env node
/**
 * Impor produk massal dari berkas JSON ke katalog.
 *
 * Dipakai untuk memindahkan katalog dari marketplace (mis. hasil ekspor
 * Shopee Seller Centre) ke toko sendiri. Sengaja lewat API admin, bukan tulis
 * langsung ke basis data, supaya seluruh validasi harga, SKU, berat, dan slug
 * yang sudah ada tetap berlaku — impor massal justru paling butuh penjagaan itu.
 *
 * Pakai:
 *   node scripts/impor-produk.mjs data/produk.json --merek=zyrabelle
 *   node scripts/impor-produk.mjs data/produk.json --merek=zyrabelle --terbit
 *   node scripts/impor-produk.mjs data/produk.json --merek=zyrabelle --uji
 *
 * Bentuk berkas: array objek. Yang wajib hanya nama, sku, harga, berat.
 *   [
 *     {
 *       "nama": "Dress Linen Lengan Panjang",
 *       "sku": "ZYR-DRS-001",
 *       "harga": 189000,
 *       "hargaCoret": 249000,
 *       "berat": 350,
 *       "deskripsi": "...",
 *       "deskripsiSingkat": "...",
 *       "stok": 12,
 *       "kategori": "pakaian-wanita",
 *       "gambar": ["https://.../1.jpg"],
 *       "linkShopee": "https://shopee.co.id/...",
 *       "varian": [{ "nama": "S", "sku": "ZYR-DRS-001-S", "stok": 4 }]
 *     }
 *   ]
 */

import { readFileSync } from 'node:fs';
import process from 'node:process';

const API = process.env.API_URL ?? 'http://localhost:4000/api/v1';
const EMAIL = process.env.ADMIN_EMAIL ?? 'admin@toko.local';
const SANDI = process.env.ADMIN_PASSWORD ?? 'admin12345';

const argumen = process.argv.slice(2);
const berkas = argumen.find((a) => !a.startsWith('--'));
const opsi = (nama) => argumen.find((a) => a.startsWith(`--${nama}=`))?.split('=')[1];
const punya = (nama) => argumen.includes(`--${nama}`);

const slugMerek = opsi('merek');
const ujiSaja = punya('uji');
const langsungTerbit = punya('terbit');

if (!berkas || !slugMerek) {
  console.error('Pakai: node scripts/impor-produk.mjs <berkas.json> --merek=<slug> [--terbit] [--uji]');
  process.exit(1);
}

async function panggil(metode, path, body, token) {
  const res = await fetch(`${API}${path}`, {
    method: metode,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const amplop = await res.json();
  if (!res.ok || amplop.error) {
    const rincian = Array.isArray(amplop.error?.details) ? ` (${amplop.error.details.join('; ')})` : '';
    throw new Error(`${amplop.error?.message ?? res.status}${rincian}`);
  }
  return amplop.data;
}

/** Angka dari "Rp 189.000", "189.000", atau 189000. */
function keAngka(nilai) {
  if (typeof nilai === 'number') return Math.round(nilai);
  if (typeof nilai !== 'string') return null;
  const bersih = nilai.replace(/[^0-9]/g, '');
  return bersih ? Number(bersih) : null;
}

const masuk = JSON.parse(readFileSync(berkas, 'utf8'));
if (!Array.isArray(masuk)) {
  console.error('Isi berkas harus berupa array produk.');
  process.exit(1);
}

const { accessToken } = await panggil('POST', '/auth/login', { email: EMAIL, password: SANDI });

const merek = (await panggil('GET', '/admin/merek', undefined, accessToken)).find(
  (m) => m.slug === slugMerek,
);
if (!merek) {
  console.error(`Merek "${slugMerek}" tidak ada. Buat dulu di /admin/merek.`);
  process.exit(1);
}

const kategori = await panggil('GET', '/admin/kategori', undefined, accessToken);
const kategoriPerSlug = new Map(kategori.map((k) => [k.slug, k.id]));

console.log(`Impor ${masuk.length} produk ke merek ${merek.nama}${ujiSaja ? ' (uji coba, tidak disimpan)' : ''}\n`);

let berhasil = 0;
const gagal = [];

for (const [i, p] of masuk.entries()) {
  const nomor = String(i + 1).padStart(3, ' ');
  const harga = keAngka(p.harga);
  const berat = keAngka(p.berat);

  // Berat wajib dan tidak boleh ditebak: ongkir dihitung darinya, dan menebak
  // di sini berarti mengirim tagihan ongkir yang salah ke pembeli.
  if (!p.nama || !p.sku || harga === null || !berat) {
    gagal.push({ nama: p.nama ?? '(tanpa nama)', sebab: 'nama, sku, harga, dan berat wajib ada' });
    console.log(`${nomor} ✗ ${p.nama ?? '(tanpa nama)'} — data wajib belum lengkap`);
    continue;
  }

  const muatan = {
    nama: p.nama,
    sku: p.sku,
    harga,
    berat,
    brandId: merek.id,
    status: langsungTerbit ? 'PUBLISHED' : 'DRAFT',
    ...(p.deskripsi ? { deskripsi: p.deskripsi } : {}),
    ...(p.deskripsiSingkat ? { deskripsiSingkat: String(p.deskripsiSingkat).slice(0, 300) } : {}),
    ...(keAngka(p.hargaCoret) ? { hargaCoret: keAngka(p.hargaCoret) } : {}),
    ...(p.stok !== undefined ? { stok: keAngka(p.stok) ?? 0 } : {}),
    ...(p.kategori && kategoriPerSlug.has(p.kategori)
      ? { categoryId: kategoriPerSlug.get(p.kategori) }
      : {}),
    ...(p.linkShopee ? { linkShopee: p.linkShopee } : {}),
    ...(p.linkTiktok ? { linkTiktok: p.linkTiktok } : {}),
    ...(Array.isArray(p.gambar) && p.gambar.length
      ? { gambar: p.gambar.slice(0, 10).map((url) => ({ url, alt: p.nama })) }
      : {}),
    ...(Array.isArray(p.varian) && p.varian.length
      ? {
          varian: p.varian.map((v, vi) => ({
            nama: v.nama,
            sku: v.sku ?? `${p.sku}-${vi + 1}`,
            stok: keAngka(v.stok) ?? 0,
            ...(keAngka(v.harga) ? { harga: keAngka(v.harga) } : {}),
          })),
        }
      : {}),
  };

  if (ujiSaja) {
    console.log(`${nomor} • ${p.nama} — Rp${harga.toLocaleString('id-ID')}, ${berat} g`);
    berhasil++;
    continue;
  }

  try {
    await panggil('POST', '/admin/produk', muatan, accessToken);
    console.log(`${nomor} ✓ ${p.nama}`);
    berhasil++;
  } catch (e) {
    gagal.push({ nama: p.nama, sebab: e.message });
    console.log(`${nomor} ✗ ${p.nama} — ${e.message}`);
  }
}

console.log(`\nSelesai: ${berhasil} berhasil, ${gagal.length} gagal.`);
if (gagal.length) {
  console.log('\nYang gagal:');
  for (const g of gagal) console.log(`  - ${g.nama}: ${g.sebab}`);
  process.exit(1);
}
if (!langsungTerbit && !ujiSaja) {
  console.log('Produk masuk sebagai DRAFT — periksa dulu di /admin/produk, lalu terbitkan.');
}
