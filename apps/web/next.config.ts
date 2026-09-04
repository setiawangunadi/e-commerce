import type { NextConfig } from 'next';

const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000');
const pengembangan = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  // Menghasilkan .next/standalone berisi server + hanya dependency yang
  // benar-benar dipakai. Image produksi jadi jauh lebih kecil dan tidak perlu
  // membawa node_modules lengkap.
  output: 'standalone',
  // Repo ini monorepo npm workspaces; tanpa penunjuk ini Next salah menebak
  // akar workspace saat menelusuri berkas untuk build standalone.
  outputFileTracingRoot: new URL('../..', import.meta.url).pathname,

  // Header keamanan untuk halaman. API punya set sendiri lewat helmet.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Etalase tidak butuh satu pun dari perangkat ini.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },

  images: {
    // Gambar produk dilayani oleh API (development) — di production diganti
    // domain Cloudflare R2 / CDN, lihat research/tech/09-storage-cdn-media.md
    remotePatterns: [
      {
        protocol: apiUrl.protocol.replace(':', '') as 'http' | 'https',
        hostname: apiUrl.hostname,
        port: apiUrl.port || undefined,
        pathname: '/uploads/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    // Next.js 16 memblokir optimasi gambar dari IP lokal secara default (proteksi SSRF).
    // Hanya dibuka di development, karena di sana API memang di localhost:4000.
    // JANGAN aktifkan di production — lihat catatan SSRF di dokumentasi Next.js.
    dangerouslyAllowLocalIP: pengembangan,
  },
};

export default nextConfig;
