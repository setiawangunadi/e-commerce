import { Injectable } from '@nestjs/common';
import type { OpsiOngkir, PenyediaOngkir, PermintaanOngkir } from './shipping.types';
import { zonaProvinsi, type Zona } from './wilayah';

/**
 * Tarif berbasis zona provinsi, dihitung sepenuhnya di dalam aplikasi.
 *
 * Dipakai sebagai cadangan agar alur checkout tetap bisa dijalankan dan diuji
 * tanpa API key Biteship. Angkanya perkiraan pasaran, BUKAN tarif resmi kurir —
 * begitu Biteship aktif, tarif nyata dari kurir yang dipakai.
 */

/** Tarif per kilogram (Rupiah) untuk layanan reguler di tiap zona. */
const TARIF_REGULER_PER_KG: Record<Zona, number> = {
  1: 10_000,
  2: 14_000,
  3: 22_000,
  4: 32_000,
  5: 55_000,
};

interface Layanan {
  kurir: string;
  layanan: string;
  nama: string;
  /** Pengali terhadap tarif reguler zona. */
  pengali: number;
  /** Estimasi hari kerja per zona: [min, max] ditambah offset zona. */
  hariDasar: [number, number];
}

const LAYANAN: Layanan[] = [
  { kurir: 'JNE', layanan: 'REG', nama: 'Reguler', pengali: 1, hariDasar: [2, 3] },
  { kurir: 'JNE', layanan: 'YES', nama: 'Express Besok Sampai', pengali: 1.85, hariDasar: [1, 1] },
  { kurir: 'J&T', layanan: 'EZ', nama: 'Reguler', pengali: 0.95, hariDasar: [2, 4] },
  { kurir: 'SiCepat', layanan: 'REG', nama: 'Reguler', pengali: 0.92, hariDasar: [2, 3] },
  { kurir: 'SiCepat', layanan: 'HALU', nama: 'Hemat (Lebih Lama)', pengali: 0.7, hariDasar: [4, 7] },
  { kurir: 'AnterAja', layanan: 'REG', nama: 'Reguler', pengali: 0.98, hariDasar: [2, 4] },
];

@Injectable()
export class TarifLokalProvider implements PenyediaOngkir {
  readonly nama = 'tarif-lokal';

  siap(): boolean {
    return true;
  }

  async hitung(permintaan: PermintaanOngkir): Promise<OpsiOngkir[]> {
    const zona = zonaProvinsi(permintaan.tujuan.provinsi);

    // Kurir menagih per kilogram dibulatkan ke atas, minimal 1 kg.
    const kg = Math.max(1, Math.ceil(permintaan.berat / 1000));
    const dasar = TARIF_REGULER_PER_KG[zona];
    const offsetHari = zona - 1;

    return LAYANAN.map((l) => {
      const ongkir = bulatkanKeRatusan(dasar * kg * l.pengali);
      const min = l.hariDasar[0] + offsetHari;
      const max = l.hariDasar[1] + offsetHari;
      const estimasi = min === max ? `${min} hari` : `${min}-${max} hari`;

      return {
        kode: `${l.kurir.toLowerCase()}:${l.layanan}`,
        kurir: l.kurir,
        layanan: l.layanan,
        nama: l.nama,
        deskripsi: `Estimasi ${estimasi} kerja`,
        estimasi,
        ongkir,
      };
    }).sort((a, b) => a.ongkir - b.ongkir);
  }
}

/** Ongkir dalam Rupiah tidak pernah berakhiran satuan/puluhan. */
function bulatkanKeRatusan(nilai: number): number {
  return Math.ceil(nilai / 500) * 500;
}
