import { describe, expect, it } from 'vitest';
import { STATUS_PESANAN, URUTAN_STATUS } from '@/lib/status-pesanan';

describe('STATUS_PESANAN', () => {
  it('mencakup seluruh status pesanan yang bisa muncul dari API', () => {
    expect(Object.keys(STATUS_PESANAN).sort()).toEqual(
      [
        'ORDER_CANCELLED',
        'ORDER_RECEIPT',
        'ORDER_SEND',
        'PAYMENT_EXPIRED',
        'PAYMENT_SUCCESS',
        'PROCESS_ORDER',
        'WAITING_PAYMENT',
      ].sort(),
    );
  });

  it('memberi setiap status label, pesan pembeli, dan kelas warna', () => {
    for (const [status, gaya] of Object.entries(STATUS_PESANAN)) {
      expect(gaya.label, status).toBeTruthy();
      expect(gaya.pesanPembeli, status).toBeTruthy();
      expect(gaya.kelasLencana, status).toBeTruthy();
      expect(gaya.kelasPanel, status).toBeTruthy();
    }
  });

  it('menulis pesan pembeli sebagai kalimat, bukan istilah teknis', () => {
    for (const [status, gaya] of Object.entries(STATUS_PESANAN)) {
      expect(gaya.pesanPembeli, status).not.toMatch(/_/);
      expect(gaya.pesanPembeli.length, status).toBeGreaterThan(20);
    }
  });

  it('menenangkan pembeli bahwa pesanan batal tidak menimbulkan tagihan', () => {
    expect(STATUS_PESANAN.ORDER_CANCELLED.pesanPembeli).toMatch(/tidak ada tagihan/i);
  });

  it('mengarahkan pembeli ke nomor resi saat pesanan dalam pengiriman', () => {
    expect(STATUS_PESANAN.ORDER_SEND.pesanPembeli).toMatch(/resi/i);
  });

  it('menyarankan pesan ulang untuk pesanan yang hangus', () => {
    expect(STATUS_PESANAN.PAYMENT_EXPIRED.pesanPembeli).toMatch(/pesan ulang/i);
  });
});

describe('URUTAN_STATUS', () => {
  it('memuat setiap status tepat sekali', () => {
    expect(URUTAN_STATUS).toHaveLength(Object.keys(STATUS_PESANAN).length);
    expect(new Set(URUTAN_STATUS).size).toBe(URUTAN_STATUS.length);
  });

  it('mengikuti alur pesanan, bukan abjad', () => {
    // Tab di panel admin dibaca dari kiri ke kanan mengikuti perjalanan pesanan.
    expect(URUTAN_STATUS.slice(0, 5)).toEqual([
      'WAITING_PAYMENT',
      'PAYMENT_SUCCESS',
      'PROCESS_ORDER',
      'ORDER_SEND',
      'ORDER_RECEIPT',
    ]);
  });

  it('menempatkan status akhir yang tidak sukses di belakang', () => {
    expect(URUTAN_STATUS.slice(5)).toEqual(['ORDER_CANCELLED', 'PAYMENT_EXPIRED']);
  });

  it('hanya memuat status yang punya gaya tampilan', () => {
    for (const status of URUTAN_STATUS) {
      expect(STATUS_PESANAN[status]).toBeDefined();
    }
  });
});
