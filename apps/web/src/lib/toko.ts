/** Identitas toko, dipakai di header, footer, dan metadata SEO. */
export const TOKO = {
  nama: process.env.NEXT_PUBLIC_NAMA_TOKO ?? 'SRN Cullezione',
  tagline: process.env.NEXT_PUBLIC_TAGLINE_TOKO ?? 'Koleksi busana pilihan',
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP ?? '6281234567890',
  /** Dipakai untuk URL absolut di pesan WhatsApp, canonical, dan structured data. */
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
} as const;

export function tautanWhatsApp(pesan: string): string {
  return `https://wa.me/${TOKO.whatsapp}?text=${encodeURIComponent(pesan)}`;
}
