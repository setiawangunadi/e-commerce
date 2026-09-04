import { NextResponse, type NextRequest } from 'next/server';
import { NAMA_COOKIE } from '@/lib/sesi';

/**
 * Next.js 16 mengganti nama `middleware` menjadi `proxy`.
 *
 * Di sini hanya dicek *keberadaan* cookie — bukan validitas tokennya, karena
 * proxy berjalan sebelum request sampai ke halaman dan tidak boleh memanggil API
 * di setiap navigasi. Validasi token sesungguhnya dilakukan di layout admin
 * lewat `ambilProfil()`, dan pada akhirnya oleh guard di API.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const punyaSesi = request.cookies.has(NAMA_COOKIE);

  if (pathname === '/admin/login') {
    // Sudah punya sesi tapi membuka halaman login → langsung ke dashboard.
    if (punyaSesi) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.next();
  }

  if (!punyaSesi) {
    const tujuan = new URL('/admin/login', request.url);
    tujuan.searchParams.set('lanjut', pathname);
    return NextResponse.redirect(tujuan);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
