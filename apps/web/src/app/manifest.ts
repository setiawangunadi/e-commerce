import type { MetadataRoute } from 'next';
import { TOKO } from '@/lib/toko';

/**
 * Manifest PWA — menentukan tampilan situs saat ditambahkan ke layar utama.
 *
 * `theme_color` memakai navy logo, bukan kuningnya: warna ini mewarnai bilah
 * status ponsel, dan teks sistem di atasnya putih.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${TOKO.nama} — ${TOKO.tagline}`,
    short_name: TOKO.nama,
    description: `Belanja ${TOKO.tagline.toLowerCase()} di ${TOKO.nama}.`,
    start_url: '/',
    display: 'standalone',
    background_color: '#f5b301',
    theme_color: '#123d5b',
    lang: 'id',
    icons: [
      { src: '/ikon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/ikon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/ikon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
