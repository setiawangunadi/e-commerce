import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { config, proxy } from '@/proxy';
import { NAMA_COOKIE } from '@/lib/sesi';

function permintaan(path: string, opsi: { punyaSesi?: boolean } = {}) {
  const req = new NextRequest(new URL(path, 'http://localhost:3000'));
  if (opsi.punyaSesi) req.cookies.set(NAMA_COOKIE, 'token-sesi');
  return req;
}

/** Lokasi tujuan redirect, atau null bila request diteruskan apa adanya. */
function tujuanRedirect(res: Response): URL | null {
  const lokasi = res.headers.get('location');
  return lokasi ? new URL(lokasi) : null;
}

describe('proxy — penjagaan rute admin', () => {
  it('mengalihkan pengunjung tanpa sesi ke halaman login', () => {
    const tujuan = tujuanRedirect(proxy(permintaan('/admin/produk')));

    expect(tujuan?.pathname).toBe('/admin/login');
  });

  it('MENGINGAT halaman yang dituju supaya admin kembali ke sana setelah masuk', () => {
    const tujuan = tujuanRedirect(proxy(permintaan('/admin/pesanan/123')));

    expect(tujuan?.searchParams.get('lanjut')).toBe('/admin/pesanan/123');
  });

  it('meneruskan admin yang sudah punya sesi', () => {
    expect(tujuanRedirect(proxy(permintaan('/admin/produk', { punyaSesi: true })))).toBeNull();
  });

  it('membiarkan halaman login terbuka untuk yang belum masuk', () => {
    expect(tujuanRedirect(proxy(permintaan('/admin/login')))).toBeNull();
  });

  it('melempar admin yang sudah masuk dari halaman login ke dashboard', () => {
    const tujuan = tujuanRedirect(proxy(permintaan('/admin/login', { punyaSesi: true })));

    expect(tujuan?.pathname).toBe('/admin');
  });

  it('menjaga halaman dashboard admin itu sendiri', () => {
    expect(tujuanRedirect(proxy(permintaan('/admin')))?.pathname).toBe('/admin/login');
  });

  it('HANYA memeriksa keberadaan cookie, bukan keabsahan tokennya', () => {
    // Proxy berjalan di setiap navigasi dan tidak boleh memanggil API.
    // Validasi sesungguhnya ada di layout admin dan guard API.
    const req = permintaan('/admin/produk');
    req.cookies.set(NAMA_COOKIE, 'token-basi-yang-sudah-tidak-berlaku');

    expect(tujuanRedirect(proxy(req))).toBeNull();
  });
});

describe('cakupan proxy', () => {
  it('hanya berjalan di rute admin — etalase tetap statis dan cepat', () => {
    expect(config.matcher).toEqual(['/admin/:path*']);
  });
});
