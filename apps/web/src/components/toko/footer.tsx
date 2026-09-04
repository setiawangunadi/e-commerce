import Link from 'next/link';
import { TOKO, tautanWhatsApp } from '@/lib/toko';
import type { Kategori } from '@/lib/types';

export function Footer({ kategori }: { kategori: Kategori[] }) {
  return (
    <footer className="mt-20 border-t border-neutral-200 bg-neutral-50">
      <div className="kontainer-toko py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-lg font-semibold text-merek-800">{TOKO.nama}</p>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">{TOKO.tagline}.</p>
            <a
              href={tautanWhatsApp(`Halo ${TOKO.nama}, saya mau tanya soal produk.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-merek-700 hover:text-merek-800"
            >
              Chat via WhatsApp
            </a>
          </div>

          <div>
            <p className="text-sm font-semibold text-neutral-900">Belanja</p>
            <ul className="mt-3 space-y-2 text-sm text-neutral-600">
              {kategori.slice(0, 5).map((k) => (
                <li key={k.id}>
                  <Link href={`/kategori/${k.slug}`} className="hover:text-merek-700">
                    {k.nama}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-neutral-900">Bantuan</p>
            <ul className="mt-3 space-y-2 text-sm text-neutral-600">
              <li>
                <Link href="/bantuan/cara-belanja" className="hover:text-merek-700">
                  Cara Belanja
                </Link>
              </li>
              <li>
                <Link href="/bantuan/pengiriman" className="hover:text-merek-700">
                  Info Pengiriman
                </Link>
              </li>
              <li>
                <Link href="/bantuan/retur" className="hover:text-merek-700">
                  Retur &amp; Penukaran
                </Link>
              </li>
              <li>
                <Link href="/bantuan/lacak" className="hover:text-merek-700">
                  Lacak Pesanan
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-neutral-900">Legalitas</p>
            <ul className="mt-3 space-y-2 text-sm text-neutral-600">
              <li>
                <Link href="/legal/syarat-ketentuan" className="hover:text-merek-700">
                  Syarat &amp; Ketentuan
                </Link>
              </li>
              <li>
                <Link href="/legal/kebijakan-privasi" className="hover:text-merek-700">
                  Kebijakan Privasi
                </Link>
              </li>
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-neutral-500">
              Terdaftar sebagai PSE Kominfo. Data pribadi Anda dikelola sesuai UU Perlindungan Data
              Pribadi.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-neutral-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-neutral-500">
            &copy; {new Date().getFullYear()} {TOKO.nama}. Seluruh hak cipta dilindungi.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {['QRIS', 'BCA VA', 'Mandiri VA', 'GoPay', 'OVO', 'DANA', 'COD'].map((metode) => (
              <span
                key={metode}
                className="rounded border border-neutral-300 bg-white px-2 py-1 text-[11px] font-medium text-neutral-600"
              >
                {metode}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
