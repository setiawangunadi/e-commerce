import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { OpsiOngkir, PenyediaOngkir, PermintaanOngkir } from './shipping.types';

/**
 * Biteship — agregator kurir Indonesia (JNE, J&T, SiCepat, AnterAja, dll)
 * dalam satu API. Dipilih di research/tech/06-shipping-integration.md.
 *
 * Aktif hanya bila BITESHIP_API_KEY diisi; selain itu ShippingService memakai
 * TarifLokalProvider.
 */
@Injectable()
export class BiteshipProvider implements PenyediaOngkir {
  readonly nama = 'biteship';
  private readonly logger = new Logger(BiteshipProvider.name);

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly asalKodePos: string;
  private readonly asalArea: string;
  private readonly kurirDipakai: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('BITESHIP_API_KEY', '').trim();
    this.baseUrl = config.get<string>('BITESHIP_BASE_URL', 'https://api.biteship.com').replace(/\/$/, '');
    this.asalKodePos = config.get<string>('GUDANG_KODE_POS', '').trim();
    this.asalArea = config.get<string>('GUDANG_AREA_ID', '').trim();
    this.kurirDipakai = config.get<string>(
      'BITESHIP_KURIR',
      'jne,jnt,sicepat,anteraja,pos,tiki',
    );
  }

  siap(): boolean {
    // Butuh API key DAN titik asal — tanpa asal, Biteship tidak bisa menghitung.
    return this.apiKey.length > 0 && (this.asalArea.length > 0 || this.asalKodePos.length > 0);
  }

  async hitung(permintaan: PermintaanOngkir): Promise<OpsiOngkir[]> {
    const tujuan = permintaan.tujuan;

    const muatan: Record<string, unknown> = {
      couriers: this.kurirDipakai,
      items: [
        {
          name: 'Paket belanja',
          value: permintaan.nilaiBarang,
          weight: Math.max(1, permintaan.berat), // gram
          quantity: 1,
        },
      ],
      ...(this.asalArea
        ? { origin_area_id: this.asalArea }
        : { origin_postal_code: Number(this.asalKodePos) }),
      destination_postal_code: Number(tujuan.kodePos),
    };

    const res = await fetch(`${this.baseUrl}/v1/rates/couriers`, {
      method: 'POST',
      headers: {
        Authorization: this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(muatan),
      // Checkout tidak boleh menggantung menunggu API pihak ketiga.
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const teks = await res.text().catch(() => '');
      throw new Error(`Biteship membalas ${res.status}: ${teks.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      success?: boolean;
      error?: string;
      pricing?: BiteshipPricing[];
    };

    if (data.success === false) {
      throw new Error(data.error ?? 'Biteship menolak permintaan');
    }

    const opsi = (data.pricing ?? [])
      .filter((p) => typeof p.price === 'number' && p.price > 0)
      .map((p) => {
        const estimasi = rapikanDurasi(p.shipment_duration_range, p.shipment_duration_unit, p.duration);
        return {
          kode: `${p.courier_code}:${p.courier_service_code}`,
          kurir: p.courier_name ?? p.courier_code.toUpperCase(),
          layanan: p.courier_service_code,
          nama: p.courier_service_name ?? p.courier_service_code,
          deskripsi: estimasi ? `Estimasi ${estimasi}` : (p.description ?? ''),
          estimasi: estimasi ?? '-',
          ongkir: Math.round(p.price),
        };
      })
      .sort((a, b) => a.ongkir - b.ongkir);

    this.logger.log(`Biteship mengembalikan ${opsi.length} opsi untuk ${tujuan.kodePos}`);
    return opsi;
  }
}

interface BiteshipPricing {
  courier_code: string;
  courier_name?: string;
  courier_service_code: string;
  courier_service_name?: string;
  description?: string;
  duration?: string;
  shipment_duration_range?: string;
  shipment_duration_unit?: string;
  price: number;
}

function rapikanDurasi(
  rentang?: string,
  satuan?: string,
  cadangan?: string,
): string | null {
  if (rentang) {
    const unit = satuan === 'days' ? 'hari' : satuan === 'hours' ? 'jam' : (satuan ?? 'hari');
    return `${rentang} ${unit}`;
  }
  return cadangan ?? null;
}
