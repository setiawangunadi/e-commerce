import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderService } from '../../src/order/order.service';
import type { BuatOrderDto } from '../../src/order/dto/order.dto';
import type { CartService } from '../../src/cart/cart.service';
import type { LoyaltyService } from '../../src/customer/loyalty.service';
import type { MidtransService } from '../../src/payment/midtrans.service';
import type { PaymentService } from '../../src/payment/payment.service';
import type { PrismaService } from '../../src/prisma/prisma.service';
import type { ShippingService } from '../../src/shipping/shipping.service';
import type { VoucherService } from '../../src/voucher/voucher.service';
import type { ConfigService } from '@nestjs/config';
import { buatConfigPalsu, buatPrismaPalsu, type PrismaPalsu } from '../bantuan/prisma-palsu';

const TOKEN_KERANJANG = 'token-keranjang';

const dtoDasar: BuatOrderDto = {
  nama: 'Budi Santoso',
  email: 'budi@contoh.id',
  telepon: '081234567890',
  alamatLengkap: 'Jl. Merdeka No. 1, RT 01 RW 02',
  provinsi: 'Jawa Barat',
  kota: 'Kota Bandung',
  kodePos: '40111',
  kodeOngkir: 'jne:REG',
};

function keranjang(ubah: Record<string, unknown> = {}) {
  return {
    id: 'cart-1',
    items: [
      {
        id: 'item-1',
        produkId: 'produk-1',
        kategoriId: 'kategori-1',
        varianId: null,
        slug: 'kemeja',
        nama: 'Kemeja Flanel',
        namaVarian: null,
        sku: 'SKU-1',
        gambarUrl: null,
        harga: 100_000,
        jumlah: 2,
        subtotal: 200_000,
        berat: 400,
        stokTersedia: 10,
        tidakTersedia: false,
        melebihiStok: false,
      },
    ],
    jumlahItem: 2,
    subtotal: 200_000,
    beratTotal: 800,
    adaMasalah: false,
    ...ubah,
  };
}

const opsiOngkir = {
  kode: 'jne:REG',
  kurir: 'JNE',
  layanan: 'REG',
  nama: 'Reguler',
  deskripsi: 'Estimasi 2-3 hari kerja',
  estimasi: '2-3 hari',
  ongkir: 20_000,
};

describe('OrderService', () => {
  let prisma: PrismaPalsu;
  let cart: { ambilAtauBuat: ReturnType<typeof vi.fn> };
  let shipping: { pastikanOpsiValid: ReturnType<typeof vi.fn> };
  let midtrans: { buatTransaksi: ReturnType<typeof vi.fn>; clientKey: string };
  let payment: { sinkronkan: ReturnType<typeof vi.fn> };
  let voucher: { hitungPotongan: ReturnType<typeof vi.fn>; pakai: ReturnType<typeof vi.fn> };
  let loyalty: { hitungPotongan: ReturnType<typeof vi.fn>; pakai: ReturnType<typeof vi.fn> };
  let service: OrderService;

  /** Bentuk pesanan yang dikembalikan `order.create` di dalam transaksi. */
  function pesananTersimpan(ubah: Record<string, unknown> = {}) {
    return {
      id: 'order-1',
      nomor: 'INV-20260817-0001',
      token: 'token-pesanan',
      status: 'WAITING_PAYMENT',
      statusPembayaran: 'MENUNGGU',
      metodePembayaran: null,
      namaPembeli: dtoDasar.nama,
      emailPembeli: dtoDasar.email,
      teleponPembeli: dtoDasar.telepon,
      alamatLengkap: dtoDasar.alamatLengkap,
      provinsi: dtoDasar.provinsi,
      kota: dtoDasar.kota,
      kecamatan: null,
      kodePos: dtoDasar.kodePos,
      catatanAlamat: null,
      kurir: 'JNE',
      layananKurir: 'REG',
      namaLayanan: 'Reguler',
      estimasiTiba: '2-3 hari',
      beratTotal: 800,
      nomorResi: null,
      subtotal: 200_000,
      ongkir: 20_000,
      diskon: 0,
      kodeVoucher: null,
      poinDipakai: 0,
      potonganPoin: 0,
      total: 220_000,
      snapToken: null,
      snapRedirectUrl: null,
      midtransOrderId: null,
      kedaluwarsaPada: new Date(Date.now() + 86_400_000),
      dibayarPada: null,
      createdAt: new Date(),
      items: [{ sku: 'SKU-1', harga: 100_000, jumlah: 2, namaProduk: 'Kemeja Flanel', namaVarian: null }],
      ...ubah,
    };
  }

  beforeEach(() => {
    prisma = buatPrismaPalsu();
    cart = { ambilAtauBuat: vi.fn().mockResolvedValue(keranjang()) };
    shipping = {
      pastikanOpsiValid: vi.fn().mockResolvedValue({ opsi: opsiOngkir, penyedia: 'tarif-lokal' }),
    };
    midtrans = {
      buatTransaksi: vi.fn().mockResolvedValue({ token: 'snap-1', redirectUrl: 'https://x' }),
      clientKey: 'SB-Mid-client-abc',
    };
    payment = { sinkronkan: vi.fn().mockResolvedValue({ diperbarui: false, status: 'MENUNGGU' }) };
    voucher = { hitungPotongan: vi.fn(), pakai: vi.fn().mockResolvedValue(undefined) };
    loyalty = { hitungPotongan: vi.fn(), pakai: vi.fn().mockResolvedValue(undefined) };

    // Stok tersedia berlimpah kecuali test menyatakan sebaliknya.
    prisma.product.findUnique.mockResolvedValue({ stok: 100 });
    prisma.productVariant.findUnique.mockResolvedValue({ stok: 100 });
    prisma.order.create.mockResolvedValue(pesananTersimpan());

    service = new OrderService(
      prisma as unknown as PrismaService,
      cart as unknown as CartService,
      shipping as unknown as ShippingService,
      midtrans as unknown as MidtransService,
      payment as unknown as PaymentService,
      voucher as unknown as VoucherService,
      loyalty as unknown as LoyaltyService,
      buatConfigPalsu({ BATAS_BAYAR_MENIT: '1440' }) as unknown as ConfigService,
    );
  });

  describe('buatDariKeranjang — penjagaan sebelum pesanan dibuat', () => {
    it('menolak keranjang kosong', async () => {
      cart.ambilAtauBuat.mockResolvedValue(keranjang({ items: [], subtotal: 0 }));

      await expect(service.buatDariKeranjang(TOKEN_KERANJANG, dtoDasar)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('menolak checkout bila ada item keranjang yang bermasalah', async () => {
      // Pembeli harus membereskan dulu, bukan diam-diam kehilangan barang.
      cart.ambilAtauBuat.mockResolvedValue(keranjang({ adaMasalah: true }));

      await expect(service.buatDariKeranjang(TOKEN_KERANJANG, dtoDasar)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('memeriksa stok sekali lagi di dalam transaksi pembuatan pesanan', async () => {
      // Antara pembeli membuka checkout dan menekan bayar, stok bisa diambil
      // pembeli lain.
      prisma.product.findUnique.mockResolvedValue({ stok: 1 });

      await expect(service.buatDariKeranjang(TOKEN_KERANJANG, dtoDasar)).rejects.toThrow(
        /tinggal 1/,
      );
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('menolak bila produknya menghilang di tengah checkout', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.buatDariKeranjang(TOKEN_KERANJANG, dtoDasar)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('memeriksa stok varian, bukan stok produk induk, untuk item bervarian', async () => {
      cart.ambilAtauBuat.mockResolvedValue(
        keranjang({
          items: [{ ...keranjang().items[0], varianId: 'varian-1' }],
        }),
      );
      prisma.productVariant.findUnique.mockResolvedValue({ stok: 1 });

      await expect(service.buatDariKeranjang(TOKEN_KERANJANG, dtoDasar)).rejects.toThrow(
        /tinggal 1/,
      );
      expect(prisma.product.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('buatDariKeranjang — tidak ada nilai uang yang dipercaya dari client', () => {
    it('menghitung ulang ongkir ke penyedia dari berat & nilai barang keranjang', async () => {
      await service.buatDariKeranjang(TOKEN_KERANJANG, dtoDasar);

      expect(shipping.pastikanOpsiValid).toHaveBeenCalledWith(
        {
          tujuan: {
            provinsi: 'Jawa Barat',
            kota: 'Kota Bandung',
            kecamatan: null,
            kodePos: '40111',
          },
          berat: 800,
          nilaiBarang: 200_000,
        },
        'jne:REG',
      );
    });

    it('gagal bila kode ongkir yang dikirim client tidak sah — bukan menghasilkan ongkir Rp0', async () => {
      shipping.pastikanOpsiValid.mockRejectedValue(
        new BadRequestException('Opsi pengiriman tidak berlaku lagi.'),
      );

      await expect(
        service.buatDariKeranjang(TOKEN_KERANJANG, { ...dtoDasar, kodeOngkir: 'palsu:GRATIS' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('menghitung potongan voucher dari kodenya, bukan dari nominal yang dikirim client', async () => {
      voucher.hitungPotongan.mockResolvedValue({
        kode: 'HEMAT10',
        potongan: 20_000,
        subtotalBerlaku: 200_000,
        deskripsi: null,
      });

      await service.buatDariKeranjang(TOKEN_KERANJANG, { ...dtoDasar, kodeVoucher: 'hemat10' });

      expect(voucher.hitungPotongan).toHaveBeenCalledWith('hemat10', [
        { produkId: 'produk-1', kategoriId: 'kategori-1', subtotal: 200_000 },
      ]);
      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ diskon: 20_000, kodeVoucher: 'HEMAT10', total: 200_000 }),
        }),
      );
    });

    it('tidak memanggil mesin voucher bila kodenya kosong', async () => {
      await service.buatDariKeranjang(TOKEN_KERANJANG, { ...dtoDasar, kodeVoucher: '   ' });

      expect(voucher.hitungPotongan).not.toHaveBeenCalled();
    });

    it('menaikkan pemakaian voucher di dalam transaksi yang sama dengan pembuatan pesanan', async () => {
      voucher.hitungPotongan.mockResolvedValue({
        kode: 'HEMAT10',
        potongan: 20_000,
        subtotalBerlaku: 200_000,
        deskripsi: null,
      });

      await service.buatDariKeranjang(TOKEN_KERANJANG, { ...dtoDasar, kodeVoucher: 'HEMAT10' });

      expect(voucher.pakai).toHaveBeenCalledWith(expect.anything(), 'HEMAT10');
    });

    it('mengabaikan poin bila pembeli belum masuk', async () => {
      await service.buatDariKeranjang(TOKEN_KERANJANG, { ...dtoDasar, poinDipakai: 500 }, null);

      expect(loyalty.hitungPotongan).not.toHaveBeenCalled();
      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ poinDipakai: 0 }) }),
      );
    });

    it('menghitung potongan poin di server dari jumlah poin saja', async () => {
      loyalty.hitungPotongan.mockResolvedValue({ poin: 500, potongan: 50_000 });

      await service.buatDariKeranjang(
        TOKEN_KERANJANG,
        { ...dtoDasar, poinDipakai: 500 },
        'pelanggan-1',
      );

      // Subtotal setelah voucher yang dikirim, bukan subtotal kotor.
      expect(loyalty.hitungPotongan).toHaveBeenCalledWith('pelanggan-1', 500, 200_000);
      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ poinDipakai: 500, potonganPoin: 50_000 }),
        }),
      );
    });

    it('memakai subtotal setelah voucher sebagai dasar batas poin', async () => {
      voucher.hitungPotongan.mockResolvedValue({
        kode: 'HEMAT10',
        potongan: 20_000,
        subtotalBerlaku: 200_000,
        deskripsi: null,
      });
      loyalty.hitungPotongan.mockResolvedValue({ poin: 100, potongan: 10_000 });

      await service.buatDariKeranjang(
        TOKEN_KERANJANG,
        { ...dtoDasar, kodeVoucher: 'HEMAT10', poinDipakai: 100 },
        'pelanggan-1',
      );

      expect(loyalty.hitungPotongan).toHaveBeenCalledWith('pelanggan-1', 100, 180_000);
    });

    it('memotong saldo poin di transaksi yang sama dengan pembuatan pesanan', async () => {
      loyalty.hitungPotongan.mockResolvedValue({ poin: 500, potongan: 50_000 });

      await service.buatDariKeranjang(
        TOKEN_KERANJANG,
        { ...dtoDasar, poinDipakai: 500 },
        'pelanggan-1',
      );

      expect(loyalty.pakai).toHaveBeenCalledWith(
        expect.anything(),
        'pelanggan-1',
        500,
        'order-1',
        'INV-20260817-0001',
      );
    });
  });

  describe('buatDariKeranjang — perhitungan total', () => {
    it('menjumlahkan subtotal dikurangi potongan, ditambah ongkir', async () => {
      voucher.hitungPotongan.mockResolvedValue({
        kode: 'H',
        potongan: 30_000,
        subtotalBerlaku: 200_000,
        deskripsi: null,
      });
      loyalty.hitungPotongan.mockResolvedValue({ poin: 200, potongan: 20_000 });

      await service.buatDariKeranjang(
        TOKEN_KERANJANG,
        { ...dtoDasar, kodeVoucher: 'H', poinDipakai: 200 },
        'pelanggan-1',
      );

      // 200.000 − 30.000 − 20.000 + 20.000 = 170.000
      expect(prisma.order.create.mock.calls[0]![0].data.total).toBe(170_000);
    });

    it('tidak pernah membiarkan potongan menutup ongkir', async () => {
      // Pengiriman adalah biaya nyata yang tetap ditagih kurir apa pun promonya.
      voucher.hitungPotongan.mockResolvedValue({
        kode: 'H',
        potongan: 200_000,
        subtotalBerlaku: 200_000,
        deskripsi: null,
      });

      await service.buatDariKeranjang(TOKEN_KERANJANG, { ...dtoDasar, kodeVoucher: 'H' });

      expect(prisma.order.create.mock.calls[0]![0].data.total).toBe(20_000);
    });

    it('menyimpan penyedia ongkir yang benar-benar dipakai untuk keperluan audit', async () => {
      await service.buatDariKeranjang(TOKEN_KERANJANG, dtoDasar);

      expect(prisma.order.create.mock.calls[0]![0].data.penyediaOngkir).toBe('tarif-lokal');
    });

    it('menyimpan salinan data produk di item pesanan', async () => {
      // Perubahan katalog setelahnya tidak boleh mengubah isi pesanan yang sudah jadi.
      await service.buatDariKeranjang(TOKEN_KERANJANG, dtoDasar);

      expect(prisma.order.create.mock.calls[0]![0].data.items.create[0]).toMatchObject({
        namaProduk: 'Kemeja Flanel',
        sku: 'SKU-1',
        harga: 100_000,
        jumlah: 2,
        subtotal: 200_000,
      });
    });

    it('menyimpan atribusi iklan bersama pesanan', async () => {
      await service.buatDariKeranjang(TOKEN_KERANJANG, {
        ...dtoDasar,
        utmSource: 'facebook',
        utmCampaign: 'promo-agustus',
        landingSlug: 'diskon-kemeja',
      });

      expect(prisma.order.create.mock.calls[0]![0].data).toMatchObject({
        utmSource: 'facebook',
        utmCampaign: 'promo-agustus',
        landingSlug: 'diskon-kemeja',
      });
    });
  });

  describe('buatDariKeranjang — nomor pesanan & pembersihan', () => {
    it('membuat nomor berurutan per hari', async () => {
      const hariIni = new Date();
      const tanggal = [
        hariIni.getFullYear(),
        String(hariIni.getMonth() + 1).padStart(2, '0'),
        String(hariIni.getDate()).padStart(2, '0'),
      ].join('');

      await service.buatDariKeranjang(TOKEN_KERANJANG, dtoDasar);

      expect(prisma.order.create.mock.calls[0]![0].data.nomor).toBe(`INV-${tanggal}-0001`);
    });

    it('melanjutkan penomoran dari pesanan terakhir hari itu', async () => {
      prisma.order.findFirst.mockResolvedValue({ nomor: 'INV-20260817-0041' });

      await service.buatDariKeranjang(TOKEN_KERANJANG, dtoDasar);

      expect(prisma.order.create.mock.calls[0]![0].data.nomor).toMatch(/-0042$/);
    });

    it('memberi token acak supaya nomor pesanan saja tidak cukup untuk membukanya', async () => {
      await service.buatDariKeranjang(TOKEN_KERANJANG, dtoDasar);

      expect(prisma.order.create.mock.calls[0]![0].data.token).toMatch(/^[\w-]{32}$/);
    });

    it('mengosongkan keranjang setelah pesanan jadi', async () => {
      await service.buatDariKeranjang(TOKEN_KERANJANG, dtoDasar);

      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { token: TOKEN_KERANJANG },
        data: { checkoutAt: expect.any(Date), items: { deleteMany: {} } },
      });
    });

    it('memberi batas waktu bayar sesuai BATAS_BAYAR_MENIT', async () => {
      await service.buatDariKeranjang(TOKEN_KERANJANG, dtoDasar);

      const kedaluwarsa = prisma.order.create.mock.calls[0]![0].data.kedaluwarsaPada as Date;
      const selisihMenit = (kedaluwarsa.getTime() - Date.now()) / 60_000;
      expect(selisihMenit).toBeGreaterThan(1_430);
      expect(selisihMenit).toBeLessThanOrEqual(1_440);
    });
  });

  describe('siapkanPembayaran', () => {
    beforeEach(() => {
      prisma.order.findUnique.mockResolvedValue(pesananTersimpan());
    });

    it('menolak membuka pembayaran untuk pesanan yang sudah lunas', async () => {
      prisma.order.findUnique.mockResolvedValue(
        pesananTersimpan({ statusPembayaran: 'LUNAS' }),
      );

      await expect(
        service.siapkanPembayaran('INV-20260817-0001', 'token-pesanan'),
      ).rejects.toThrow(/sudah dibayar/i);
    });

    it('menolak pesanan yang sudah dibatalkan atau hangus', async () => {
      for (const status of ['ORDER_CANCELLED', 'PAYMENT_EXPIRED']) {
        prisma.order.findUnique.mockResolvedValue(pesananTersimpan({ status }));

        await expect(
          service.siapkanPembayaran('INV-20260817-0001', 'token-pesanan'),
        ).rejects.toThrow(/tidak berlaku/i);
      }
    });

    it('menghanguskan pesanan yang lewat batas bayar saat pembeli mencoba membayar', async () => {
      prisma.order.findUnique.mockResolvedValue(
        pesananTersimpan({ kedaluwarsaPada: new Date(Date.now() - 1_000) }),
      );

      await expect(
        service.siapkanPembayaran('INV-20260817-0001', 'token-pesanan'),
      ).rejects.toThrow(/batas waktu/i);
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'PAYMENT_EXPIRED', statusPembayaran: 'KEDALUWARSA' },
        }),
      );
    });

    it('memakai ulang token Snap yang masih hidup', async () => {
      // Membuat transaksi baru untuk pesanan yang sama akan menghasilkan
      // transaksi ganda di Midtrans.
      prisma.order.findUnique.mockResolvedValue(
        pesananTersimpan({ snapToken: 'snap-lama', midtransOrderId: 'INV-1-x' }),
      );

      const hasil = await service.siapkanPembayaran('INV-20260817-0001', 'token-pesanan');

      expect(hasil.snapToken).toBe('snap-lama');
      expect(midtrans.buatTransaksi).not.toHaveBeenCalled();
    });

    it('mengirim rincian item yang jumlahnya sama persis dengan total pesanan', async () => {
      await service.siapkanPembayaran('INV-20260817-0001', 'token-pesanan');

      const permintaan = midtrans.buatTransaksi.mock.calls[0]![0];
      const jumlah = permintaan.items.reduce(
        (t: number, i: { price: number; quantity: number }) => t + i.price * i.quantity,
        0,
      );
      expect(jumlah).toBe(permintaan.total);
    });

    it('mengirim voucher dan potongan poin sebagai baris terpisah bernilai negatif', async () => {
      prisma.order.findUnique.mockResolvedValue(
        pesananTersimpan({
          diskon: 30_000,
          kodeVoucher: 'HEMAT10',
          poinDipakai: 200,
          potonganPoin: 20_000,
          total: 170_000,
        }),
      );

      await service.siapkanPembayaran('INV-20260817-0001', 'token-pesanan');

      const items = midtrans.buatTransaksi.mock.calls[0]![0].items;
      expect(items).toContainEqual(
        expect.objectContaining({ id: 'DISKON', price: -30_000 }),
      );
      expect(items).toContainEqual(expect.objectContaining({ id: 'POIN', price: -20_000 }));
    });

    it('memberi Midtrans batas kedaluwarsa minimal 5 menit', async () => {
      prisma.order.findUnique.mockResolvedValue(
        pesananTersimpan({ kedaluwarsaPada: new Date(Date.now() + 30_000) }),
      );

      await service.siapkanPembayaran('INV-20260817-0001', 'token-pesanan');

      expect(midtrans.buatTransaksi.mock.calls[0]![0].kedaluwarsaMenit).toBe(5);
    });

    it('memberi order_id Midtrans yang unik walau nomor pesanannya sama', async () => {
      await service.siapkanPembayaran('INV-20260817-0001', 'token-pesanan');

      expect(midtrans.buatTransaksi.mock.calls[0]![0].orderId).toMatch(
        /^INV-20260817-0001-[a-z0-9]+$/,
      );
    });
  });

  describe('lihat', () => {
    it('menolak dibuka tanpa token yang cocok', async () => {
      // Nomor pesanan mudah ditebak dan halamannya berisi alamat rumah pembeli.
      prisma.order.findUnique.mockResolvedValue(pesananTersimpan({ token: 'token-asli' }));

      await expect(service.lihat('INV-20260817-0001', 'token-tebakan')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('menanyakan status ke Midtrans saat pembayaran masih menunggu', async () => {
      prisma.order.findUnique.mockResolvedValue(
        pesananTersimpan({ midtransOrderId: 'INV-1-x' }),
      );

      await service.lihat('INV-20260817-0001', 'token-pesanan');

      expect(payment.sinkronkan).toHaveBeenCalledWith('INV-20260817-0001');
    });

    it('tetap menampilkan pesanan walau Midtrans tidak bisa dihubungi', async () => {
      prisma.order.findUnique.mockResolvedValue(
        pesananTersimpan({ midtransOrderId: 'INV-1-x' }),
      );
      payment.sinkronkan.mockRejectedValue(new Error('jaringan putus'));

      await expect(service.lihat('INV-20260817-0001', 'token-pesanan')).resolves.toMatchObject({
        nomor: 'INV-20260817-0001',
      });
    });

    it('tidak menghubungi Midtrans untuk pesanan yang sudah lunas', async () => {
      prisma.order.findUnique.mockResolvedValue(
        pesananTersimpan({ statusPembayaran: 'LUNAS', midtransOrderId: 'INV-1-x' }),
      );

      await service.lihat('INV-20260817-0001', 'token-pesanan');

      expect(payment.sinkronkan).not.toHaveBeenCalled();
    });

    it('menandai pesanan kedaluwarsa saat dibaca, tanpa menunggu cron', async () => {
      prisma.order.findUnique.mockResolvedValue(
        pesananTersimpan({ kedaluwarsaPada: new Date(Date.now() - 1_000) }),
      );
      prisma.order.update.mockResolvedValue(
        pesananTersimpan({ status: 'PAYMENT_EXPIRED', statusPembayaran: 'KEDALUWARSA' }),
      );

      const hasil = await service.lihat('INV-20260817-0001', 'token-pesanan');

      expect(hasil.status).toBe('PAYMENT_EXPIRED');
    });
  });
});
