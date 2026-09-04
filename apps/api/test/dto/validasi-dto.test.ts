import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateProductDto } from '../../src/admin/dto/product.dto';
import { BuatOrderDto } from '../../src/order/dto/order.dto';
import { AlamatDto, DaftarDto } from '../../src/customer/dto/customer-auth.dto';

/** Menjalankan pipeline validasi yang sama dengan ValidationPipe global. */
async function periksa<T extends object>(
  Kelas: new () => T,
  data: Record<string, unknown>,
): Promise<{ sah: boolean; kolomBermasalah: string[] }> {
  const instance = plainToInstance(Kelas, data, { enableImplicitConversion: true });
  const galat = await validate(instance as object, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return { sah: galat.length === 0, kolomBermasalah: galat.map((g) => g.property) };
}

const produkDasar = {
  nama: 'Kemeja Flanel Lengan Panjang',
  sku: 'KFL-001',
  harga: 189_000,
  berat: 400,
};

describe('CreateProductDto — tautan marketplace', () => {
  it.each([
    'https://shopee.co.id/produk-123',
    'https://www.shopee.co.id/produk-123',
    'https://shope.ee/abc123',
    'https://s.shopee.co.id/abc',
  ])('menerima tautan Shopee resmi: %s', async (linkShopee) => {
    expect((await periksa(CreateProductDto, { ...produkDasar, linkShopee })).sah).toBe(true);
  });

  it.each([
    'https://vt.tiktok.com/abc',
    'https://www.tiktok.com/@toko/video/1',
    'https://shop.tiktok.com/x',
  ])('menerima tautan TikTok resmi: %s', async (linkTiktok) => {
    expect((await periksa(CreateProductDto, { ...produkDasar, linkTiktok })).sah).toBe(true);
  });

  it.each([
    'javascript:alert(document.cookie)',
    'data:text/html,<script>alert(1)</script>',
    'https://shopee-palsu.example/produk',
    'https://phishing.example/shopee.co.id',
    'shopee.co.id/produk',
  ])('menolak tautan Shopee yang tidak sah: %s', async (linkShopee) => {
    // Tombol berlabel "Shopee" harus benar-benar mengarah ke Shopee, dan
    // `javascript:` tidak boleh pernah sampai ke atribut href di etalase.
    const hasil = await periksa(CreateProductDto, { ...produkDasar, linkShopee });

    expect(hasil.sah).toBe(false);
    expect(hasil.kolomBermasalah).toContain('linkShopee');
  });

  it('menolak tautan Shopee ditempel di kolom TikTok', async () => {
    const hasil = await periksa(CreateProductDto, {
      ...produkDasar,
      linkTiktok: 'https://shopee.co.id/produk-123',
    });

    expect(hasil.sah).toBe(false);
  });

  it('menerima produk tanpa tautan marketplace sama sekali', async () => {
    expect((await periksa(CreateProductDto, produkDasar)).sah).toBe(true);
  });
});

describe('CreateProductDto — angka & batas', () => {
  it('menolak harga negatif', async () => {
    const hasil = await periksa(CreateProductDto, { ...produkDasar, harga: -1 });

    expect(hasil.kolomBermasalah).toContain('harga');
  });

  it('menuntut berat minimal 1 gram — ongkir tidak bisa dihitung tanpanya', async () => {
    expect((await periksa(CreateProductDto, { ...produkDasar, berat: 0 })).sah).toBe(false);
  });

  it('menolak stok negatif', async () => {
    expect((await periksa(CreateProductDto, { ...produkDasar, stok: -5 })).sah).toBe(false);
  });

  it('menolak status di luar tiga nilai yang dikenal', async () => {
    expect((await periksa(CreateProductDto, { ...produkDasar, status: 'TERBIT' })).sah).toBe(false);
    expect((await periksa(CreateProductDto, { ...produkDasar, status: 'PUBLISHED' })).sah).toBe(
      true,
    );
  });

  it('menolak nama produk yang terlalu pendek', async () => {
    expect((await periksa(CreateProductDto, { ...produkDasar, nama: 'AB' })).sah).toBe(false);
  });

  it('membatasi jumlah gambar per produk', async () => {
    const gambar = Array.from({ length: 11 }, (_, i) => ({ url: `/uploads/${i}.jpg` }));

    expect((await periksa(CreateProductDto, { ...produkDasar, gambar })).sah).toBe(false);
  });

  it('MENOLAK kolom asing yang tidak ada di DTO', async () => {
    // ValidationPipe berjalan dengan forbidNonWhitelisted, jadi kolom yang
    // tidak dikenal ditolak alih-alih diam-diam diabaikan.
    const hasil = await periksa(CreateProductDto, { ...produkDasar, isAdmin: true });

    expect(hasil.sah).toBe(false);
    expect(hasil.kolomBermasalah).toContain('isAdmin');
  });

  it('memvalidasi varian bersarang', async () => {
    const hasil = await periksa(CreateProductDto, {
      ...produkDasar,
      varian: [{ nama: 'L', sku: '', stok: 3 }],
    });

    expect(hasil.sah).toBe(false);
  });
});

describe('BuatOrderDto — data pembeli', () => {
  const orderDasar = {
    nama: 'Budi Santoso',
    email: 'budi@contoh.id',
    telepon: '081234567890',
    alamatLengkap: 'Jl. Merdeka No. 1, RT 01 RW 02',
    provinsi: 'Jawa Barat',
    kota: 'Kota Bandung',
    kodePos: '40111',
    kodeOngkir: 'jne:REG',
  };

  it('menerima pesanan lengkap yang sah', async () => {
    expect((await periksa(BuatOrderDto, orderDasar)).sah).toBe(true);
  });

  it.each(['081234567890', '6281234567890', '+6281234567890'])(
    'menerima nomor Indonesia dalam bentuk %s',
    async (telepon) => {
      expect((await periksa(BuatOrderDto, { ...orderDasar, telepon })).sah).toBe(true);
    },
  );

  it.each(['12345', '0712345678', '08123', 'bukan-nomor', ''])(
    'menolak nomor tidak valid: %s',
    async (telepon) => {
      // Nomor WhatsApp adalah satu-satunya jalur menghubungi pembeli tamu.
      expect((await periksa(BuatOrderDto, { ...orderDasar, telepon })).sah).toBe(false);
    },
  );

  it('menolak email yang tidak berbentuk email', async () => {
    expect((await periksa(BuatOrderDto, { ...orderDasar, email: 'budi[at]contoh' })).sah).toBe(
      false,
    );
  });

  it('menolak alamat yang terlalu pendek untuk dikirimi paket', async () => {
    expect((await periksa(BuatOrderDto, { ...orderDasar, alamatLengkap: 'Rumah' })).sah).toBe(
      false,
    );
  });

  it('menolak kode pos yang bukan 5 digit', async () => {
    for (const kodePos of ['4011', '401111', 'ABCDE']) {
      expect((await periksa(BuatOrderDto, { ...orderDasar, kodePos })).sah).toBe(false);
    }
  });

  it('mewajibkan layanan pengiriman dipilih', async () => {
    expect((await periksa(BuatOrderDto, { ...orderDasar, kodeOngkir: '' })).sah).toBe(false);
  });

  it('MENOLAK client yang mencoba mengirim nominal diskon atau total sendiri', async () => {
    // Nilai uang selalu dihitung ulang di server; kolom asing ditolak
    // sebelum sempat sampai ke service.
    const hasil = await periksa(BuatOrderDto, { ...orderDasar, diskon: 999_999, total: 0 });

    expect(hasil.sah).toBe(false);
    expect(hasil.kolomBermasalah).toEqual(expect.arrayContaining(['diskon', 'total']));
  });

  it('menerima kode voucher, bukan nominal potongannya', async () => {
    expect((await periksa(BuatOrderDto, { ...orderDasar, kodeVoucher: 'HEMAT10' })).sah).toBe(true);
  });

  it('menolak jumlah poin negatif', async () => {
    expect((await periksa(BuatOrderDto, { ...orderDasar, poinDipakai: -100 })).sah).toBe(false);
  });

  it('menerima atribusi UTM opsional', async () => {
    const hasil = await periksa(BuatOrderDto, {
      ...orderDasar,
      utmSource: 'facebook',
      utmCampaign: 'promo-agustus',
      landingSlug: 'diskon-kemeja',
    });

    expect(hasil.sah).toBe(true);
  });
});

describe('DaftarDto — pendaftaran pelanggan', () => {
  const dasar = { email: 'budi@contoh.id', nama: 'Budi', password: 'rahasia12345' };

  it('menerima pendaftaran yang sah', async () => {
    expect((await periksa(DaftarDto, dasar)).sah).toBe(true);
  });

  it('menuntut kata sandi minimal 8 karakter', async () => {
    expect((await periksa(DaftarDto, { ...dasar, password: 'pendek' })).sah).toBe(false);
    expect((await periksa(DaftarDto, { ...dasar, password: 'delapan8' })).sah).toBe(true);
  });

  it('TIDAK menuntut komposisi karakter tertentu', async () => {
    // Memaksa simbol dan angka mendorong pola tebakan seperti "Password1!";
    // panjang lebih menentukan daripada ragam karakter.
    expect((await periksa(DaftarDto, { ...dasar, password: 'sandiyangpanjangsekali' })).sah).toBe(
      true,
    );
  });

  it('menolak nama yang terlalu pendek', async () => {
    expect((await periksa(DaftarDto, { ...dasar, nama: 'B' })).sah).toBe(false);
  });

  it('menerima nomor WhatsApp opsional', async () => {
    expect((await periksa(DaftarDto, { ...dasar, telepon: '081234567890' })).sah).toBe(true);
    expect((await periksa(DaftarDto, { ...dasar, telepon: '12345' })).sah).toBe(false);
  });

  it('menolak kolom asing seperti tier atau poin', async () => {
    // Tanpa ini, pendaftar bisa mengangkat dirinya sendiri ke tier Platinum.
    const hasil = await periksa(DaftarDto, { ...dasar, tier: 'PLATINUM', poin: 999_999 });

    expect(hasil.sah).toBe(false);
    expect(hasil.kolomBermasalah).toEqual(expect.arrayContaining(['tier', 'poin']));
  });
});

describe('AlamatDto', () => {
  const dasar = {
    label: 'Rumah',
    namaPenerima: 'Budi Santoso',
    teleponPenerima: '081234567890',
    alamatLengkap: 'Jl. Merdeka No. 1, RT 01 RW 02',
    provinsi: 'Jawa Barat',
    kota: 'Kabupaten Bandung',
    kodePos: '40111',
  };

  it('menerima alamat lengkap yang sah', async () => {
    expect((await periksa(AlamatDto, dasar)).sah).toBe(true);
  });

  it('mewajibkan label alamat supaya bisa dibedakan di daftar', async () => {
    expect((await periksa(AlamatDto, { ...dasar, label: '' })).sah).toBe(false);
  });

  it('menolak nomor penerima yang tidak valid', async () => {
    expect((await periksa(AlamatDto, { ...dasar, teleponPenerima: '12345' })).sah).toBe(false);
  });

  it('menerima kecamatan opsional', async () => {
    expect((await periksa(AlamatDto, { ...dasar, kecamatan: 'Cileunyi' })).sah).toBe(true);
  });

  it('menolak kolom customerId yang dikirim client', async () => {
    // Pemilik alamat selalu diambil dari token, tidak pernah dari body.
    expect((await periksa(AlamatDto, { ...dasar, customerId: 'orang-lain' })).sah).toBe(false);
  });
});
