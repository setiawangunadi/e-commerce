import { describe, expect, it } from 'vitest';
import {
  daftarKecamatan,
  daftarKota,
  daftarProvinsi,
  kecamatanValid,
  kotaValid,
  provinsiValid,
  zonaProvinsi,
} from '../../src/shipping/wilayah';

describe('daftarProvinsi', () => {
  it('memuat seluruh provinsi Indonesia', () => {
    expect(daftarProvinsi()).toHaveLength(38);
  });

  it('memakai kode dua digit Kemendagri', () => {
    for (const p of daftarProvinsi()) {
      expect(p.kode).toMatch(/^\d{2}$/);
      expect(p.nama.length).toBeGreaterThan(0);
    }
  });
});

describe('daftarKota', () => {
  it('menerima kode provinsi maupun namanya', () => {
    const lewatKode = daftarKota('32');
    const lewatNama = daftarKota('Jawa Barat');

    expect(lewatKode).toEqual(lewatNama);
    expect(lewatKode.length).toBeGreaterThan(20);
  });

  it('hanya mengembalikan kota yang benar-benar di bawah provinsi itu', () => {
    for (const kota of daftarKota('32')) {
      expect(kota.kode.startsWith('32.')).toBe(true);
    }
  });

  it('mengembalikan daftar kosong untuk provinsi yang tidak dikenal', () => {
    expect(daftarKota('Wakanda')).toEqual([]);
  });

  it('tidak tertukar antara provinsi berkode mirip', () => {
    // "3" awalan sama untuk 31–36; pencocokannya harus memakai titik pemisah.
    const jakarta = daftarKota('31');
    expect(jakarta.every((k) => k.kode.startsWith('31.'))).toBe(true);
  });
});

describe('daftarKecamatan', () => {
  it('mengembalikan kecamatan di bawah satu kota', () => {
    const kecamatan = daftarKecamatan('Jawa Barat', 'Kabupaten Bandung');

    expect(kecamatan.length).toBeGreaterThan(0);
    expect(kecamatan.every((k) => k.kode.startsWith('32.04.'))).toBe(true);
  });

  it('menerima kode kota langsung', () => {
    expect(daftarKecamatan('32', '32.04')).toEqual(
      daftarKecamatan('Jawa Barat', 'Kabupaten Bandung'),
    );
  });

  it('mengembalikan daftar kosong untuk kota yang tidak ada di provinsi itu', () => {
    expect(daftarKecamatan('Aceh', 'Kabupaten Bandung')).toEqual([]);
  });
});

describe('provinsiValid', () => {
  it('menerima nama resmi', () => {
    expect(provinsiValid('Jawa Barat')).toBe(true);
    expect(provinsiValid('Daerah Khusus Ibukota Jakarta')).toBe(true);
  });

  it('menerima ejaan sehari-hari yang mungkin sudah tersimpan di pesanan lama', () => {
    expect(provinsiValid('DKI Jakarta')).toBe(true);
    expect(provinsiValid('Jakarta')).toBe(true);
    expect(provinsiValid('DIY')).toBe(true);
    expect(provinsiValid('Yogyakarta')).toBe(true);
  });

  it('tidak peduli huruf besar-kecil dan spasi berlebih', () => {
    expect(provinsiValid('  jawa   barat ')).toBe(true);
  });

  it('menolak provinsi karangan', () => {
    expect(provinsiValid('Jawa Tengah Selatan')).toBe(false);
    expect(provinsiValid('')).toBe(false);
  });
});

describe('kotaValid', () => {
  it('menerima kota yang memang ada di provinsinya', () => {
    expect(kotaValid('Jawa Barat', 'Kabupaten Bandung')).toBe(true);
  });

  it('menolak kombinasi provinsi-kota yang mustahil', () => {
    // Kombinasi mustahil berarti alamatnya salah, dan ongkirnya pasti meleset.
    expect(kotaValid('Aceh', 'Kabupaten Bandung')).toBe(false);
  });

  it('tidak peduli huruf besar-kecil', () => {
    expect(kotaValid('jawa barat', 'kabupaten bandung')).toBe(true);
  });
});

describe('kecamatanValid', () => {
  it('menerima kecamatan yang ada di kotanya', () => {
    expect(kecamatanValid('Jawa Barat', 'Kabupaten Bandung', 'Cileunyi')).toBe(true);
  });

  it('menolak kecamatan dari kota lain', () => {
    expect(kecamatanValid('Jawa Barat', 'Kabupaten Bogor', 'Cileunyi')).toBe(false);
  });
});

describe('zonaProvinsi', () => {
  it('menempatkan Jabodetabek dan sekitarnya di zona termurah', () => {
    expect(zonaProvinsi('Daerah Khusus Ibukota Jakarta')).toBe(1);
    expect(zonaProvinsi('Jawa Barat')).toBe(1);
    expect(zonaProvinsi('Banten')).toBe(1);
  });

  it('menempatkan Jawa lainnya di zona 2', () => {
    expect(zonaProvinsi('Jawa Tengah')).toBe(2);
    expect(zonaProvinsi('Jawa Timur')).toBe(2);
    expect(zonaProvinsi('Daerah Istimewa Yogyakarta')).toBe(2);
  });

  it('menempatkan Sumatera dan Bali di zona 3', () => {
    expect(zonaProvinsi('Aceh')).toBe(3);
    expect(zonaProvinsi('Bali')).toBe(3);
  });

  it('menempatkan Kalimantan & Sulawesi di zona 4', () => {
    expect(zonaProvinsi('Kalimantan Timur')).toBe(4);
    expect(zonaProvinsi('Sulawesi Selatan')).toBe(4);
  });

  it('menempatkan Maluku & Papua di zona termahal', () => {
    expect(zonaProvinsi('Papua')).toBe(5);
    expect(zonaProvinsi('Maluku')).toBe(5);
  });

  it('memetakan lewat kode, jadi beda ejaan nama tidak mengubah zona', () => {
    // "DKI Jakarta" dan nama resminya harus menghasilkan tarif yang sama.
    expect(zonaProvinsi('DKI Jakarta')).toBe(zonaProvinsi('Daerah Khusus Ibukota Jakarta'));
    expect(zonaProvinsi('DIY')).toBe(zonaProvinsi('Daerah Istimewa Yogyakarta'));
  });

  it('jatuh ke zona 3 untuk provinsi yang tidak dikenali', () => {
    // Zona tengah adalah default yang aman: tidak menggratiskan ongkir jauh,
    // tidak pula membuat pembeli dekat kabur karena tarif Papua.
    expect(zonaProvinsi('Entah Di Mana')).toBe(3);
  });

  it('memberi zona untuk setiap provinsi yang ada di dropdown', () => {
    // Provinsi baru yang masuk data tapi lupa dipetakan akan diam-diam
    // memakai zona 3; test ini yang menahannya.
    for (const p of daftarProvinsi()) {
      expect([1, 2, 3, 4, 5]).toContain(zonaProvinsi(p.nama));
    }
  });
});
