'use client';

import type { TrackingLanding } from './types';

/**
 * Lapisan tipis di atas Meta Pixel & Google gtag.
 *
 * Aturan yang dipegang di sini:
 * 1. Tidak ada skrip pihak ketiga yang dimuat sebelum pengunjung menyetujui
 *    cookie analitik/iklan (UU PDP — research/business/11-legal-compliance.md).
 * 2. Semua pemanggilan aman dipakai walau skripnya belum/tidak pernah dimuat,
 *    sehingga halaman tidak pernah rusak gara-gara pemblokir iklan.
 */

export const KUNCI_CONSENT = 'persetujuan_cookie';
export const KUNCI_UTM = 'atribusi_iklan';
export const EVENT_CONSENT = 'consent:berubah';

export type Persetujuan = 'diterima' | 'ditolak';

export interface Atribusi {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  landingSlug?: string;
}

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[]; callMethod?: unknown };
    _fbq?: unknown;
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

// --- Persetujuan ------------------------------------------------------------

export function bacaPersetujuan(): Persetujuan | null {
  if (typeof window === 'undefined') return null;
  const nilai = window.localStorage.getItem(KUNCI_CONSENT);
  return nilai === 'diterima' || nilai === 'ditolak' ? nilai : null;
}

export function simpanPersetujuan(nilai: Persetujuan): void {
  window.localStorage.setItem(KUNCI_CONSENT, nilai);
  window.dispatchEvent(new CustomEvent(EVENT_CONSENT, { detail: nilai }));
}

// --- Atribusi UTM -----------------------------------------------------------

const FIELD_UTM = [
  ['utm_source', 'utmSource'],
  ['utm_medium', 'utmMedium'],
  ['utm_campaign', 'utmCampaign'],
  ['utm_content', 'utmContent'],
  ['utm_term', 'utmTerm'],
] as const;

/**
 * Merekam UTM dari URL saat pengunjung mendarat.
 *
 * Disimpan di sessionStorage, bukan cookie: datanya hanya perlu bertahan
 * selama satu kunjungan sampai checkout, dan tidak perlu ikut terkirim ke
 * server di setiap request.
 *
 * Atribusi disimpan tanpa menunggu persetujuan cookie karena ini bukan
 * pelacakan lintas situs — hanya mencatat dari kampanye mana pesanan ini
 * datang, setara mencatat nomor referensi pesanan.
 */
export function rekamAtribusi(landingSlug?: string): void {
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams(window.location.search);
  const baru: Atribusi = {};

  for (const [param, field] of FIELD_UTM) {
    const nilai = params.get(param);
    if (nilai) baru[field] = nilai.slice(0, 200);
  }
  if (landingSlug) baru.landingSlug = landingSlug;

  if (Object.keys(baru).length === 0) return;

  // Kunjungan pertama yang menang: bila pembeli datang dari iklan lalu
  // berkeliling situs, kampanye asalnya tidak tertimpa.
  const sudahAda = bacaAtribusi();
  if (sudahAda.utmSource && baru.utmSource) return;

  window.sessionStorage.setItem(KUNCI_UTM, JSON.stringify({ ...sudahAda, ...baru }));
}

export function bacaAtribusi(): Atribusi {
  if (typeof window === 'undefined') return {};
  try {
    const mentah = window.sessionStorage.getItem(KUNCI_UTM);
    return mentah ? (JSON.parse(mentah) as Atribusi) : {};
  } catch {
    return {};
  }
}

// --- Pemuatan skrip ---------------------------------------------------------

function muatSkrip(src: string, atribut: Record<string, string> = {}): void {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const s = document.createElement('script');
  s.src = src;
  s.async = true;
  for (const [k, v] of Object.entries(atribut)) s.setAttribute(k, v);
  document.head.appendChild(s);
}

let sudahDipasang = false;

/** Memasang pixel & gtag. Hanya boleh dipanggil setelah pengunjung setuju. */
export function pasangTracking(tracking: TrackingLanding): void {
  if (typeof window === 'undefined' || sudahDipasang) return;
  sudahDipasang = true;

  if (tracking.metaPixelId) {
    // Stub antrean bawaan Meta: pemanggilan fbq sebelum skrip selesai dimuat
    // ditampung dulu, tidak hilang.
    if (!window.fbq) {
      const fbq = function (...args: unknown[]) {
        if (fbq.callMethod) (fbq.callMethod as (...a: unknown[]) => void)(...args);
        else (fbq.queue as unknown[]).push(args);
      } as NonNullable<Window['fbq']>;
      fbq.queue = [];
      window.fbq = fbq;
      window._fbq = fbq;
    }
    muatSkrip('https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', tracking.metaPixelId);
    window.fbq('track', 'PageView');
  }

  const idGoogle = [tracking.ga4Id, tracking.googleAdsId].filter(Boolean) as string[];
  if (idGoogle.length > 0) {
    window.dataLayer = window.dataLayer ?? [];
    window.gtag =
      window.gtag ??
      function (...args: unknown[]) {
        window.dataLayer!.push(args);
      };
    muatSkrip(`https://www.googletagmanager.com/gtag/js?id=${idGoogle[0]}`);
    window.gtag('js', new Date());
    for (const id of idGoogle) window.gtag('config', id);
  }

  if (tracking.gtmId) {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    muatSkrip(`https://www.googletagmanager.com/gtm.js?id=${tracking.gtmId}`);
  }
}

// --- Event ------------------------------------------------------------------

export interface DataProdukEvent {
  id: string;
  nama: string;
  harga: number;
  jumlah?: number;
}

function kirimMeta(nama: string, data: Record<string, unknown>): void {
  window.fbq?.('track', nama, data);
}

function kirimGoogle(nama: string, data: Record<string, unknown>): void {
  window.gtag?.('event', nama, data);
}

export function lacakLihatProduk(p: DataProdukEvent): void {
  if (typeof window === 'undefined') return;
  kirimMeta('ViewContent', {
    content_ids: [p.id],
    content_name: p.nama,
    content_type: 'product',
    value: p.harga,
    currency: 'IDR',
  });
  kirimGoogle('view_item', {
    currency: 'IDR',
    value: p.harga,
    items: [{ item_id: p.id, item_name: p.nama, price: p.harga }],
  });
}

export function lacakTambahKeranjang(p: DataProdukEvent): void {
  if (typeof window === 'undefined') return;
  const jumlah = p.jumlah ?? 1;
  kirimMeta('AddToCart', {
    content_ids: [p.id],
    content_name: p.nama,
    content_type: 'product',
    value: p.harga * jumlah,
    currency: 'IDR',
  });
  kirimGoogle('add_to_cart', {
    currency: 'IDR',
    value: p.harga * jumlah,
    items: [{ item_id: p.id, item_name: p.nama, price: p.harga, quantity: jumlah }],
  });
}

export function lacakMulaiCheckout(nilai: number): void {
  if (typeof window === 'undefined') return;
  kirimMeta('InitiateCheckout', { value: nilai, currency: 'IDR' });
  kirimGoogle('begin_checkout', { currency: 'IDR', value: nilai });
}

/**
 * Event pembelian. Dijaga agar hanya terkirim sekali per pesanan — halaman
 * status bisa dibuka berkali-kali, dan konversi ganda merusak laporan iklan.
 */
export function lacakPembelian(params: {
  nomor: string;
  nilai: number;
  googleAdsId?: string | null;
  googleAdsLabel?: string | null;
}): void {
  if (typeof window === 'undefined') return;

  const kunci = `purchase_terkirim:${params.nomor}`;
  if (window.localStorage.getItem(kunci)) return;
  window.localStorage.setItem(kunci, '1');

  kirimMeta('Purchase', {
    value: params.nilai,
    currency: 'IDR',
    content_type: 'product',
  });
  kirimGoogle('purchase', {
    transaction_id: params.nomor,
    currency: 'IDR',
    value: params.nilai,
  });

  // Konversi Google Ads butuh pasangan id/label yang spesifik per kampanye.
  if (params.googleAdsId && params.googleAdsLabel) {
    kirimGoogle('conversion', {
      send_to: `${params.googleAdsId}/${params.googleAdsLabel}`,
      value: params.nilai,
      currency: 'IDR',
      transaction_id: params.nomor,
    });
  }
}
