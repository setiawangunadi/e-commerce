import type { StatusPesanan } from './types';

/**
 * Tampilan tiap status pesanan, dipakai bersama panel admin dan halaman
 * pembeli supaya keduanya tidak pernah menampilkan istilah yang berbeda untuk
 * keadaan yang sama.
 */
export interface GayaStatus {
  label: string;
  /** Kalimat yang dibaca pembeli di halaman status pesanannya. */
  pesanPembeli: string;
  kelasLencana: string;
  kelasPanel: string;
}

export const STATUS_PESANAN: Record<StatusPesanan, GayaStatus> = {
  WAITING_PAYMENT: {
    label: 'Menunggu Pembayaran',
    pesanPembeli:
      'Pesanan Anda sudah kami simpan. Selesaikan pembayaran agar segera kami proses.',
    kelasLencana: 'bg-amber-100 text-amber-800',
    kelasPanel: 'border-amber-200 bg-amber-50 text-amber-900',
  },
  PAYMENT_SUCCESS: {
    label: 'Sudah Dibayar',
    pesanPembeli: 'Terima kasih! Pesanan Anda akan kami kemas pada hari kerja berikutnya.',
    kelasLencana: 'bg-merek-100 text-merek-800',
    kelasPanel: 'border-merek-200 bg-merek-50 text-merek-900',
  },
  PROCESS_ORDER: {
    label: 'Sedang Dikemas',
    pesanPembeli: 'Pesanan Anda sedang disiapkan di gudang kami.',
    kelasLencana: 'bg-blue-100 text-blue-800',
    kelasPanel: 'border-blue-200 bg-blue-50 text-blue-900',
  },
  ORDER_SEND: {
    label: 'Dalam Pengiriman',
    pesanPembeli: 'Pesanan sudah diserahkan ke kurir. Gunakan nomor resi untuk melacak.',
    kelasLencana: 'bg-indigo-100 text-indigo-800',
    kelasPanel: 'border-indigo-200 bg-indigo-50 text-indigo-900',
  },
  ORDER_RECEIPT: {
    label: 'Diterima Pembeli',
    pesanPembeli: 'Pesanan sudah diterima. Terima kasih sudah belanja di sini!',
    kelasLencana: 'bg-merek-100 text-merek-800',
    kelasPanel: 'border-merek-200 bg-merek-50 text-merek-900',
  },
  ORDER_CANCELLED: {
    label: 'Dibatalkan',
    pesanPembeli: 'Pesanan ini dibatalkan. Tidak ada tagihan yang perlu Anda bayar.',
    kelasLencana: 'bg-red-100 text-red-700',
    kelasPanel: 'border-neutral-200 bg-neutral-50 text-neutral-700',
  },
  PAYMENT_EXPIRED: {
    label: 'Kedaluwarsa',
    pesanPembeli:
      'Pesanan ini hangus karena tidak dibayar tepat waktu. Silakan pesan ulang bila masih dibutuhkan.',
    kelasLencana: 'bg-neutral-100 text-neutral-600',
    kelasPanel: 'border-neutral-200 bg-neutral-50 text-neutral-700',
  },
};

/** Urutan tab di panel admin — mengikuti alur pesanan, bukan abjad. */
export const URUTAN_STATUS: StatusPesanan[] = [
  'WAITING_PAYMENT',
  'PAYMENT_SUCCESS',
  'PROCESS_ORDER',
  'ORDER_SEND',
  'ORDER_RECEIPT',
  'ORDER_CANCELLED',
  'PAYMENT_EXPIRED',
];
