import { ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MidtransService, type NotifikasiMidtrans } from '../../src/payment/midtrans.service';
import { buatConfigPalsu } from '../bantuan/prisma-palsu';
import type { ConfigService } from '@nestjs/config';

const SERVER_KEY = 'SB-Mid-server-rahasia';
const CLIENT_KEY = 'SB-Mid-client-publik';

function buatService(tambahan: Record<string, string> = {}) {
  const config = buatConfigPalsu({
    MIDTRANS_SERVER_KEY: SERVER_KEY,
    MIDTRANS_CLIENT_KEY: CLIENT_KEY,
    MIDTRANS_PRODUKSI: 'false',
    ...tambahan,
  });
  return new MidtransService(config as unknown as ConfigService);
}

/** Signature asli seperti yang dihitung Midtrans. */
function signatureSah(notif: Omit<NotifikasiMidtrans, 'signature_key'>, key = SERVER_KEY): string {
  return createHash('sha512')
    .update(`${notif.order_id}${notif.status_code}${notif.gross_amount}${key}`)
    .digest('hex');
}

function notifikasi(ubah: Partial<NotifikasiMidtrans> = {}): NotifikasiMidtrans {
  const dasar = {
    order_id: 'INV-20260817-0001-abc',
    status_code: '200',
    gross_amount: '250000.00',
    transaction_status: 'settlement',
    ...ubah,
  };
  return { ...dasar, signature_key: ubah.signature_key ?? signatureSah(dasar) };
}

describe('MidtransService.siap', () => {
  it('siap hanya bila kedua kunci terisi', () => {
    expect(buatService().siap()).toBe(true);
    expect(buatService({ MIDTRANS_SERVER_KEY: '' }).siap()).toBe(false);
    expect(buatService({ MIDTRANS_CLIENT_KEY: '' }).siap()).toBe(false);
  });

  it('menganggap kunci berisi spasi saja sebagai kosong', () => {
    // Salah tempel di .env adalah kesalahan yang paling sering terjadi, dan
    // gejalanya (401 dari Midtrans) sangat sulit dilacak.
    expect(buatService({ MIDTRANS_SERVER_KEY: '   ' }).siap()).toBe(false);
  });
});

describe('MidtransService.verifikasiSignature', () => {
  it('menerima notifikasi dengan signature yang benar', () => {
    expect(buatService().verifikasiSignature(notifikasi())).toBe(true);
  });

  it('menolak signature palsu — ini satu-satunya yang menjaga endpoint webhook', () => {
    const palsu = notifikasi({ signature_key: 'a'.repeat(128) });
    expect(buatService().verifikasiSignature(palsu)).toBe(false);
  });

  it('menolak notifikasi yang nominalnya diubah setelah ditandatangani', () => {
    const asli = notifikasi();
    const diubah = { ...asli, gross_amount: '1000.00' };
    expect(buatService().verifikasiSignature(diubah)).toBe(false);
  });

  it('menolak notifikasi yang order_id-nya diganti ke pesanan lain', () => {
    const asli = notifikasi();
    const diubah = { ...asli, order_id: 'INV-20260817-0002-abc' };
    expect(buatService().verifikasiSignature(diubah)).toBe(false);
  });

  it('menolak signature yang ditandatangani server key lain', () => {
    const dasar = {
      order_id: 'INV-20260817-0001-abc',
      status_code: '200',
      gross_amount: '250000.00',
      transaction_status: 'settlement',
    };
    const notif = { ...dasar, signature_key: signatureSah(dasar, 'kunci-penyerang') };
    expect(buatService().verifikasiSignature(notif)).toBe(false);
  });

  it('menerima signature dalam huruf besar', () => {
    const asli = notifikasi();
    const huruf = { ...asli, signature_key: asli.signature_key.toUpperCase() };
    expect(buatService().verifikasiSignature(huruf)).toBe(true);
  });

  it('menolak semuanya bila server key belum dikonfigurasi', () => {
    // Tanpa kunci tidak ada yang bisa diverifikasi; menerima apa adanya berarti
    // siapa pun bisa menandai pesanan lunas di server yang setengah terpasang.
    expect(buatService({ MIDTRANS_SERVER_KEY: '' }).verifikasiSignature(notifikasi())).toBe(false);
  });

  it('menolak signature yang tidak ada tanpa melempar galat', () => {
    const tanpa = { ...notifikasi(), signature_key: undefined as unknown as string };
    expect(buatService().verifikasiSignature(tanpa)).toBe(false);
  });
});

describe('MidtransService.petakanStatus', () => {
  const midtrans = buatService();
  const petakan = (transaction_status: string, fraud_status?: string) =>
    midtrans.petakanStatus({ transaction_status, fraud_status } as NotifikasiMidtrans);

  it('menerjemahkan settlement dan capture bersih sebagai LUNAS', () => {
    expect(petakan('settlement')).toBe('LUNAS');
    expect(petakan('capture')).toBe('LUNAS');
    expect(petakan('capture', 'accept')).toBe('LUNAS');
  });

  it('memisahkan capture yang ditandai fraud', () => {
    expect(petakan('capture', 'challenge')).toBe('DITANTANG');
    expect(petakan('capture', 'deny')).toBe('GAGAL');
  });

  it('menerjemahkan status gagal dan batal sebagai GAGAL', () => {
    expect(petakan('deny')).toBe('GAGAL');
    expect(petakan('cancel')).toBe('GAGAL');
    expect(petakan('failure')).toBe('GAGAL');
  });

  it('menerjemahkan pending dan expire', () => {
    expect(petakan('pending')).toBe('MENUNGGU');
    expect(petakan('expire')).toBe('KEDALUWARSA');
  });

  it('jatuh ke MENUNGGU untuk status yang tidak dikenal', () => {
    // Menebak "lunas" untuk status asing akan melepas barang tanpa uang;
    // menunggu paling buruk hanya menunda.
    expect(petakan('status_baru_dari_midtrans')).toBe('MENUNGGU');
  });
});

describe('MidtransService.buatTransaksi', () => {
  const permintaan = {
    orderId: 'INV-20260817-0001-abc',
    total: 250_000,
    pelanggan: { nama: 'Budi', email: 'budi@contoh.id', telepon: '081234567890' },
    items: [
      { id: 'SKU-1', price: 200_000, quantity: 1, name: 'Kemeja Flanel' },
      { id: 'ONGKIR', price: 50_000, quantity: 1, name: 'Ongkir JNE REG' },
    ],
    kedaluwarsaMenit: 60,
  };

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('menolak jalan bila kunci Midtrans belum diisi', async () => {
    const midtrans = buatService({ MIDTRANS_SERVER_KEY: '' });
    await expect(midtrans.buatTransaksi(permintaan)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('menolak bila jumlah item tidak sama dengan gross_amount', async () => {
    // Midtrans sendiri akan menolaknya; menangkap di sini memberi pesan yang
    // menyebut kedua angkanya, bukan galat mentah dari pihak ketiga.
    const timpang = { ...permintaan, total: 300_000 };
    await expect(buatService().buatTransaksi(timpang)).rejects.toThrow(/tidak sama/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('mengembalikan token Snap dan redirect url saat berhasil', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ token: 'snap-token-123', redirect_url: 'https://app.sandbox/snap/x' }),
    } as Response);

    const hasil = await buatService().buatTransaksi(permintaan);

    expect(hasil).toEqual({ token: 'snap-token-123', redirectUrl: 'https://app.sandbox/snap/x' });
  });

  it('memakai host sandbox saat MIDTRANS_PRODUKSI bukan "true"', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ token: 't', redirect_url: 'u' }),
    } as Response);

    await buatService().buatTransaksi(permintaan);

    expect(vi.mocked(fetch).mock.calls[0]![0]).toBe(
      'https://app.sandbox.midtrans.com/snap/v1/transactions',
    );
  });

  it('memakai host produksi saat MIDTRANS_PRODUKSI="true"', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ token: 't', redirect_url: 'u' }),
    } as Response);

    await buatService({ MIDTRANS_PRODUKSI: 'true' }).buatTransaksi(permintaan);

    expect(vi.mocked(fetch).mock.calls[0]![0]).toBe(
      'https://app.midtrans.com/snap/v1/transactions',
    );
  });

  it('memotong nama item di 50 karakter sesuai batas Midtrans', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ token: 't', redirect_url: 'u' }),
    } as Response);

    const namaPanjang = 'K'.repeat(80);
    await buatService().buatTransaksi({
      ...permintaan,
      items: [
        { id: 'SKU-1', price: 250_000, quantity: 1, name: namaPanjang },
      ],
    });

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0]![1]!.body as string);
    expect(body.item_details[0].name).toHaveLength(50);
  });

  it('meneruskan pesan galat Midtrans supaya admin tahu apa yang harus diperbaiki', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error_messages: ['Unknown Merchant server_key'] }),
    } as Response);

    await expect(buatService().buatTransaksi(permintaan)).rejects.toThrow(
      /Unknown Merchant server_key/,
    );
  });
});

describe('MidtransService.ambilStatus', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('mengembalikan null tanpa memanggil apa pun bila kunci belum diisi', async () => {
    expect(await buatService({ MIDTRANS_SERVER_KEY: '' }).ambilStatus('INV-1')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('mengembalikan null bila transaksinya memang belum pernah dibuat', async () => {
    // 404 di sini normal: pembeli membuka Snap lalu menutupnya tanpa membayar.
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ status_code: '404', status_message: "Transaction doesn't exist" }),
    } as Response);

    expect(await buatService().ambilStatus('INV-1')).toBeNull();
  });

  it('mengembalikan status transaksi saat Midtrans menjawab', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        order_id: 'INV-1',
        transaction_status: 'settlement',
        gross_amount: '250000.00',
      }),
    } as Response);

    const hasil = await buatService().ambilStatus('INV-1');
    expect(hasil?.transaction_status).toBe('settlement');
  });

  it('memakai Core API sandbox dan basic auth dari server key', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ transaction_status: 'pending' }),
    } as Response);

    await buatService().ambilStatus('INV/1');

    const [url, opsi] = vi.mocked(fetch).mock.calls[0]!;
    // order id ikut di-encode: nomor pesanan tidak boleh bisa keluar dari path.
    expect(url).toBe('https://api.sandbox.midtrans.com/v2/INV%2F1/status');
    expect((opsi!.headers as Record<string, string>).Authorization).toBe(
      `Basic ${Buffer.from(`${SERVER_KEY}:`).toString('base64')}`,
    );
  });

  it('melempar galat bila Midtrans menjawab tanpa isi yang bisa dibaca', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error('bukan json');
      },
    } as unknown as Response);

    await expect(buatService().ambilStatus('INV-1')).rejects.toThrow(/502/);
  });

  it('melempar galat bila jawabannya bukan status transaksi yang sah', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ status_code: '401', status_message: 'Unauthorized' }),
    } as Response);

    await expect(buatService().ambilStatus('INV-1')).rejects.toThrow(/401/);
  });
});
