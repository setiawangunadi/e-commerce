import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { BiteshipProvider } from './biteship.provider';
import { TarifLokalProvider } from './tarif-lokal.provider';
import {
  daftarKecamatan,
  daftarKota,
  daftarProvinsi,
  kecamatanValid,
  kotaValid,
  provinsiValid,
} from './wilayah';
import type { HasilOngkir, OpsiOngkir, PermintaanOngkir } from './shipping.types';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);

  constructor(
    private readonly biteship: BiteshipProvider,
    private readonly tarifLokal: TarifLokalProvider,
  ) {}

  daftarProvinsi() {
    return daftarProvinsi().map((p) => p.nama);
  }

  /** Kota/kabupaten di bawah satu provinsi — untuk dropdown bertingkat. */
  daftarKota(provinsi: string) {
    if (!provinsiValid(provinsi)) {
      throw new BadRequestException('Provinsi tidak dikenali');
    }
    return daftarKota(provinsi).map((k) => k.nama);
  }

  daftarKecamatan(provinsi: string, kota: string) {
    if (!provinsiValid(provinsi)) {
      throw new BadRequestException('Provinsi tidak dikenali');
    }
    return daftarKecamatan(provinsi, kota).map((k) => k.nama);
  }

  /**
   * Menghitung ongkir lewat Biteship bila dikonfigurasi, dan jatuh ke tarif
   * lokal bila belum ada API key atau Biteship sedang bermasalah.
   *
   * Checkout tidak boleh gagal total hanya karena API kurir down — pembeli
   * tetap bisa menyelesaikan pesanan.
   */
  async hitungOngkir(permintaan: PermintaanOngkir): Promise<HasilOngkir> {
    this.validasi(permintaan);

    if (this.biteship.siap()) {
      try {
        const opsi = await this.biteship.hitung(permintaan);
        if (opsi.length > 0) {
          return { opsi, penyedia: this.biteship.nama };
        }
        this.logger.warn('Biteship tidak mengembalikan opsi apa pun, memakai tarif lokal');
      } catch (e) {
        this.logger.error(
          `Biteship gagal, memakai tarif lokal: ${e instanceof Error ? e.message : String(e)}`,
        );
      }

      const opsi = await this.tarifLokal.hitung(permintaan);
      return {
        opsi,
        penyedia: this.tarifLokal.nama,
        catatan: 'Tarif perkiraan — layanan kurir sedang tidak bisa dihubungi.',
      };
    }

    const opsi = await this.tarifLokal.hitung(permintaan);
    return {
      opsi,
      penyedia: this.tarifLokal.nama,
      catatan: 'Tarif perkiraan. Isi BITESHIP_API_KEY untuk memakai tarif kurir sungguhan.',
    };
  }

  /**
   * Memastikan opsi yang dipilih pembeli benar-benar ada dan ongkirnya sesuai.
   *
   * Wajib dipanggil ulang saat pesanan dibuat: tanpa ini, pembeli bisa
   * mengirim ongkir Rp0 langsung ke endpoint order.
   */
  async pastikanOpsiValid(
    permintaan: PermintaanOngkir,
    kodeOpsi: string,
  ): Promise<{ opsi: OpsiOngkir; penyedia: string }> {
    const hasil = await this.hitungOngkir(permintaan);
    const opsi = hasil.opsi.find((o) => o.kode === kodeOpsi);

    if (!opsi) {
      throw new BadRequestException(
        'Opsi pengiriman tidak berlaku lagi. Silakan pilih ulang layanan kurir.',
      );
    }
    return { opsi, penyedia: hasil.penyedia };
  }

  private validasi(permintaan: PermintaanOngkir): void {
    const { tujuan, berat } = permintaan;

    if (!provinsiValid(tujuan.provinsi)) {
      throw new BadRequestException('Provinsi tujuan tidak dikenali');
    }
    // Kota diperiksa terhadap provinsinya, bukan sekadar "tidak kosong" —
    // kombinasi yang mustahil (mis. Denpasar di Aceh) berarti alamatnya salah
    // dan ongkirnya pasti meleset.
    if (!kotaValid(tujuan.provinsi, tujuan.kota)) {
      throw new BadRequestException(
        `"${tujuan.kota}" tidak ada di provinsi ${tujuan.provinsi}`,
      );
    }
    if (tujuan.kecamatan && !kecamatanValid(tujuan.provinsi, tujuan.kota, tujuan.kecamatan)) {
      throw new BadRequestException(
        `Kecamatan "${tujuan.kecamatan}" tidak ada di ${tujuan.kota}`,
      );
    }
    if (!/^\d{5}$/.test(tujuan.kodePos)) {
      throw new BadRequestException('Kode pos harus 5 digit angka');
    }
    if (berat <= 0) {
      throw new BadRequestException('Berat kiriman tidak valid');
    }
    // Batas praktis kurir reguler; di atas ini biasanya masuk layanan kargo.
    if (berat > 50_000) {
      throw new BadRequestException(
        'Berat total melebihi 50 kg. Silakan hubungi kami untuk pengiriman kargo.',
      );
    }
  }
}
