import type { JenisBlok } from '@/lib/types';

export interface InfoBlok {
  label: string;
  keterangan: string;
}

export const INFO_BLOK: Record<JenisBlok, InfoBlok> = {
  HERO: {
    label: 'Hero',
    keterangan: 'Bagian paling atas: judul besar, gambar, dan tombol utama',
  },
  PRODUK: {
    label: 'Produk',
    keterangan: 'Grid produk yang dipromosikan, lengkap dengan tombol beli',
  },
  KEUNGGULAN: {
    label: 'Keunggulan',
    keterangan: 'Daftar alasan kenapa harus beli, dengan ikon',
  },
  TESTIMONI: {
    label: 'Testimoni',
    keterangan: 'Ulasan pembeli beserta rating bintang',
  },
  FAQ: {
    label: 'Tanya Jawab',
    keterangan: 'Pertanyaan yang sering muncul, bisa dibuka-tutup',
  },
  HITUNG_MUNDUR: {
    label: 'Hitung Mundur',
    keterangan: 'Penanda batas waktu promo',
  },
  CTA: {
    label: 'Ajakan Beli',
    keterangan: 'Blok penutup dengan tombol besar',
  },
  TEKS: {
    label: 'Teks',
    keterangan: 'Paragraf bebas, misalnya cerita produk atau syarat promo',
  },
};

export const URUTAN_JENIS: JenisBlok[] = [
  'HERO',
  'PRODUK',
  'KEUNGGULAN',
  'TESTIMONI',
  'HITUNG_MUNDUR',
  'FAQ',
  'TEKS',
  'CTA',
];

/** Isi awal saat blok baru ditambahkan, sudah lolos validasi API. */
export function kontenAwal(tipe: JenisBlok): Record<string, unknown> {
  const tombolAwal = {
    teks: 'Beli Sekarang',
    aksi: { tipe: 'tautan', produkId: null, varianId: null, jumlah: 1, url: '/produk' },
  };

  switch (tipe) {
    case 'HERO':
      return {
        badge: '',
        judul: 'Judul penawaran Anda',
        subjudul: '',
        gambarUrl: '',
        tombol: tombolAwal,
        poin: [],
      };
    case 'PRODUK':
      return { judul: 'Produk Pilihan', subjudul: '', produkIds: [], tampilkanTombol: true };
    case 'KEUNGGULAN':
      return {
        judul: 'Kenapa Pilih Kami',
        items: [{ ikon: 'centang', judul: 'Keunggulan pertama', teks: '' }],
      };
    case 'TESTIMONI':
      return {
        judul: 'Kata Pembeli',
        items: [{ nama: '', kota: '', teks: '', rating: 5 }],
      };
    case 'FAQ':
      return { judul: 'Tanya Jawab', items: [{ tanya: '', jawab: '' }] };
    case 'HITUNG_MUNDUR':
      return {
        judul: 'Promo berakhir dalam',
        subjudul: '',
        // Bawaan 7 hari dari sekarang supaya blok langsung sah saat disimpan.
        berakhirPada: new Date(Date.now() + 7 * 86_400_000).toISOString(),
        teksSetelahHabis: '',
      };
    case 'CTA':
      return {
        judul: 'Siap pesan sekarang?',
        subjudul: '',
        tombol: tombolAwal,
        catatanKecil: '',
      };
    case 'TEKS':
      return { judul: '', isi: 'Tulis isi teks di sini.' };
    default:
      return {};
  }
}
