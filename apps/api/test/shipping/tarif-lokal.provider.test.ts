import { beforeEach, describe, expect, it } from 'vitest';
import { TarifLokalProvider } from '../../src/shipping/tarif-lokal.provider';
import type { PermintaanOngkir } from '../../src/shipping/shipping.types';

function permintaan(ubah: Partial<PermintaanOngkir> = {}): PermintaanOngkir {
  return {
    tujuan: { provinsi: 'Jawa Barat', kota: 'Kabupaten Bandung', kodePos: '40111' },
    berat: 1_000,
    nilaiBarang: 200_000,
    ...ubah,
  };
}

describe('TarifLokalProvider', () => {
  let provider: TarifLokalProvider;

  beforeEach(() => {
    provider = new TarifLokalProvider();
  });

  it('selalu siap — inilah cadangan yang menjaga checkout tetap jalan', () => {
    expect(provider.siap()).toBe(true);
    expect(provider.nama).toBe('tarif-lokal');
  });

  it('mengembalikan opsi dari beberapa kurir', async () => {
    const opsi = await provider.hitung(permintaan());

    expect(opsi.length).toBeGreaterThan(3);
    expect(new Set(opsi.map((o) => o.kurir)).size).toBeGreaterThan(1);
  });

  it('memberi kode unik per layanan supaya pilihan pembeli tidak ambigu', async () => {
    const opsi = await provider.hitung(permintaan());
    const kode = opsi.map((o) => o.kode);

    expect(new Set(kode).size).toBe(kode.length);
    expect(kode).toContain('jne:REG');
  });

  it('mengurutkan dari yang termurah', async () => {
    const opsi = await provider.hitung(permintaan());
    const harga = opsi.map((o) => o.ongkir);

    expect(harga).toEqual([...harga].sort((a, b) => a - b));
  });

  it('menagih per kilogram dibulatkan ke atas', async () => {
    const satuKg = await provider.hitung(permintaan({ berat: 1_000 }));
    const seribuSatuGram = await provider.hitung(permintaan({ berat: 1_001 }));

    // 1.001 gram tetap ditagih 2 kg, sama seperti kurir sungguhan.
    expect(seribuSatuGram[0]!.ongkir).toBeGreaterThan(satuKg[0]!.ongkir);
  });

  it('menagih minimal 1 kg untuk kiriman ringan', async () => {
    const ringan = await provider.hitung(permintaan({ berat: 50 }));
    const satuKg = await provider.hitung(permintaan({ berat: 1_000 }));

    expect(ringan[0]!.ongkir).toBe(satuKg[0]!.ongkir);
  });

  it('menaikkan tarif untuk zona yang lebih jauh', async () => {
    const bandung = await provider.hitung(permintaan());
    const papua = await provider.hitung(
      permintaan({ tujuan: { provinsi: 'Papua', kota: 'Kota Jayapura', kodePos: '99111' } }),
    );

    expect(papua[0]!.ongkir).toBeGreaterThan(bandung[0]!.ongkir);
  });

  it('memperpanjang estimasi untuk zona yang lebih jauh', async () => {
    const bandung = await provider.hitung(permintaan());
    const papua = await provider.hitung(
      permintaan({ tujuan: { provinsi: 'Papua', kota: 'Kota Jayapura', kodePos: '99111' } }),
    );

    const reguler = (opsi: { kode: string; estimasi: string }[]) =>
      opsi.find((o) => o.kode === 'jne:REG')!.estimasi;

    expect(reguler(bandung)).toBe('2-3 hari');
    expect(reguler(papua)).not.toBe('2-3 hari');
  });

  it('membulatkan ongkir ke kelipatan 500 — Rupiah tidak dipakai dalam satuan', async () => {
    const opsi = await provider.hitung(permintaan({ berat: 2_300 }));

    for (const o of opsi) {
      expect(o.ongkir % 500).toBe(0);
    }
  });

  it('menuliskan estimasi satu hari tanpa rentang', async () => {
    const opsi = await provider.hitung(permintaan());
    const kilat = opsi.find((o) => o.kode === 'jne:YES');

    expect(kilat!.estimasi).toBe('1 hari');
  });

  it('memberi setiap opsi kelengkapan yang dibutuhkan halaman checkout', async () => {
    for (const o of await provider.hitung(permintaan())) {
      expect(o.kurir).toBeTruthy();
      expect(o.layanan).toBeTruthy();
      expect(o.nama).toBeTruthy();
      expect(o.deskripsi).toMatch(/estimasi/i);
      expect(o.ongkir).toBeGreaterThan(0);
    }
  });

  it('memakai zona 3 untuk provinsi tak dikenal, bukan menggagalkan perhitungan', async () => {
    const opsi = await provider.hitung(
      permintaan({ tujuan: { provinsi: 'Entah', kota: 'Entah', kodePos: '00000' } }),
    );

    expect(opsi.length).toBeGreaterThan(0);
  });
});
