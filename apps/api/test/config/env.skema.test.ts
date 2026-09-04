import { describe, expect, it } from 'vitest';
import { validasiEnv } from '../../src/config/env.skema';

const RAHASIA = 'x'.repeat(48);

/** Env minimal yang cukup untuk development. */
function envDev(ubah: Record<string, string> = {}) {
  return {
    DATABASE_URL: 'postgresql://ecommerce:ecommerce@localhost:5433/ecommerce',
    JWT_SECRET: RAHASIA,
    ...ubah,
  };
}

/** Env produksi yang sudah lengkap dan lolos seluruh pemeriksaan. */
function envProd(ubah: Record<string, string> = {}) {
  return {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://user:sandi@db.internal:5432/ecommerce',
    JWT_SECRET: RAHASIA,
    WEB_ORIGIN: 'https://toko.id',
    PUBLIC_BASE_URL: 'https://api.toko.id',
    MIDTRANS_SERVER_KEY: 'Mid-server-abc123',
    MIDTRANS_CLIENT_KEY: 'Mid-client-abc123',
    MIDTRANS_PRODUKSI: 'true',
    SEED_ADMIN_PASSWORD: 'sandi-yang-sudah-diganti',
    ...ubah,
  };
}

describe('validasiEnv — pemeriksaan dasar', () => {
  it('menerima konfigurasi development minimal', () => {
    expect(() => validasiEnv(envDev())).not.toThrow();
  });

  it('mengisi nilai bawaan yang masuk akal', () => {
    const env = validasiEnv(envDev());

    expect(env.PORT).toBe(4000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.BATAS_BAYAR_MENIT).toBe(1440);
    expect(env.WEB_ORIGIN).toBe('http://localhost:3000');
    expect(env.MIDTRANS_PRODUKSI).toBe(false);
  });

  it('mengubah angka dari string env menjadi number', () => {
    const env = validasiEnv(envDev({ PORT: '8080', BATAS_BAYAR_MENIT: '60' }));

    expect(env.PORT).toBe(8080);
    expect(env.BATAS_BAYAR_MENIT).toBe(60);
  });

  it('mengubah "true"/"false" menjadi boolean sungguhan', () => {
    // `if (config.get('MIDTRANS_PRODUKSI'))` pada string "false" bernilai true —
    // kesalahan yang mengirim transaksi nyata ke sandbox.
    expect(validasiEnv(envDev({ MIDTRANS_PRODUKSI: 'true' })).MIDTRANS_PRODUKSI).toBe(true);
    expect(validasiEnv(envDev({ MIDTRANS_PRODUKSI: 'false' })).MIDTRANS_PRODUKSI).toBe(false);
  });

  it('menolak DATABASE_URL yang kosong atau bukan PostgreSQL', () => {
    expect(() => validasiEnv({ JWT_SECRET: RAHASIA })).toThrow(/DATABASE_URL/);
    expect(() => validasiEnv(envDev({ DATABASE_URL: 'mysql://localhost/db' }))).toThrow(
      /PostgreSQL/,
    );
  });

  it('menolak JWT_SECRET yang terlalu pendek', () => {
    expect(() => validasiEnv(envDev({ JWT_SECRET: 'pendek' }))).toThrow(/minimal 32 karakter/);
  });

  it('menolak NODE_ENV yang tidak dikenal', () => {
    expect(() => validasiEnv(envDev({ NODE_ENV: 'staging' }))).toThrow();
  });

  it('menolak PORT yang bukan angka positif', () => {
    expect(() => validasiEnv(envDev({ PORT: 'delapan' }))).toThrow();
    expect(() => validasiEnv(envDev({ PORT: '0' }))).toThrow();
  });

  it('menyebut setiap kolom yang bermasalah dalam satu pesan', () => {
    // Memperbaiki konfigurasi satu galat per deploy sangat memakan waktu.
    const pesan = (() => {
      try {
        validasiEnv({ JWT_SECRET: 'pendek' });
      } catch (e) {
        return (e as Error).message;
      }
      return '';
    })();

    expect(pesan).toMatch(/DATABASE_URL/);
    expect(pesan).toMatch(/JWT_SECRET/);
  });
});

describe('validasiEnv — aturan tambahan di produksi', () => {
  it('menerima konfigurasi produksi yang lengkap', () => {
    expect(() => validasiEnv(envProd())).not.toThrow();
  });

  it('MENOLAK JWT_SECRET contoh dari .env.example', () => {
    // Rahasia yang sama dipakai semua orang yang menyalin repo ini.
    expect(() =>
      validasiEnv(envProd({ JWT_SECRET: 'ganti-dengan-string-acak-minimal-32-karakter' })),
    ).toThrow(/masih memakai nilai contoh/);
  });

  it('menolak sandi admin contoh', () => {
    expect(() => validasiEnv(envProd({ SEED_ADMIN_PASSWORD: 'admin12345' }))).toThrow(
      /sandi contoh/,
    );
  });

  it('menuntut https untuk origin frontend dan base URL publik', () => {
    expect(() => validasiEnv(envProd({ WEB_ORIGIN: 'http://toko.id' }))).toThrow(/https/);
    expect(() => validasiEnv(envProd({ PUBLIC_BASE_URL: 'http://api.toko.id' }))).toThrow(/https/);
  });

  it('memeriksa setiap origin bila ada lebih dari satu', () => {
    expect(() =>
      validasiEnv(envProd({ WEB_ORIGIN: 'https://toko.id, http://staging.toko.id' })),
    ).toThrow(/staging/);

    expect(() =>
      validasiEnv(envProd({ WEB_ORIGIN: 'https://toko.id, https://www.toko.id' })),
    ).not.toThrow();
  });

  it('MENOLAK key Midtrans sandbox saat mode produksi menyala', () => {
    // Gejalanya "401 Unknown Merchant server_key", dan baru ketahuan ketika
    // pembeli pertama menekan tombol bayar.
    expect(() =>
      validasiEnv(envProd({ MIDTRANS_SERVER_KEY: 'SB-Mid-server-abc' })),
    ).toThrow(/key sandbox/);

    expect(() =>
      validasiEnv(envProd({ MIDTRANS_CLIENT_KEY: 'SB-Mid-client-abc' })),
    ).toThrow(/key sandbox/);
  });

  it('MENOLAK key produksi saat mode produksi belum dinyalakan', () => {
    // Ini kebalikannya, dan jauh lebih merugikan: transaksi masuk ke sandbox
    // sehingga uang pembeli tidak pernah benar-benar tertagih.
    expect(() => validasiEnv(envProd({ MIDTRANS_PRODUKSI: 'false' }))).toThrow(
      /dikirim ke sandbox/,
    );
  });

  it('menolak produksi tanpa kunci Midtrans sama sekali', () => {
    expect(() =>
      validasiEnv(envProd({ MIDTRANS_SERVER_KEY: '', MIDTRANS_CLIENT_KEY: '' })),
    ).toThrow(/tidak akan bisa membayar/);
  });

  it('menolak Biteship yang terpasang tanpa titik asal pengiriman', () => {
    // Tanpa asal, seluruh ongkir diam-diam jatuh ke tarif perkiraan.
    expect(() => validasiEnv(envProd({ BITESHIP_API_KEY: 'biteship-key' }))).toThrow(
      /tarif perkiraan/,
    );
  });

  it('menerima Biteship yang lengkap dengan area gudang', () => {
    expect(() =>
      validasiEnv(envProd({ BITESHIP_API_KEY: 'biteship-key', GUDANG_AREA_ID: 'IDNP6IDNC148' })),
    ).not.toThrow();
  });

  it('menerima Biteship yang memakai kode pos gudang', () => {
    expect(() =>
      validasiEnv(envProd({ BITESHIP_API_KEY: 'biteship-key', GUDANG_KODE_POS: '40111' })),
    ).not.toThrow();
  });

  it('TIDAK menerapkan aturan produksi di development', () => {
    // Development harus tetap bisa jalan dengan .env.example apa adanya.
    expect(() =>
      validasiEnv(
        envDev({
          JWT_SECRET: 'ganti-dengan-string-acak-minimal-32-karakter',
          WEB_ORIGIN: 'http://localhost:3000',
          SEED_ADMIN_PASSWORD: 'admin12345',
        }),
      ),
    ).not.toThrow();
  });

  it('mengumpulkan seluruh masalah produksi dalam satu pesan', () => {
    const pesan = (() => {
      try {
        validasiEnv(
          envProd({ WEB_ORIGIN: 'http://toko.id', SEED_ADMIN_PASSWORD: 'admin12345' }),
        );
      } catch (e) {
        return (e as Error).message;
      }
      return '';
    })();

    expect(pesan).toMatch(/WEB_ORIGIN/);
    expect(pesan).toMatch(/SEED_ADMIN_PASSWORD/);
  });
});

describe('validasiEnv — pembatasan laju', () => {
  it('memakai batas bawaan yang longgar untuk endpoint umum dan ketat untuk login', () => {
    const env = validasiEnv(envDev());

    expect(env.RATE_LIMIT_UMUM).toBe(300);
    expect(env.RATE_LIMIT_LOGIN).toBe(10);
    expect(env.RATE_LIMIT_LOGIN).toBeLessThan(env.RATE_LIMIT_UMUM);
  });

  it('bisa diatur lewat environment tanpa mengubah kode', () => {
    const env = validasiEnv(envDev({ RATE_LIMIT_LOGIN: '5', RATE_LIMIT_UMUM: '1000' }));

    expect(env.RATE_LIMIT_LOGIN).toBe(5);
    expect(env.RATE_LIMIT_UMUM).toBe(1000);
  });

  it('mempercayai satu proxy secara bawaan', () => {
    expect(validasiEnv(envDev()).TRUST_PROXY).toBe(1);
  });
});
