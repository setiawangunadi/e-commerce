import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';

export interface ItemSnap {
  id: string;
  price: number;
  quantity: number;
  name: string;
}

export interface PermintaanSnap {
  orderId: string;
  total: number;
  pelanggan: { nama: string; email: string; telepon: string };
  items: ItemSnap[];
  kedaluwarsaMenit: number;
}

export interface HasilSnap {
  token: string;
  redirectUrl: string;
}

/**
 * Notifikasi webhook Midtrans. Hanya field yang benar-benar dipakai
 * yang diketikkan di sini.
 */
export interface NotifikasiMidtrans {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  fraud_status?: string;
  payment_type?: string;
  transaction_time?: string;
  settlement_time?: string;
}

export type HasilPembayaran = 'LUNAS' | 'MENUNGGU' | 'GAGAL' | 'KEDALUWARSA' | 'DITANTANG';

@Injectable()
export class MidtransService {
  private readonly logger = new Logger(MidtransService.name);

  private readonly serverKey: string;
  readonly clientKey: string;
  private readonly produksi: boolean;

  constructor(private readonly config: ConfigService) {
    this.serverKey = config.get<string>('MIDTRANS_SERVER_KEY', '').trim();
    this.clientKey = config.get<string>('MIDTRANS_CLIENT_KEY', '').trim();
    this.produksi = config.get<string>('MIDTRANS_PRODUKSI', 'false') === 'true';
  }

  siap(): boolean {
    return this.serverKey.length > 0 && this.clientKey.length > 0;
  }

  private get baseSnap(): string {
    return this.produksi ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com';
  }

  /** Core API punya host berbeda dari Snap. */
  private get baseApi(): string {
    return this.produksi ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com';
  }

  /**
   * Menanyakan status transaksi langsung ke Midtrans.
   *
   * Dipakai sebagai cadangan webhook: notifikasi bisa saja tidak sampai karena
   * server sedang mati, URL notifikasi salah, atau jaringan bermasalah. Tanpa
   * jalur ini, pesanan yang sudah dibayar bisa menggantung selamanya.
   *
   * Mengembalikan `null` bila transaksinya memang belum ada di Midtrans
   * (pembeli membuka Snap tapi tidak menyelesaikan apa pun).
   */
  async ambilStatus(midtransOrderId: string): Promise<NotifikasiMidtrans | null> {
    if (!this.siap()) return null;

    const res = await fetch(`${this.baseApi}/v2/${encodeURIComponent(midtransOrderId)}/status`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${Buffer.from(`${this.serverKey}:`).toString('base64')}`,
      },
      signal: AbortSignal.timeout(10_000),
    });

    const data = (await res.json().catch(() => null)) as
      | (Partial<NotifikasiMidtrans> & { status_code?: string })
      | null;

    if (!data) {
      throw new Error(`Midtrans membalas ${res.status} tanpa isi yang bisa dibaca`);
    }

    // 404 di sini bukan kegagalan: transaksinya memang belum pernah dibuat.
    if (data.status_code === '404') return null;

    if (!res.ok || !data.transaction_status) {
      throw new Error(
        `Gagal membaca status Midtrans (${data.status_code ?? res.status}): ${
          (data as { status_message?: string }).status_message ?? 'tidak diketahui'
        }`,
      );
    }

    return data as NotifikasiMidtrans;
  }

  /** Membuat transaksi Snap dan mengembalikan token untuk popup di frontend. */
  async buatTransaksi(permintaan: PermintaanSnap): Promise<HasilSnap> {
    if (!this.siap()) {
      throw new ServiceUnavailableException(
        'Pembayaran belum dikonfigurasi. Isi MIDTRANS_SERVER_KEY dan MIDTRANS_CLIENT_KEY di apps/api/.env',
      );
    }

    // Midtrans menolak transaksi bila jumlah item tidak sama persis dengan
    // gross_amount, jadi ongkir & diskon ikut dikirim sebagai baris item.
    const totalItem = permintaan.items.reduce((t, i) => t + i.price * i.quantity, 0);
    if (totalItem !== permintaan.total) {
      throw new Error(
        `Total item (${totalItem}) tidak sama dengan gross_amount (${permintaan.total})`,
      );
    }

    const res = await fetch(`${this.baseSnap}/snap/v1/transactions`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${this.serverKey}:`).toString('base64')}`,
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: permintaan.orderId,
          gross_amount: permintaan.total,
        },
        item_details: permintaan.items.map((i) => ({
          ...i,
          // Midtrans memotong nama item lebih dari 50 karakter.
          name: i.name.slice(0, 50),
        })),
        customer_details: {
          first_name: permintaan.pelanggan.nama.slice(0, 40),
          email: permintaan.pelanggan.email,
          phone: permintaan.pelanggan.telepon,
        },
        expiry: {
          unit: 'minute',
          duration: permintaan.kedaluwarsaMenit,
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });

    const data = (await res.json().catch(() => ({}))) as {
      token?: string;
      redirect_url?: string;
      error_messages?: string[];
    };

    if (!res.ok || !data.token) {
      const pesan = data.error_messages?.join(', ') ?? `HTTP ${res.status}`;
      this.logger.error(`Gagal membuat transaksi Snap: ${pesan}`);
      throw new ServiceUnavailableException(`Gagal menyiapkan pembayaran: ${pesan}`);
    }

    return { token: data.token, redirectUrl: data.redirect_url ?? '' };
  }

  /**
   * Memverifikasi keaslian notifikasi webhook.
   *
   * Signature = SHA512(order_id + status_code + gross_amount + server_key).
   * Tanpa pemeriksaan ini siapa pun bisa mengirim POST palsu dan menandai
   * pesanan sebagai lunas.
   */
  verifikasiSignature(notif: NotifikasiMidtrans): boolean {
    if (!this.serverKey) return false;

    const dihitung = createHash('sha512')
      .update(`${notif.order_id}${notif.status_code}${notif.gross_amount}${this.serverKey}`)
      .digest('hex');

    const diterima = (notif.signature_key ?? '').toLowerCase();
    return dihitung.length === diterima.length && dihitung === diterima;
  }

  /** Menerjemahkan status Midtrans ke status pembayaran internal. */
  petakanStatus(notif: NotifikasiMidtrans): HasilPembayaran {
    const status = notif.transaction_status;
    const fraud = notif.fraud_status;

    if (status === 'capture') {
      if (fraud === 'challenge') return 'DITANTANG';
      if (fraud === 'deny') return 'GAGAL';
      return 'LUNAS';
    }
    if (status === 'settlement') return 'LUNAS';
    if (status === 'pending') return 'MENUNGGU';
    if (status === 'deny' || status === 'cancel' || status === 'failure') return 'GAGAL';
    if (status === 'expire') return 'KEDALUWARSA';

    this.logger.warn(`Status transaksi Midtrans tidak dikenali: ${status}`);
    return 'MENUNGGU';
  }
}
