import dataWilayah from './data/wilayah.json';

/**
 * Data wilayah Indonesia 3 tingkat (provinsi → kota/kabupaten → kecamatan),
 * berasal dari dump Kemendagri. Dipakai untuk dropdown alamat di checkout dan
 * untuk menentukan zona tarif ongkir cadangan.
 *
 * Kode berjenjang: "32" provinsi, "32.04" kota/kabupaten, "32.04.05" kecamatan.
 * Regenerasi datanya dengan `node scripts/olah-wilayah.mjs`.
 */

export type Zona = 1 | 2 | 3 | 4 | 5;

export interface Wilayah {
  kode: string;
  nama: string;
}

interface DataWilayah {
  provinsi: Wilayah[];
  kota: Wilayah[];
  kecamatan: Wilayah[];
}

const data = dataWilayah as DataWilayah;

/**
 * Zona ongkir per KODE provinsi, bukan namanya.
 *
 * Nama provinsi punya beberapa ejaan resmi ("DKI Jakarta" vs "Daerah Khusus
 * Ibukota Jakarta") — memetakan lewat kode membuat tarif tidak pernah salah
 * zona hanya karena beda penulisan.
 */
const ZONA_PER_KODE: Record<string, Zona> = {
  // Zona 1 — Jabodetabek & sekitarnya
  '31': 1, // DKI Jakarta
  '32': 1, // Jawa Barat
  '36': 1, // Banten

  // Zona 2 — Jawa lainnya
  '33': 2, // Jawa Tengah
  '34': 2, // DI Yogyakarta
  '35': 2, // Jawa Timur

  // Zona 3 — Sumatera, Bali, NTB
  '11': 3, '12': 3, '13': 3, '14': 3, '15': 3, '16': 3, '17': 3, '18': 3,
  '19': 3, '21': 3, '51': 3, '52': 3,

  // Zona 4 — Kalimantan, Sulawesi, NTT
  '53': 4, '61': 4, '62': 4, '63': 4, '64': 4, '65': 4,
  '71': 4, '72': 4, '73': 4, '74': 4, '75': 4, '76': 4,

  // Zona 5 — Maluku & Papua
  '81': 5, '82': 5, '91': 5, '92': 5, '93': 5, '94': 5, '95': 5, '96': 5,
};

const petaNamaKeKode = new Map(data.provinsi.map((p) => [normalkan(p.nama), p.kode]));

// Ejaan lain yang mungkin sudah tersimpan di pesanan lama atau dikirim client.
const ALIAS: Record<string, string> = {
  'dki jakarta': '31',
  jakarta: '31',
  'di yogyakarta': '34',
  yogyakarta: '34',
  diy: '34',
};

function normalkan(nama: string): string {
  return nama.trim().toLowerCase().replace(/\s+/g, ' ');
}

function kodeProvinsi(nama: string): string | null {
  const kunci = normalkan(nama);
  return petaNamaKeKode.get(kunci) ?? ALIAS[kunci] ?? null;
}

// --- Daftar bertingkat untuk dropdown ---------------------------------------

export function daftarProvinsi(): Wilayah[] {
  return data.provinsi;
}

/** Kota/kabupaten di bawah satu provinsi. Terima kode ("32") atau namanya. */
export function daftarKota(provinsi: string): Wilayah[] {
  const kode = /^\d{2}$/.test(provinsi) ? provinsi : kodeProvinsi(provinsi);
  if (!kode) return [];
  return data.kota.filter((k) => k.kode.startsWith(`${kode}.`));
}

/** Kecamatan di bawah satu kota/kabupaten. Terima kode ("32.04") atau namanya. */
export function daftarKecamatan(provinsi: string, kota: string): Wilayah[] {
  const kodeKota = /^\d{2}\.\d{2}$/.test(kota)
    ? kota
    : (daftarKota(provinsi).find((k) => normalkan(k.nama) === normalkan(kota))?.kode ?? null);

  if (!kodeKota) return [];
  return data.kecamatan.filter((k) => k.kode.startsWith(`${kodeKota}.`));
}

// --- Dipakai perhitungan ongkir ---------------------------------------------

/** Zona 3 dipakai sebagai default aman bila provinsi tidak dikenali. */
export function zonaProvinsi(nama: string): Zona {
  const kode = kodeProvinsi(nama);
  return (kode && ZONA_PER_KODE[kode]) || 3;
}

export function provinsiValid(nama: string): boolean {
  return kodeProvinsi(nama) !== null;
}

/** Memastikan kota benar-benar ada di provinsi yang dipilih. */
export function kotaValid(provinsi: string, kota: string): boolean {
  const normal = normalkan(kota);
  return daftarKota(provinsi).some((k) => normalkan(k.nama) === normal);
}

/** Kecamatan opsional — bila diisi, harus cocok dengan kotanya. */
export function kecamatanValid(provinsi: string, kota: string, kecamatan: string): boolean {
  const normal = normalkan(kecamatan);
  return daftarKecamatan(provinsi, kota).some((k) => normalkan(k.nama) === normal);
}
