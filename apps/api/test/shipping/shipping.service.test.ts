import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShippingService } from '../../src/shipping/shipping.service';
import { TarifLokalProvider } from '../../src/shipping/tarif-lokal.provider';
import type { BiteshipProvider } from '../../src/shipping/biteship.provider';
import type { PermintaanOngkir } from '../../src/shipping/shipping.types';

function permintaan(ubah: Partial<PermintaanOngkir> = {}): PermintaanOngkir {
  return {
    tujuan: { provinsi: 'Jawa Barat', kota: 'Kabupaten Bandung', kodePos: '40111' },
    berat: 1_000,
    nilaiBarang: 200_000,
    ...ubah,
  };
}

const opsiBiteship = [
  {
    kode: 'jne:REG',
    kurir: 'JNE',
    layanan: 'REG',
    nama: 'Reguler',
    deskripsi: 'Estimasi 2-3 hari',
    estimasi: '2-3 hari',
    ongkir: 18_000,
  },
];

describe('ShippingService', () => {
  let biteship: { nama: string; siap: ReturnType<typeof vi.fn>; hitung: ReturnType<typeof vi.fn> };
  let tarifLokal: TarifLokalProvider;
  let service: ShippingService;

  beforeEach(() => {
    biteship = { nama: 'biteship', siap: vi.fn().mockReturnValue(false), hitung: vi.fn() };
    tarifLokal = new TarifLokalProvider();
    service = new ShippingService(biteship as unknown as BiteshipProvider, tarifLokal);
  });

  describe('validasi alamat tujuan', () => {
    it('menolak provinsi yang tidak dikenali', async () => {
      await expect(
        service.hitungOngkir(permintaan({ tujuan: { provinsi: 'Wakanda', kota: 'X', kodePos: '40111' } })),
      ).rejects.toThrow(/provinsi tujuan tidak dikenali/i);
    });

    it('menolak kota yang tidak ada di provinsi yang dipilih', async () => {
      // Kombinasi mustahil berarti alamatnya salah — ongkirnya pasti meleset.
      await expect(
        service.hitungOngkir(
          permintaan({ tujuan: { provinsi: 'Aceh', kota: 'Kabupaten Bandung', kodePos: '40111' } }),
        ),
      ).rejects.toThrow(/tidak ada di provinsi Aceh/);
    });

    it('menolak kecamatan yang tidak ada di kotanya', async () => {
      await expect(
        service.hitungOngkir(
          permintaan({
            tujuan: {
              provinsi: 'Jawa Barat',
              kota: 'Kabupaten Bandung',
              kecamatan: 'Kecamatan Karangan',
              kodePos: '40111',
            },
          }),
        ),
      ).rejects.toThrow(/kecamatan/i);
    });

    it('menerima alamat tanpa kecamatan — kolomnya memang opsional', async () => {
      await expect(service.hitungOngkir(permintaan())).resolves.toBeDefined();
    });

    it('menolak kode pos yang bukan 5 digit', async () => {
      for (const kodePos of ['4011', '401111', 'ABCDE', '']) {
        await expect(
          service.hitungOngkir(
            permintaan({ tujuan: { provinsi: 'Jawa Barat', kota: 'Kabupaten Bandung', kodePos } }),
          ),
        ).rejects.toThrow(/kode pos/i);
      }
    });

    it('menolak berat nol atau negatif', async () => {
      await expect(service.hitungOngkir(permintaan({ berat: 0 }))).rejects.toThrow(/berat/i);
      await expect(service.hitungOngkir(permintaan({ berat: -100 }))).rejects.toThrow(/berat/i);
    });

    it('mengarahkan kiriman di atas 50 kg ke layanan kargo', async () => {
      await expect(service.hitungOngkir(permintaan({ berat: 50_001 }))).rejects.toThrow(/kargo/i);
    });
  });

  describe('pemilihan penyedia', () => {
    it('memakai tarif lokal bila Biteship belum dikonfigurasi, dengan catatan yang jujur', async () => {
      const hasil = await service.hitungOngkir(permintaan());

      expect(hasil.penyedia).toBe('tarif-lokal');
      expect(hasil.catatan).toMatch(/BITESHIP_API_KEY/);
      expect(biteship.hitung).not.toHaveBeenCalled();
    });

    it('memakai tarif Biteship saat tersedia, tanpa catatan perkiraan', async () => {
      biteship.siap.mockReturnValue(true);
      biteship.hitung.mockResolvedValue(opsiBiteship);

      const hasil = await service.hitungOngkir(permintaan());

      expect(hasil.penyedia).toBe('biteship');
      expect(hasil.opsi).toEqual(opsiBiteship);
      expect(hasil.catatan).toBeUndefined();
    });

    it('jatuh ke tarif lokal bila Biteship sedang bermasalah — checkout tidak boleh gagal total', async () => {
      biteship.siap.mockReturnValue(true);
      biteship.hitung.mockRejectedValue(new Error('502 Bad Gateway'));

      const hasil = await service.hitungOngkir(permintaan());

      expect(hasil.penyedia).toBe('tarif-lokal');
      expect(hasil.catatan).toMatch(/tidak bisa dihubungi/i);
      expect(hasil.opsi.length).toBeGreaterThan(0);
    });

    it('jatuh ke tarif lokal bila Biteship menjawab tanpa opsi apa pun', async () => {
      biteship.siap.mockReturnValue(true);
      biteship.hitung.mockResolvedValue([]);

      const hasil = await service.hitungOngkir(permintaan());

      expect(hasil.penyedia).toBe('tarif-lokal');
    });

    it('tetap memvalidasi alamat sebelum menghubungi Biteship', async () => {
      biteship.siap.mockReturnValue(true);

      await expect(service.hitungOngkir(permintaan({ berat: 0 }))).rejects.toThrow();
      expect(biteship.hitung).not.toHaveBeenCalled();
    });
  });

  describe('pastikanOpsiValid', () => {
    it('mengembalikan opsi yang cocok beserta penyedianya', async () => {
      const { opsi, penyedia } = await service.pastikanOpsiValid(permintaan(), 'jne:REG');

      expect(opsi.kode).toBe('jne:REG');
      expect(penyedia).toBe('tarif-lokal');
    });

    it('menolak kode layanan karangan — bukan menghasilkan ongkir Rp0', async () => {
      // Tanpa ini, pembeli bisa mengirim kode palsu langsung ke endpoint pesanan.
      await expect(
        service.pastikanOpsiValid(permintaan(), 'gratis:SELAMANYA'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('mengambil ongkir dari penyedia, bukan dari nilai yang dikirim client', async () => {
      const { opsi } = await service.pastikanOpsiValid(permintaan(), 'jne:REG');
      const langsung = await tarifLokal.hitung(permintaan());

      expect(opsi.ongkir).toBe(langsung.find((o) => o.kode === 'jne:REG')!.ongkir);
    });
  });

  describe('dropdown alamat', () => {
    it('mengembalikan nama provinsi saja untuk dropdown', () => {
      const provinsi = service.daftarProvinsi();

      expect(provinsi).toHaveLength(38);
      expect(provinsi).toContain('Jawa Barat');
      expect(typeof provinsi[0]).toBe('string');
    });

    it('menolak permintaan kota untuk provinsi tak dikenal', () => {
      expect(() => service.daftarKota('Wakanda')).toThrow(BadRequestException);
    });

    it('mengembalikan kota di bawah provinsi yang diminta', () => {
      expect(service.daftarKota('Jawa Barat')).toContain('Kabupaten Bandung');
    });

    it('mengembalikan kecamatan di bawah kota yang diminta', () => {
      expect(service.daftarKecamatan('Jawa Barat', 'Kabupaten Bandung')).toContain('Cileunyi');
    });
  });
});
