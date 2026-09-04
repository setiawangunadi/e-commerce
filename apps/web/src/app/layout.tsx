import type { Metadata, Viewport } from 'next';
import { TOKO } from '@/lib/toko';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: `${TOKO.nama} — ${TOKO.tagline}`,
    template: `%s | ${TOKO.nama}`,
  },
  description: `${TOKO.nama} menjual ${TOKO.tagline.toLowerCase()}. Pengiriman ke seluruh Indonesia, pembayaran lewat transfer bank, e-wallet, dan QRIS.`,
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#123d5b',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // `data-scroll-behavior` memberi tahu Next.js bahwa smooth scroll di CSS
    // memang disengaja, sehingga perpindahan antar halaman tetap melompat
    // ke atas seketika alih-alih ikut beranimasi.
    <html lang="id" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
