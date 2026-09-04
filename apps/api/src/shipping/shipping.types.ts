export interface TujuanKirim {
  provinsi: string;
  kota: string;
  kecamatan?: string | null;
  kodePos: string;
}

export interface PermintaanOngkir {
  tujuan: TujuanKirim;
  /** Berat total dalam gram. */
  berat: number;
  /** Nilai barang (subtotal) — sebagian kurir memakainya untuk asuransi. */
  nilaiBarang: number;
}

export interface OpsiOngkir {
  /** Kode unik opsi, dipakai saat pembeli memilih. Mis. "jne:REG". */
  kode: string;
  kurir: string; // "JNE"
  layanan: string; // "REG"
  nama: string; // "Reguler"
  deskripsi: string; // "Estimasi 2-3 hari kerja"
  estimasi: string; // "2-3 hari"
  ongkir: number; // Rupiah
}

export interface HasilOngkir {
  opsi: OpsiOngkir[];
  /** "biteship" atau "tarif-lokal" — ikut disimpan di order untuk audit. */
  penyedia: string;
  /** Diisi bila fallback dipakai karena penyedia utama gagal/tidak dikonfigurasi. */
  catatan?: string;
}

export interface PenyediaOngkir {
  readonly nama: string;
  siap(): boolean;
  hitung(permintaan: PermintaanOngkir): Promise<OpsiOngkir[]>;
}
