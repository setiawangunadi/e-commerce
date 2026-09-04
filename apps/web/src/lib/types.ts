export type StatusProduk = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

/** Merek produk, dipakai di kartu produk maupun penyaring etalase. */
export interface Merek {
  id: string;
  nama: string;
  slug: string;
}

export interface MerekEtalase extends Merek {
  deskripsi: string | null;
  logoUrl: string | null;
  jumlahProduk: number;
}

export interface MerekAdmin extends MerekEtalase {
  urutan: number;
  aktif: boolean;
  createdAt: string;
  updatedAt: string;
}
export type RoleAdmin = 'ADMIN' | 'STAFF';

export interface Kategori {
  id: string;
  nama: string;
  slug: string;
  deskripsi: string | null;
  gambarUrl: string | null;
  jumlahProduk: number;
  /** Kategori induk, mis. "Fashion" untuk "Pakaian Pria". */
  induk?: { id: string; nama: string; slug: string } | null;
}

/** Label promosi yang ditempel ke produk, mis. Flash Sale. */
export interface LabelProduk {
  id: string;
  nama: string;
  slug: string;
  warna: string;
}

export interface KategoriAdmin extends Omit<Kategori, 'jumlahProduk'> {
  urutan: number;
  aktif: boolean;
  jumlahProduk: number;
  parentId: string | null;
  jumlahAnak: number;
}

export interface Banner {
  id: string;
  judul: string;
  subjudul: string | null;
  gambarUrl: string;
  gambarMobileUrl: string | null;
  teksTombol: string | null;
  tautanTombol: string | null;
}

export interface BannerAdmin extends Banner {
  urutan: number;
  aktif: boolean;
  mulaiTayang: string | null;
  selesaiTayang: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KartuProduk {
  id: string;
  nama: string;
  slug: string;
  deskripsiSingkat: string | null;
  brand: Merek | null;
  harga: number;
  hargaCoret: number | null;
  diskonPersen: number | null;
  stok: number;
  tersedia: boolean;
  kategori: { id: string; nama: string; slug: string } | null;
  gambarUtama: string | null;
  linkShopee: string | null;
  linkTiktok: string | null;
  punyaVarian: boolean;
  label: LabelProduk[];
}

/** Produk lengkap seperti dilihat pembeli (tanpa HPP & data internal). */
export interface ProdukPublik {
  id: string;
  nama: string;
  slug: string;
  deskripsi: string | null;
  deskripsiSingkat: string | null;
  brand: Merek | null;
  sku: string;
  harga: number;
  hargaCoret: number | null;
  diskonPersen: number | null;
  berat: number;
  stok: number;
  tersedia: boolean;
  kategori: { id: string; nama: string; slug: string } | null;
  gambar: Gambar[];
  varian: (Varian & { tersedia: boolean })[];
  metaTitle: string | null;
  metaDescription: string | null;
  linkShopee: string | null;
  linkTiktok: string | null;
  label: LabelProduk[];
}

export interface Varian {
  id: string;
  nama: string;
  sku: string;
  harga: number | null;
  stok: number;
  aktif?: boolean;
  urutan?: number;
  /** Kosong berarti varian ini memakai gambar umum produk. */
  gambar?: Gambar[];
}

export interface Gambar {
  id: string;
  url: string;
  alt: string | null;
}

export interface ProdukAdmin {
  id: string;
  nama: string;
  slug: string;
  deskripsi: string | null;
  deskripsiSingkat: string | null;
  brand: Merek | null;
  sku: string;
  harga: number;
  hargaCoret: number | null;
  diskonPersen: number | null;
  hpp: number | null;
  berat: number;
  panjang: number | null;
  lebar: number | null;
  tinggi: number | null;
  stok: number;
  stokProduk: number;
  stokMinimum: number;
  stokMenipis: boolean;
  tersedia: boolean;
  status: StatusProduk;
  unggulan: boolean;
  kenaPpn: boolean;
  categoryId: string | null;
  kategori: { id: string; nama: string; slug: string } | null;
  label: LabelProduk[];
  labelIds: string[];
  gambar: Gambar[];
  varian: Varian[];
  metaTitle: string | null;
  metaDescription: string | null;
  linkShopee: string | null;
  linkTiktok: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DataBeranda {
  banner: Banner[];
  kategori: Kategori[];
  produkUnggulan: KartuProduk[];
  produkTerbaru: KartuProduk[];
  totalProduk: number;
}

export interface RingkasanAdmin {
  penjualan: RingkasanPenjualan;
  produk: { total: number; terbit: number; draft: number; arsip: number };
  totalKategori: number;
  produkStokHabis: number;
  nilaiPersediaan: number;
  stokMenipis: { id: string; nama: string; sku: string; stok: number; stokMinimum: number }[];
  produkTerbaru: {
    id: string;
    nama: string;
    sku: string;
    harga: number;
    status: StatusProduk;
    updatedAt: string;
    gambarUtama: string | null;
  }[];
}

export interface ProfilAdmin {
  id: string;
  email: string;
  nama: string;
  role: RoleAdmin;
}

export interface MetaPaginasi {
  page: number;
  limit: number;
  total: number;
  totalHalaman: number;
}

// ---------------------------------------------------------------------------
// Keranjang, pengiriman, dan pesanan
// ---------------------------------------------------------------------------

export interface ItemKeranjang {
  id: string;
  produkId: string;
  varianId: string | null;
  slug: string;
  nama: string;
  namaVarian: string | null;
  sku: string;
  gambarUrl: string | null;
  harga: number;
  jumlah: number;
  subtotal: number;
  berat: number;
  stokTersedia: number;
  /** Produk tidak terbit lagi atau varian dinonaktifkan. */
  tidakTersedia: boolean;
  /** Jumlah di keranjang melebihi stok yang tersisa sekarang. */
  melebihiStok: boolean;
}

export interface RingkasanKeranjang {
  id: string | null;
  items: ItemKeranjang[];
  jumlahItem: number;
  subtotal: number;
  beratTotal: number;
  adaMasalah: boolean;
}

export interface OpsiOngkir {
  kode: string;
  kurir: string;
  layanan: string;
  nama: string;
  deskripsi: string;
  estimasi: string;
  ongkir: number;
}

export interface HasilOngkir {
  opsi: OpsiOngkir[];
  penyedia: string;
  catatan?: string;
}

export type StatusPesanan =
  | 'WAITING_PAYMENT'
  | 'PAYMENT_SUCCESS'
  | 'PROCESS_ORDER'
  | 'ORDER_SEND'
  | 'ORDER_RECEIPT'
  | 'ORDER_CANCELLED'
  | 'PAYMENT_EXPIRED';

export type StatusPembayaran =
  | 'MENUNGGU'
  | 'LUNAS'
  | 'GAGAL'
  | 'KEDALUWARSA'
  | 'DITANTANG'
  | 'DIKEMBALIKAN';

export interface Pesanan {
  nomor: string;
  token: string;
  status: StatusPesanan;
  statusPembayaran: StatusPembayaran;
  metodePembayaran: string | null;
  pembeli: { nama: string; email: string; telepon: string };
  alamat: {
    lengkap: string;
    provinsi: string;
    kota: string;
    kecamatan: string | null;
    kodePos: string;
    catatan: string | null;
  };
  pengiriman: {
    kurir: string;
    layanan: string;
    nama: string;
    estimasi: string | null;
    beratTotal: number;
    nomorResi: string | null;
  };
  items: {
    namaProduk: string;
    namaVarian: string | null;
    sku: string;
    gambarUrl: string | null;
    harga: number;
    jumlah: number;
    subtotal: number;
  }[];
  subtotal: number;
  ongkir: number;
  diskon: number;
  kodeVoucher: string | null;
  poinDipakai: number;
  potonganPoin: number;
  total: number;
  kedaluwarsaPada: string;
  dibayarPada: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Landing page kampanye
// ---------------------------------------------------------------------------

export type StatusLanding = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type JenisBlok =
  | 'HERO'
  | 'PRODUK'
  | 'KEUNGGULAN'
  | 'TESTIMONI'
  | 'FAQ'
  | 'HITUNG_MUNDUR'
  | 'CTA'
  | 'TEKS';

/** Tujuan tombol CTA yang dipilih admin. */
export interface AksiCta {
  tipe: 'checkout' | 'keranjang' | 'tautan';
  produkId: string | null;
  varianId: string | null;
  jumlah: number;
  url: string | null;
}

export interface TombolCta {
  teks: string;
  aksi: AksiCta;
}

export interface Blok {
  id: string;
  tipe: JenisBlok;
  /** Bentuknya berbeda per `tipe` — lihat komponen render masing-masing. */
  konten: Record<string, unknown>;
}

export interface BlokAdmin extends Blok {
  aktif: boolean;
  urutan: number;
}

export interface TrackingLanding {
  metaPixelId: string | null;
  ga4Id: string | null;
  googleAdsId: string | null;
  googleAdsLabel: string | null;
  gtmId: string | null;
}

export interface LandingPublik {
  slug: string;
  nama: string;
  judulMeta: string | null;
  deskripsiMeta: string | null;
  gambarOg: string | null;
  warnaAksen: string;
  tracking: TrackingLanding;
  blok: Blok[];
  produk: KartuProduk[];
}

export interface LandingAdmin {
  id: string;
  nama: string;
  slug: string;
  status: StatusLanding;
  judulMeta: string | null;
  deskripsiMeta: string | null;
  gambarOg: string | null;
  metaPixelId: string | null;
  ga4Id: string | null;
  googleAdsId: string | null;
  googleAdsLabel: string | null;
  gtmId: string | null;
  warnaAksen: string;
  mulaiTayang: string | null;
  selesaiTayang: string | null;
  blok: BlokAdmin[];
  createdAt: string;
  updatedAt: string;
}

export interface RingkasanLanding {
  id: string;
  nama: string;
  slug: string;
  status: StatusLanding;
  jumlahBlok: number;
  metaPixelId: string | null;
  ga4Id: string | null;
  googleAdsId: string | null;
  mulaiTayang: string | null;
  selesaiTayang: string | null;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Pesanan di panel admin
// ---------------------------------------------------------------------------

export interface BarisPesananAdmin {
  id: string;
  nomor: string;
  status: StatusPesanan;
  statusLabel: string;
  statusPembayaran: StatusPembayaran;
  metodePembayaran: string | null;
  namaPembeli: string;
  teleponPembeli: string;
  kota: string;
  provinsi: string;
  kurir: string;
  nomorResi: string | null;
  jumlahBarang: number;
  ringkasanBarang: string;
  total: number;
  createdAt: string;
  dibayarPada: string | null;
}

export interface MetaPesanan extends MetaPaginasi {
  jumlahPerStatus: Record<StatusPesanan, number>;
}

export interface PesananAdmin {
  id: string;
  nomor: string;
  status: StatusPesanan;
  statusLabel: string;
  statusBerikutnya: { status: StatusPesanan; label: string }[];
  statusPembayaran: StatusPembayaran;
  metodePembayaran: string | null;
  pembeli: { nama: string; email: string; telepon: string };
  alamat: {
    lengkap: string;
    provinsi: string;
    kota: string;
    kecamatan: string | null;
    kodePos: string;
    catatan: string | null;
  };
  pengiriman: {
    kurir: string;
    layanan: string;
    nama: string;
    estimasi: string | null;
    beratTotal: number;
    nomorResi: string | null;
    penyedia: string;
  };
  atribusi: {
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    utmContent: string | null;
    landingSlug: string | null;
  };
  items: {
    namaProduk: string;
    namaVarian: string | null;
    sku: string;
    gambarUrl: string | null;
    harga: number;
    jumlah: number;
    subtotal: number;
  }[];
  subtotal: number;
  ongkir: number;
  diskon: number;
  kodeVoucher: string | null;
  poinDipakai: number;
  potonganPoin: number;
  total: number;
  kedaluwarsaPada: string;
  dibayarPada: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RingkasanPenjualan {
  perluDiproses: number;
  sedangDikirim: number;
  pesananHariIni: number;
  pesananSelesai: number;
  jumlahPesananLunas: number;
  omzet: number;
  nilaiRataRata: number;
}

export interface HasilVoucher {
  kode: string;
  deskripsi: string | null;
  potongan: number;
  subtotalBerlaku: number;
}

export interface LabelAdmin {
  id: string;
  nama: string;
  slug: string;
  warna: string;
  urutan: number;
  aktif: boolean;
  mulai: string | null;
  selesai: string | null;
  jumlahProduk: number;
  keadaan: string;
}

export type TipeVoucher = 'PERSEN' | 'NOMINAL';

export interface RingkasanVoucher {
  id: string;
  kode: string;
  deskripsi: string | null;
  tipe: TipeVoucher;
  nilai: number;
  maksPotongan: number | null;
  minBelanja: number;
  kuota: number | null;
  terpakai: number;
  mulai: string | null;
  selesai: string | null;
  aktif: boolean;
  cakupan: string;
  keadaan: string;
}

export interface VoucherAdmin extends Omit<RingkasanVoucher, 'cakupan' | 'keadaan'> {
  produkIds: string[];
  kategoriIds: string[];
  createdAt: string;
  updatedAt: string;
}

// --- Pelanggan & loyalty ---------------------------------------------------

export type TierPelanggan = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export type TipePoin = 'EARN' | 'REDEEM' | 'TO_VOUCHER' | 'ADJUST' | 'REFUND';

export interface ProfilPelanggan {
  id: string;
  email: string;
  nama: string;
  telepon: string | null;
  tier: TierPelanggan;
  poin: number;
  createdAt: string;
}

export interface RingkasanLoyalty {
  poin: number;
  nilaiPoin: number;
  poinTertunda: number;
  tier: TierPelanggan;
  namaTier: string;
  warnaTier: string;
  pengaliPoin: number;
  belanja12Bulan: number;
  tierBerikutnya: { nama: string; kurang: number; pengali: number } | null;
}

export interface MutasiPoin {
  id: string;
  tipe: TipePoin;
  jumlah: number;
  saldoSesudah: number;
  keterangan: string;
  kodeVoucher: string | null;
  nomorPesanan: string | null;
  createdAt: string;
}

export interface AlamatTersimpan {
  id: string;
  label: string;
  namaPenerima: string;
  teleponPenerima: string;
  alamatLengkap: string;
  provinsi: string;
  kota: string;
  kecamatan: string | null;
  kodePos: string;
  catatan: string | null;
  utama: boolean;
}

export interface PesananSaya {
  nomor: string;
  token: string;
  status: StatusPesanan;
  statusLabel: string;
  statusPembayaran: StatusPembayaran;
  subtotal: number;
  diskon: number;
  potonganPoin: number;
  ongkir: number;
  total: number;
  nomorResi: string | null;
  jumlahBarang: number;
  gambarUtama: string | null;
  ringkasanBarang: string;
  poinDidapat: number;
  poinTertunda: number;
  createdAt: string;
}

export interface AturanTier {
  tier: TierPelanggan;
  nama: string;
  minBelanja: number;
  pengali: number;
  warna: string;
}

export interface BarisPelangganAdmin {
  id: string;
  email: string;
  nama: string;
  telepon: string | null;
  aktif: boolean;
  poin: number;
  tier: TierPelanggan;
  namaTier: string;
  warnaTier: string;
  belanja12Bulan: number;
  jumlahPesanan: number;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface PelangganAdmin extends Omit<BarisPelangganAdmin, 'jumlahPesanan'> {
  pengaliPoin: number;
  tierBerikutnya: { nama: string; kurang: number } | null;
  belanjaTotal: number;
  pesananSukses: number;
  rataRataPesanan: number;
  alamat: AlamatTersimpan[];
  pesanan: {
    id: string;
    nomor: string;
    status: StatusPesanan;
    statusLabel: string;
    statusPembayaran: StatusPembayaran;
    total: number;
    poinDipakai: number;
    createdAt: string;
  }[];
  mutasiPoin: MutasiPoin[];
}
