import { beforeEach } from 'vitest';

/**
 * Web Storage yang bisa diandalkan di lingkungan test.
 *
 * Node 25 memasang `localStorage`/`sessionStorage` eksperimentalnya sendiri di
 * globalThis, dan versi itu membayangi milik jsdom tanpa menyediakan API
 * Storage yang lengkap (`clear` tidak ada). Kode aplikasi memakai keduanya
 * untuk persetujuan cookie dan atribusi UTM, jadi lebih baik memasang
 * implementasi sendiri daripada bergantung pada versi Node yang sedang dipakai.
 */
class PenyimpananMemori implements Storage {
  private isi = new Map<string, string>();

  get length(): number {
    return this.isi.size;
  }

  clear(): void {
    this.isi.clear();
  }

  getItem(kunci: string): string | null {
    return this.isi.get(String(kunci)) ?? null;
  }

  key(indeks: number): string | null {
    return [...this.isi.keys()][indeks] ?? null;
  }

  removeItem(kunci: string): void {
    this.isi.delete(String(kunci));
  }

  setItem(kunci: string, nilai: string): void {
    this.isi.set(String(kunci), String(nilai));
  }
}

function pasang(nama: 'localStorage' | 'sessionStorage'): PenyimpananMemori {
  const penyimpanan = new PenyimpananMemori();
  for (const sasaran of [window, globalThis]) {
    Object.defineProperty(sasaran, nama, {
      value: penyimpanan,
      configurable: true,
      writable: true,
    });
  }
  return penyimpanan;
}

// Dipasang ulang setiap test supaya keputusan cookie atau atribusi UTM dari
// satu test tidak bocor ke test berikutnya.
beforeEach(() => {
  pasang('localStorage');
  pasang('sessionStorage');
});
