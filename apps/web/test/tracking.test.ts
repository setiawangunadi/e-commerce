import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EVENT_CONSENT,
  KUNCI_CONSENT,
  KUNCI_UTM,
  bacaAtribusi,
  bacaPersetujuan,
  lacakLihatProduk,
  lacakMulaiCheckout,
  lacakPembelian,
  lacakTambahKeranjang,
  rekamAtribusi,
  simpanPersetujuan,
} from '@/lib/tracking';

/** Mengganti URL halaman tanpa memuat ulang jsdom. */
function bukaUrl(url: string) {
  window.history.replaceState({}, '', url);
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  bukaUrl('/');
  delete window.fbq;
  delete window.gtag;
  delete window.dataLayer;
});

describe('persetujuan cookie', () => {
  it('belum ada keputusan untuk pengunjung baru', () => {
    expect(bacaPersetujuan()).toBeNull();
  });

  it('menyimpan dan membaca kembali keputusan pengunjung', () => {
    simpanPersetujuan('diterima');
    expect(bacaPersetujuan()).toBe('diterima');

    simpanPersetujuan('ditolak');
    expect(bacaPersetujuan()).toBe('ditolak');
  });

  it('mengabaikan nilai localStorage yang tidak dikenal', () => {
    // Nilai sisa dari versi lama tidak boleh diperlakukan sebagai persetujuan.
    window.localStorage.setItem(KUNCI_CONSENT, 'mungkin');

    expect(bacaPersetujuan()).toBeNull();
  });

  it('memberi tahu komponen lain lewat event saat keputusan berubah', () => {
    const pendengar = vi.fn();
    window.addEventListener(EVENT_CONSENT, pendengar);

    simpanPersetujuan('diterima');

    expect(pendengar).toHaveBeenCalledOnce();
    expect((pendengar.mock.calls[0]![0] as CustomEvent).detail).toBe('diterima');
    window.removeEventListener(EVENT_CONSENT, pendengar);
  });
});

describe('atribusi UTM', () => {
  it('merekam seluruh parameter utm dari URL iklan', () => {
    bukaUrl('/?utm_source=facebook&utm_medium=cpc&utm_campaign=agustus&utm_content=video-a&utm_term=kemeja');

    rekamAtribusi();

    expect(bacaAtribusi()).toEqual({
      utmSource: 'facebook',
      utmMedium: 'cpc',
      utmCampaign: 'agustus',
      utmContent: 'video-a',
      utmTerm: 'kemeja',
    });
  });

  it('menyertakan slug landing page bila diberikan', () => {
    bukaUrl('/lp/promo?utm_source=facebook');

    rekamAtribusi('promo');

    expect(bacaAtribusi().landingSlug).toBe('promo');
  });

  it('tidak menyimpan apa pun bila URL-nya tanpa parameter', () => {
    rekamAtribusi();

    expect(window.sessionStorage.getItem(KUNCI_UTM)).toBeNull();
    expect(bacaAtribusi()).toEqual({});
  });

  it('KUNJUNGAN PERTAMA YANG MENANG — kampanye asal tidak tertimpa', () => {
    // Pembeli yang datang dari iklan lalu berkeliling situs tidak boleh
    // kehilangan kampanye yang membawanya ke sini.
    bukaUrl('/?utm_source=facebook&utm_campaign=agustus');
    rekamAtribusi();

    bukaUrl('/?utm_source=google&utm_campaign=september');
    rekamAtribusi();

    expect(bacaAtribusi().utmSource).toBe('facebook');
    expect(bacaAtribusi().utmCampaign).toBe('agustus');
  });

  it('masih bisa melengkapi atribusi bila kunjungan pertama tanpa utm_source', () => {
    bukaUrl('/lp/promo');
    rekamAtribusi('promo');

    bukaUrl('/?utm_source=facebook');
    rekamAtribusi();

    expect(bacaAtribusi()).toEqual({ landingSlug: 'promo', utmSource: 'facebook' });
  });

  it('memotong nilai UTM yang sangat panjang', () => {
    bukaUrl(`/?utm_campaign=${'a'.repeat(500)}`);

    rekamAtribusi();

    expect(bacaAtribusi().utmCampaign).toHaveLength(200);
  });

  it('mengembalikan objek kosong bila isi sessionStorage rusak', () => {
    // Halaman checkout tidak boleh jatuh gara-gara data atribusi yang korup.
    window.sessionStorage.setItem(KUNCI_UTM, '{bukan json');

    expect(bacaAtribusi()).toEqual({});
  });

  it('memakai sessionStorage, bukan cookie — datanya tidak perlu ikut tiap request', () => {
    bukaUrl('/?utm_source=facebook');

    rekamAtribusi();

    expect(window.sessionStorage.getItem(KUNCI_UTM)).not.toBeNull();
    expect(document.cookie).not.toContain('utm');
  });
});

describe('pengiriman event — aman walau skrip pihak ketiga tidak dimuat', () => {
  it('tidak melempar galat saat fbq dan gtag belum ada', () => {
    // Pemblokir iklan sangat umum; halaman tidak boleh rusak karenanya.
    expect(() =>
      lacakLihatProduk({ id: 'p1', nama: 'Kemeja', harga: 189_000 }),
    ).not.toThrow();
    expect(() =>
      lacakTambahKeranjang({ id: 'p1', nama: 'Kemeja', harga: 189_000 }),
    ).not.toThrow();
    expect(() => lacakMulaiCheckout(200_000)).not.toThrow();
  });

  it('mengirim ViewContent ke Meta dan view_item ke Google', () => {
    window.fbq = vi.fn() as never;
    window.gtag = vi.fn();

    lacakLihatProduk({ id: 'p1', nama: 'Kemeja', harga: 189_000 });

    expect(window.fbq).toHaveBeenCalledWith(
      'track',
      'ViewContent',
      expect.objectContaining({ content_ids: ['p1'], value: 189_000, currency: 'IDR' }),
    );
    expect(window.gtag).toHaveBeenCalledWith(
      'event',
      'view_item',
      expect.objectContaining({ currency: 'IDR', value: 189_000 }),
    );
  });

  it('mengalikan nilai AddToCart dengan jumlah barang', () => {
    window.fbq = vi.fn() as never;

    lacakTambahKeranjang({ id: 'p1', nama: 'Kemeja', harga: 189_000, jumlah: 3 });

    expect(window.fbq).toHaveBeenCalledWith(
      'track',
      'AddToCart',
      expect.objectContaining({ value: 567_000 }),
    );
  });

  it('menganggap jumlah kosong sebagai satu barang', () => {
    window.fbq = vi.fn() as never;

    lacakTambahKeranjang({ id: 'p1', nama: 'Kemeja', harga: 189_000 });

    expect(window.fbq).toHaveBeenCalledWith(
      'track',
      'AddToCart',
      expect.objectContaining({ value: 189_000 }),
    );
  });

  it('mengirim InitiateCheckout dengan nilai keranjang', () => {
    window.gtag = vi.fn();

    lacakMulaiCheckout(250_000);

    expect(window.gtag).toHaveBeenCalledWith(
      'event',
      'begin_checkout',
      expect.objectContaining({ value: 250_000, currency: 'IDR' }),
    );
  });
});

describe('lacakPembelian', () => {
  beforeEach(() => {
    window.fbq = vi.fn() as never;
    window.gtag = vi.fn();
  });

  it('mengirim Purchase ke Meta dan Google', () => {
    lacakPembelian({ nomor: 'INV-20260817-0001', nilai: 220_000 });

    expect(window.fbq).toHaveBeenCalledWith(
      'track',
      'Purchase',
      expect.objectContaining({ value: 220_000, currency: 'IDR' }),
    );
    expect(window.gtag).toHaveBeenCalledWith(
      'event',
      'purchase',
      expect.objectContaining({ transaction_id: 'INV-20260817-0001', value: 220_000 }),
    );
  });

  it('HANYA MENGIRIM SEKALI per nomor pesanan', () => {
    // Halaman status pesanan bisa dibuka berkali-kali; konversi ganda merusak
    // laporan iklan dan membuat ROAS tampak lebih baik dari kenyataan.
    lacakPembelian({ nomor: 'INV-20260817-0001', nilai: 220_000 });
    lacakPembelian({ nomor: 'INV-20260817-0001', nilai: 220_000 });
    lacakPembelian({ nomor: 'INV-20260817-0001', nilai: 220_000 });

    expect(window.fbq).toHaveBeenCalledTimes(1);
    expect(window.gtag).toHaveBeenCalledTimes(1);
  });

  it('tetap mengirim untuk pesanan berbeda', () => {
    lacakPembelian({ nomor: 'INV-20260817-0001', nilai: 220_000 });
    lacakPembelian({ nomor: 'INV-20260817-0002', nilai: 150_000 });

    expect(window.fbq).toHaveBeenCalledTimes(2);
  });

  it('mengirim konversi Google Ads bila id dan labelnya lengkap', () => {
    lacakPembelian({
      nomor: 'INV-20260817-0001',
      nilai: 220_000,
      googleAdsId: 'AW-123456789',
      googleAdsLabel: 'abcDEF',
    });

    expect(window.gtag).toHaveBeenCalledWith(
      'event',
      'conversion',
      expect.objectContaining({ send_to: 'AW-123456789/abcDEF', value: 220_000 }),
    );
  });

  it('tidak mengirim konversi Google Ads bila labelnya kosong', () => {
    // Konversi tanpa label tidak pernah tercatat di Google Ads, dan
    // mengirimnya hanya menutupi kesalahan konfigurasi.
    lacakPembelian({
      nomor: 'INV-20260817-0001',
      nilai: 220_000,
      googleAdsId: 'AW-123456789',
      googleAdsLabel: null,
    });

    const eventGoogle = vi.mocked(window.gtag!).mock.calls.map((c) => c[1]);
    expect(eventGoogle).not.toContain('conversion');
  });
});
