import type { ProductStatus } from '../src/generated/prisma/enums.ts';

export interface SeedVariant {
  nama: string;
  sku: string;
  stok: number;
  harga?: number;
}

export interface SeedProduct {
  nama: string;
  sku: string;
  kategori: string; // slug kategori
  deskripsiSingkat: string;
  deskripsi: string;
  brand: string;
  harga: number;
  hargaCoret?: number;
  hpp: number;
  berat: number; // gram
  panjang?: number;
  lebar?: number;
  tinggi?: number;
  stok?: number;
  status?: ProductStatus;
  unggulan?: boolean;
  linkShopee?: string;
  linkTiktok?: string;
  varian?: SeedVariant[];
}

export interface SeedBanner {
  judul: string;
  subjudul: string;
  teksTombol: string;
  tautanTombol: string;
  urutan: number;
}

export const BANNER: SeedBanner[] = [
  {
    judul: 'Koleksi Harian SRN Cullezione',
    subjudul: 'Bahan pilihan, dijahit rapi, dikirim langsung dari gudang kami',
    teksTombol: 'Mulai Belanja',
    tautanTombol: '/produk',
    urutan: 1,
  },
  {
    judul: 'Gratis Ongkir di Atas Rp300.000',
    subjudul: 'Berlaku untuk pengiriman reguler ke seluruh Indonesia',
    teksTombol: 'Lihat Semua Produk',
    tautanTombol: '/produk',
    urutan: 2,
  },
  {
    judul: 'Tas & Dompet Kulit Asli',
    subjudul: 'Kulit sapi full-grain yang makin bagus seiring pemakaian',
    teksTombol: 'Lihat Koleksi',
    tautanTombol: '/produk?kategori=tas-dompet',
    urutan: 3,
  },
];

export const KATEGORI = [
  {
    nama: 'Fashion',
    slug: 'fashion',
    deskripsi: 'Pakaian, tas, sepatu, dan aksesori untuk keseharian.',
    urutan: 0,
  },
  {
    nama: 'Pakaian Pria',
    slug: 'pakaian-pria',
    induk: 'fashion',
    deskripsi: 'Kemeja, kaos, dan celana untuk keseharian maupun acara santai.',
    urutan: 1,
  },
  {
    nama: 'Pakaian Wanita',
    slug: 'pakaian-wanita',
    induk: 'fashion',
    deskripsi: 'Blouse, rok, dan outer dengan bahan adem dan nyaman dipakai harian.',
    urutan: 2,
  },
  {
    nama: 'Tas & Dompet',
    slug: 'tas-dompet',
    induk: 'fashion',
    deskripsi: 'Tas ransel, tote bag, dan dompet kulit untuk kerja maupun jalan-jalan.',
    urutan: 3,
  },
  {
    nama: 'Sepatu & Sandal',
    slug: 'sepatu-sandal',
    induk: 'fashion',
    deskripsi: 'Sneakers, sandal kulit, dan alas kaki nyaman untuk aktivitas harian.',
    urutan: 4,
  },
  {
    nama: 'Aksesoris',
    slug: 'aksesoris',
    induk: 'fashion',
    deskripsi: 'Topi, ikat pinggang, dan kacamata untuk melengkapi penampilan.',
    urutan: 5,
  },
];

const UKURAN_BAJU = ['S', 'M', 'L', 'XL'];

function varianUkuran(prefixSku: string, stokPerUkuran: number[]): SeedVariant[] {
  return UKURAN_BAJU.map((u, i) => ({
    nama: `Ukuran ${u}`,
    sku: `${prefixSku}-${u}`,
    stok: stokPerUkuran[i] ?? 0,
  }));
}

export const PRODUK: SeedProduct[] = [
  {
    nama: 'Kemeja Flanel Lengan Panjang',
    sku: 'NSK-KMJ-001',
    kategori: 'pakaian-pria',
    brand: 'SRN Cullezione',
    deskripsiSingkat: 'Flanel katun premium yang hangat tanpa gerah, cocok dipakai harian.',
    deskripsi:
      'Kemeja flanel dari katun 100% dengan tenun rapat yang tetap adem dipakai di cuaca Indonesia. Jahitan double-stitch di bagian bahu dan lengan agar tidak mudah lepas. Kancing resin tahan pecah. Sudah dicuci sebelum dijahit (pre-shrunk), jadi tidak menyusut setelah dicuci pertama kali.',
    harga: 189000,
    hargaCoret: 249000,
    hpp: 98000,
    berat: 350,
    panjang: 32,
    lebar: 25,
    tinggi: 4,
    unggulan: true,
    status: 'PUBLISHED',
    linkShopee: 'https://shopee.co.id/nusakara-kemeja-flanel-i.123456.7891011',
    linkTiktok: 'https://vt.tiktok.com/ZSnusakara01/',
    varian: varianUkuran('NSK-KMJ-001', [12, 24, 18, 6]),
  },
  {
    nama: 'Kaos Katun Combed 30s',
    sku: 'NSK-KAO-002',
    kategori: 'pakaian-pria',
    brand: 'SRN Cullezione',
    deskripsiSingkat: 'Kaos polos combed 30s, lembut dan menyerap keringat.',
    deskripsi:
      'Kaos berbahan katun combed 30s dengan gramasi 180 gsm — cukup tebal agar tidak menerawang, tapi tetap ringan. Jahitan rantai di bagian pundak dan kelim bawah. Potongan regular fit yang tidak terlalu ketat di badan.',
    harga: 89000,
    hpp: 42000,
    berat: 200,
    panjang: 30,
    lebar: 24,
    tinggi: 3,
    unggulan: true,
    status: 'PUBLISHED',
    varian: varianUkuran('NSK-KAO-002', [40, 55, 48, 22]),
  },
  {
    nama: 'Celana Chino Slim Fit',
    sku: 'NSK-CLN-003',
    kategori: 'pakaian-pria',
    brand: 'SRN Cullezione',
    deskripsiSingkat: 'Chino stretch yang nyaman untuk duduk lama maupun jalan seharian.',
    deskripsi:
      'Celana chino dengan campuran 2% spandex sehingga mengikuti gerakan tanpa melar permanen. Kantong belakang berkancing, sabuk pinggang berlapis untuk kenyamanan saat duduk lama. Warna tidak mudah luntur setelah pencucian berulang.',
    harga: 259000,
    hargaCoret: 319000,
    hpp: 135000,
    berat: 450,
    panjang: 35,
    lebar: 27,
    tinggi: 5,
    status: 'PUBLISHED',
    varian: [
      { nama: 'Pinggang 30', sku: 'NSK-CLN-003-30', stok: 8 },
      { nama: 'Pinggang 32', sku: 'NSK-CLN-003-32', stok: 15 },
      { nama: 'Pinggang 34', sku: 'NSK-CLN-003-34', stok: 11 },
      { nama: 'Pinggang 36', sku: 'NSK-CLN-003-36', stok: 4 },
    ],
  },
  {
    nama: 'Blouse Linen Lengan Balon',
    sku: 'NSK-BLS-004',
    kategori: 'pakaian-wanita',
    brand: 'SRN Cullezione',
    deskripsiSingkat: 'Linen adem dengan siluet lengan balon yang jatuh rapi.',
    deskripsi:
      'Blouse berbahan linen viscose yang jauh lebih adem dibanding katun biasa, cocok untuk cuaca tropis. Lengan balon dengan manset elastis. Potongan longgar yang tetap terlihat rapi untuk ke kantor maupun acara santai.',
    harga: 219000,
    hargaCoret: 275000,
    hpp: 112000,
    berat: 250,
    panjang: 31,
    lebar: 24,
    tinggi: 3,
    unggulan: true,
    status: 'PUBLISHED',
    varian: varianUkuran('NSK-BLS-004', [14, 20, 16, 9]),
  },
  {
    nama: 'Rok Plisket Midi',
    sku: 'NSK-ROK-005',
    kategori: 'pakaian-wanita',
    brand: 'SRN Cullezione',
    deskripsiSingkat: 'Plisket permanen yang tidak hilang setelah dicuci.',
    deskripsi:
      'Rok midi dengan plisket heat-set permanen — lipatan tetap rapi meski dicuci berkali-kali. Pinggang karet penuh sehingga fleksibel di berbagai ukuran. Panjang 78 cm, jatuh di bawah lutut.',
    harga: 179000,
    hpp: 88000,
    berat: 300,
    panjang: 30,
    lebar: 25,
    tinggi: 4,
    status: 'PUBLISHED',
    varian: [
      { nama: 'All Size', sku: 'NSK-ROK-005-AS', stok: 26 },
    ],
  },
  {
    nama: 'Tas Ransel Kanvas 20L',
    sku: 'NSK-TAS-006',
    kategori: 'tas-dompet',
    brand: 'SRN Cullezione',
    deskripsiSingkat: 'Kapasitas 20L dengan sekat laptop 14 inci berlapis busa.',
    deskripsi:
      'Ransel kanvas 16 oz dengan lapisan anti air di bagian dalam. Sekat laptop hingga 14 inci berlapis busa 8 mm. Tali bahu dengan bantalan tebal agar tidak menekan pundak saat membawa beban berat. Resleting YKK dengan garansi ganti bila macet dalam 1 tahun.',
    harga: 349000,
    hargaCoret: 449000,
    hpp: 178000,
    berat: 850,
    panjang: 45,
    lebar: 30,
    tinggi: 18,
    stok: 34,
    unggulan: true,
    status: 'PUBLISHED',
    linkShopee: 'https://shopee.co.id/nusakara-ransel-kanvas-i.123456.7891012',
  },
  {
    nama: 'Dompet Kulit Sapi Asli',
    sku: 'NSK-DMP-007',
    kategori: 'tas-dompet',
    brand: 'SRN Cullezione',
    deskripsiSingkat: 'Kulit sapi full-grain yang makin bagus seiring pemakaian.',
    deskripsi:
      'Dompet lipat dua dari kulit sapi full-grain samak nabati. Berbeda dari kulit sintetis, permukaannya akan membentuk patina (perubahan warna alami) yang khas seiring pemakaian. Muat 8 kartu, 2 slot uang kertas, dan 1 kantong koin beresleting.',
    harga: 199000,
    hpp: 96000,
    berat: 120,
    panjang: 12,
    lebar: 10,
    tinggi: 2,
    stok: 48,
    status: 'PUBLISHED',
  },
  {
    nama: 'Tote Bag Kanvas Tebal',
    sku: 'NSK-TOT-008',
    kategori: 'tas-dompet',
    brand: 'SRN Cullezione',
    deskripsiSingkat: 'Kanvas 14 oz yang kuat menahan beban belanja mingguan.',
    deskripsi:
      'Tote bag dari kanvas 14 oz dengan jahitan diperkuat di titik sambungan tali. Kuat menahan beban hingga 8 kg. Ada kantong dalam beresleting untuk dompet dan ponsel. Bisa dicuci mesin.',
    harga: 129000,
    hpp: 58000,
    berat: 320,
    panjang: 40,
    lebar: 35,
    tinggi: 12,
    stok: 62,
    status: 'PUBLISHED',
  },
  {
    nama: 'Sneakers Kanvas Low-Top',
    sku: 'NSK-SNK-009',
    kategori: 'sepatu-sandal',
    brand: 'SRN Cullezione',
    deskripsiSingkat: 'Sol karet vulkanisir yang lentur dan tidak licin.',
    deskripsi:
      'Sneakers kanvas dengan sol karet vulkanisir — direkatkan dengan panas, bukan lem, sehingga tidak mudah lepas. Insole busa memori yang bisa dilepas untuk dicuci. Bagian dalam berlapis kain katun agar tidak lecet saat dipakai tanpa kaus kaki.',
    harga: 399000,
    hargaCoret: 499000,
    hpp: 205000,
    berat: 900,
    panjang: 33,
    lebar: 22,
    tinggi: 13,
    unggulan: true,
    status: 'PUBLISHED',
    linkTiktok: 'https://vt.tiktok.com/ZSnusakara09/',
    varian: [
      { nama: 'Ukuran 39', sku: 'NSK-SNK-009-39', stok: 6 },
      { nama: 'Ukuran 40', sku: 'NSK-SNK-009-40', stok: 12 },
      { nama: 'Ukuran 41', sku: 'NSK-SNK-009-41', stok: 14 },
      { nama: 'Ukuran 42', sku: 'NSK-SNK-009-42', stok: 10 },
      { nama: 'Ukuran 43', sku: 'NSK-SNK-009-43', stok: 5 },
      { nama: 'Ukuran 44', sku: 'NSK-SNK-009-44', stok: 2 },
    ],
  },
  {
    nama: 'Sandal Kulit Pria',
    sku: 'NSK-SDL-010',
    kategori: 'sepatu-sandal',
    brand: 'SRN Cullezione',
    deskripsiSingkat: 'Sol empuk dengan penyangga lengkung kaki.',
    deskripsi:
      'Sandal kulit dengan footbed berkontur yang menyangga lengkung kaki (arch support) — nyaman dipakai berdiri atau berjalan lama. Tali kulit yang bisa disetel. Sol karet anti selip untuk lantai basah.',
    harga: 229000,
    hpp: 118000,
    berat: 600,
    panjang: 32,
    lebar: 20,
    tinggi: 10,
    status: 'PUBLISHED',
    varian: [
      { nama: 'Ukuran 40', sku: 'NSK-SDL-010-40', stok: 7 },
      { nama: 'Ukuran 41', sku: 'NSK-SDL-010-41', stok: 9 },
      { nama: 'Ukuran 42', sku: 'NSK-SDL-010-42', stok: 8 },
      { nama: 'Ukuran 43', sku: 'NSK-SDL-010-43', stok: 3 },
    ],
  },
  {
    nama: 'Topi Baseball Katun Twill',
    sku: 'NSK-TOP-011',
    kategori: 'aksesoris',
    brand: 'SRN Cullezione',
    deskripsiSingkat: 'Enam panel dengan lubang ventilasi berbordir.',
    deskripsi:
      'Topi enam panel dari katun twill dengan lubang ventilasi berbordir di tiap panel. Sweatband dalam berbahan penyerap keringat yang bisa dilepas. Tali belakang logam yang bisa disetel.',
    harga: 99000,
    hpp: 44000,
    berat: 110,
    panjang: 22,
    lebar: 20,
    tinggi: 12,
    stok: 3,
    status: 'PUBLISHED',
  },
  {
    nama: 'Ikat Pinggang Kulit',
    sku: 'NSK-IKP-012',
    kategori: 'aksesoris',
    brand: 'SRN Cullezione',
    deskripsiSingkat: 'Kulit sapi 3.5 cm dengan gesper kuningan solid.',
    deskripsi:
      'Ikat pinggang lebar 3,5 cm dari kulit sapi utuh (bukan potongan yang dipress). Gesper kuningan solid yang tidak berkarat. Panjang bisa dipotong sendiri sesuai ukuran pinggang, lengkap dengan petunjuk cara memotongnya.',
    harga: 149000,
    hpp: 71000,
    berat: 250,
    panjang: 30,
    lebar: 12,
    tinggi: 3,
    stok: 0,
    status: 'PUBLISHED',
  },
  {
    nama: 'Kacamata Hitam Polarized',
    sku: 'NSK-KCM-013',
    kategori: 'aksesoris',
    brand: 'SRN Cullezione',
    deskripsiSingkat: 'Lensa polarized UV400 yang mengurangi silau di jalan.',
    deskripsi:
      'Lensa polarized dengan proteksi UV400 — memblokir 100% sinar UVA dan UVB, sekaligus mengurangi pantulan silau dari aspal dan air. Bingkai TR90 yang lentur dan ringan (22 gram). Termasuk kotak keras dan kain pembersih.',
    harga: 279000,
    hargaCoret: 349000,
    hpp: 132000,
    berat: 180,
    panjang: 17,
    lebar: 8,
    tinggi: 6,
    stok: 21,
    status: 'PUBLISHED',
  },
  {
    nama: 'Jaket Bomber Taslan',
    sku: 'NSK-JKT-014',
    kategori: 'pakaian-pria',
    brand: 'SRN Cullezione',
    deskripsiSingkat: 'Bahan taslan anti angin, cocok untuk pengendara motor.',
    deskripsi:
      'Jaket bomber dari bahan taslan yang menahan angin dan gerimis ringan. Lapisan dalam berbahan furing halus. Dua kantong depan beresleting dan satu kantong dalam untuk dompet.',
    harga: 329000,
    hpp: 168000,
    berat: 700,
    panjang: 35,
    lebar: 28,
    tinggi: 8,
    status: 'DRAFT',
    varian: varianUkuran('NSK-JKT-014', [5, 10, 8, 4]),
  },
  {
    nama: 'Kaos Kaki Katun Pendek (3 Pasang)',
    sku: 'NSK-KSK-015',
    kategori: 'aksesoris',
    brand: 'SRN Cullezione',
    deskripsiSingkat: 'Paket isi 3 pasang, katun dengan karet yang tidak melorot.',
    deskripsi:
      'Kaos kaki katun pendek isi 3 pasang. Bagian karet dijahit dengan benang elastis rangkap agar tidak melorot setelah beberapa kali cuci. Sol berbantalan tipis untuk kenyamanan ekstra.',
    harga: 65000,
    hpp: 28000,
    berat: 150,
    stok: 0,
    status: 'DRAFT',
  },
];

/**
 * Label promosi yang menempel di kartu produk. Berbeda dari kategori: satu
 * produk boleh punya beberapa label, dan labelnya berumur pendek (Flash Sale
 * berakhir sendiri lewat kolom `selesai`).
 */
export const LABEL = [
  { nama: 'Flash Sale', slug: 'flash-sale', warna: '#dc2626', urutan: 0, berlakuHari: 3 },
  { nama: 'Diskon', slug: 'diskon', warna: '#ea580c', urutan: 1 },
  { nama: 'Produk Baru', slug: 'produk-baru', warna: '#16a34a', urutan: 2 },
] satisfies { nama: string; slug: string; warna: string; urutan: number; berlakuHari?: number }[];

/** Label mana menempel ke SKU mana. */
export const LABEL_PRODUK: Record<string, string[]> = {
  'NSK-TAS-006': ['flash-sale', 'diskon'],
  'NSK-KCM-013': ['flash-sale', 'diskon'],
  'NSK-SNK-009': ['diskon'],
  'NSK-BLS-004': ['diskon'],
  'NSK-CLN-003': ['diskon'],
  'NSK-KMJ-001': ['diskon'],
  'NSK-TOT-008': ['produk-baru'],
  'NSK-TOP-011': ['produk-baru'],
};

/**
 * Voucher contoh. Nilainya sengaja mencakup beberapa keadaan sekaligus —
 * persen dengan batas atas, nominal tetap, dan cakupan satu kategori — supaya
 * panel admin punya bahan untuk dilihat tanpa harus mengisi manual dulu.
 */
export const VOUCHER = [
  {
    kode: 'HEMAT10',
    deskripsi: 'Diskon 10% maksimal Rp25.000 untuk semua produk',
    tipe: 'PERSEN' as const,
    nilai: 10,
    maksPotongan: 25000,
    minBelanja: 100000,
    kuota: 500,
    berlakuHari: 30,
  },
  {
    kode: 'ONGKIRHEMAT',
    deskripsi: 'Potongan Rp20.000 untuk belanja minimal Rp250.000',
    tipe: 'NOMINAL' as const,
    nilai: 20000,
    maksPotongan: null,
    minBelanja: 250000,
    kuota: 200,
    berlakuHari: 60,
  },
  {
    kode: 'TASBARU15',
    deskripsi: 'Diskon 15% khusus kategori Tas & Dompet',
    tipe: 'PERSEN' as const,
    nilai: 15,
    maksPotongan: 60000,
    minBelanja: 0,
    kuota: 100,
    berlakuHari: 14,
    kategori: 'tas-dompet',
  },
];
