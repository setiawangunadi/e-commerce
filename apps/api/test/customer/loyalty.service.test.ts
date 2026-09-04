import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { LoyaltyService } from '../../src/customer/loyalty.service';
import { MIN_POIN_JADI_VOUCHER } from '../../src/customer/loyalty.config';
import type { PrismaService } from '../../src/prisma/prisma.service';
import { buatPrismaPalsu, galatUnik, type PrismaPalsu } from '../bantuan/prisma-palsu';

function pesanan(ubah: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    nomor: 'INV-20260817-0001',
    customerId: 'pelanggan-1',
    subtotal: 500_000,
    diskon: 0,
    potonganPoin: 0,
    poinDipakai: 0,
    ...ubah,
  };
}

describe('LoyaltyService.kreditkanDariPesanan', () => {
  let prisma: PrismaPalsu;
  let service: LoyaltyService;

  beforeEach(() => {
    prisma = buatPrismaPalsu();
    service = new LoyaltyService(prisma as unknown as PrismaService);
    prisma.order.findUnique.mockResolvedValue(pesanan());
    prisma.customer.findUnique.mockResolvedValue({ id: 'pelanggan-1', tier: 'BRONZE', poin: 20 });
    prisma.order.aggregate.mockResolvedValue({ _sum: { subtotal: 0, diskon: 0, potonganPoin: 0 } });
  });

  it('tidak memberi poin untuk pesanan tamu', async () => {
    prisma.order.findUnique.mockResolvedValue(pesanan({ customerId: null }));

    expect(await service.kreditkanDariPesanan(prisma as never, 'order-1')).toBe(0);
    expect(prisma.pointLedger.create).not.toHaveBeenCalled();
  });

  it('mengkreditkan poin sesuai nilai barang bersih dan pengali tier', async () => {
    prisma.customer.findUnique.mockResolvedValue({ id: 'pelanggan-1', tier: 'GOLD', poin: 20 });

    // (500.000 − 0 − 0) / 10.000 × 1,5 = 75
    expect(await service.kreditkanDariPesanan(prisma as never, 'order-1')).toBe(75);
    expect(prisma.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { poin: { increment: 75 } } }),
    );
  });

  it('menghitung poin setelah seluruh potongan, bukan dari subtotal kotor', async () => {
    // Kalau tidak, pesanan yang dibayar sebagian besar dengan poin akan
    // menghasilkan poin baru hampir sebanyak yang barusan dipakai.
    prisma.order.findUnique.mockResolvedValue(
      pesanan({ subtotal: 500_000, diskon: 100_000, potonganPoin: 200_000 }),
    );

    expect(await service.kreditkanDariPesanan(prisma as never, 'order-1')).toBe(20);
  });

  it('mencatat saldo sesudah di ledger supaya mutasi bisa diaudit', async () => {
    await service.kreditkanDariPesanan(prisma as never, 'order-1');

    expect(prisma.pointLedger.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tipe: 'EARN',
        jumlah: 50,
        saldoSesudah: 70, // 20 saldo lama + 50
        orderId: 'order-1',
      }),
    });
  });

  it('tidak memberi poin dua kali untuk pesanan yang sama', async () => {
    // Sinkronisasi status Midtrans bisa berjalan berkali-kali; kunci unik di
    // ledger yang jadi penjaganya, bukan pengecekan yang bisa kalah balapan.
    prisma.pointLedger.create.mockRejectedValue(galatUnik());

    expect(await service.kreditkanDariPesanan(prisma as never, 'order-1')).toBe(0);
    expect(prisma.customer.update).not.toHaveBeenCalled();
  });

  it('meneruskan galat database yang bukan pelanggaran kunci unik', async () => {
    prisma.pointLedger.create.mockRejectedValue(new Error('koneksi putus'));

    await expect(service.kreditkanDariPesanan(prisma as never, 'order-1')).rejects.toThrow(
      /koneksi putus/,
    );
  });

  it('tidak mencatat apa pun bila poin yang dihasilkan nol', async () => {
    prisma.order.findUnique.mockResolvedValue(pesanan({ subtotal: 5_000 }));

    expect(await service.kreditkanDariPesanan(prisma as never, 'order-1')).toBe(0);
    expect(prisma.pointLedger.create).not.toHaveBeenCalled();
  });

  it('menyegarkan tier setelah poin dikreditkan', async () => {
    prisma.order.aggregate.mockResolvedValue({
      _sum: { subtotal: 7_000_000, diskon: 0, potonganPoin: 0 },
    });

    await service.kreditkanDariPesanan(prisma as never, 'order-1');

    expect(prisma.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { belanja12Bulan: 7_000_000, tier: 'GOLD' } }),
    );
  });
});

describe('LoyaltyService.segarkanTier', () => {
  let prisma: PrismaPalsu;
  let service: LoyaltyService;

  beforeEach(() => {
    prisma = buatPrismaPalsu();
    service = new LoyaltyService(prisma as unknown as PrismaService);
  });

  it('memakai jendela 12 bulan bergulir, bukan total seumur hidup', async () => {
    prisma.order.aggregate.mockResolvedValue({ _sum: {} });

    await service.segarkanTier(prisma as never, 'pelanggan-1');

    const where = prisma.order.aggregate.mock.calls[0]![0].where;
    const setahunLalu = new Date();
    setahunLalu.setFullYear(setahunLalu.getFullYear() - 1);
    expect(Math.abs(where.createdAt.gte.getTime() - setahunLalu.getTime())).toBeLessThan(5_000);
  });

  it('hanya menghitung pesanan yang benar-benar terbayar', async () => {
    prisma.order.aggregate.mockResolvedValue({ _sum: {} });

    await service.segarkanTier(prisma as never, 'pelanggan-1');

    expect(prisma.order.aggregate.mock.calls[0]![0].where.status.in).toEqual([
      'PAYMENT_SUCCESS',
      'PROCESS_ORDER',
      'ORDER_SEND',
      'ORDER_RECEIPT',
    ]);
  });

  it('tidak pernah menyimpan belanja negatif', async () => {
    prisma.order.aggregate.mockResolvedValue({
      _sum: { subtotal: 100_000, diskon: 90_000, potonganPoin: 50_000 },
    });

    await service.segarkanTier(prisma as never, 'pelanggan-1');

    expect(prisma.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { belanja12Bulan: 0, tier: 'BRONZE' } }),
    );
  });
});

describe('LoyaltyService.hitungPotongan', () => {
  let prisma: PrismaPalsu;
  let service: LoyaltyService;

  beforeEach(() => {
    prisma = buatPrismaPalsu();
    service = new LoyaltyService(prisma as unknown as PrismaService);
    prisma.customer.findUnique.mockResolvedValue({ poin: 1_000, aktif: true });
  });

  it('mengembalikan nol tanpa menyentuh database bila poin tidak dipakai', async () => {
    expect(await service.hitungPotongan('pelanggan-1', 0, 100_000)).toEqual({
      poin: 0,
      potongan: 0,
    });
    expect(prisma.customer.findUnique).not.toHaveBeenCalled();
  });

  it('menolak akun yang dinonaktifkan', async () => {
    prisma.customer.findUnique.mockResolvedValue({ poin: 1_000, aktif: false });

    await expect(service.hitungPotongan('pelanggan-1', 100, 100_000)).rejects.toThrow(
      /tidak aktif/i,
    );
  });

  it('menolak permintaan yang melebihi saldo, dan menyebut saldo sebenarnya', async () => {
    prisma.customer.findUnique.mockResolvedValue({ poin: 250, aktif: true });

    await expect(service.hitungPotongan('pelanggan-1', 300, 1_000_000)).rejects.toThrow(/250/);
  });

  it('menolak poin yang melebihi separuh subtotal', async () => {
    // Tanpa batas ini, pelanggan lama bisa membayar nyaris nol sementara toko
    // tetap menanggung ongkir dan biaya payment gateway.
    await expect(service.hitungPotongan('pelanggan-1', 600, 100_000)).rejects.toThrow(/maksimal/i);
  });

  it('menerima poin tepat di batas maksimal', async () => {
    expect(await service.hitungPotongan('pelanggan-1', 500, 100_000)).toEqual({
      poin: 500,
      potongan: 50_000,
    });
  });

  it('menghitung batas dari subtotal SETELAH voucher', async () => {
    // Voucher dipakai lebih dulu; poin hanya boleh menutupi separuh sisanya.
    await expect(service.hitungPotongan('pelanggan-1', 300, 50_000)).rejects.toThrow(/maksimal/i);
  });
});

describe('LoyaltyService.pakai', () => {
  let prisma: PrismaPalsu;
  let service: LoyaltyService;

  beforeEach(() => {
    prisma = buatPrismaPalsu();
    service = new LoyaltyService(prisma as unknown as PrismaService);
  });

  it('tidak melakukan apa pun untuk nol poin', async () => {
    await service.pakai(prisma as never, 'pelanggan-1', 0, 'order-1', 'INV-1');

    expect(prisma.customer.updateMany).not.toHaveBeenCalled();
  });

  it('mengurangi saldo dengan syarat, supaya dua checkout tidak memakai poin yang sama', async () => {
    prisma.customer.updateMany.mockResolvedValue({ count: 1 });
    prisma.customer.findUnique.mockResolvedValue({ poin: 700 });

    await service.pakai(prisma as never, 'pelanggan-1', 300, 'order-1', 'INV-1');

    expect(prisma.customer.updateMany).toHaveBeenCalledWith({
      where: { id: 'pelanggan-1', poin: { gte: 300 } },
      data: { poin: { decrement: 300 } },
    });
  });

  it('menggagalkan pesanan bila saldo keburu terpakai checkout lain', async () => {
    prisma.customer.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.pakai(prisma as never, 'pelanggan-1', 300, 'order-1', 'INV-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.pointLedger.create).not.toHaveBeenCalled();
  });

  it('mencatat pemakaian sebagai angka negatif di ledger', async () => {
    prisma.customer.updateMany.mockResolvedValue({ count: 1 });
    prisma.customer.findUnique.mockResolvedValue({ poin: 700 });

    await service.pakai(prisma as never, 'pelanggan-1', 300, 'order-1', 'INV-1');

    expect(prisma.pointLedger.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ tipe: 'REDEEM', jumlah: -300, saldoSesudah: 700 }),
    });
  });
});

describe('LoyaltyService.kembalikan', () => {
  let prisma: PrismaPalsu;
  let service: LoyaltyService;

  beforeEach(() => {
    prisma = buatPrismaPalsu();
    service = new LoyaltyService(prisma as unknown as PrismaService);
    prisma.order.findUnique.mockResolvedValue(pesanan({ poinDipakai: 300 }));
    prisma.customer.update.mockResolvedValue({ poin: 800 });
  });

  it('mengembalikan poin yang terpakai saat pesanan dibatalkan', async () => {
    await service.kembalikan(prisma as never, 'order-1');

    expect(prisma.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { poin: { increment: 300 } } }),
    );
    expect(prisma.pointLedger.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ tipe: 'REFUND', jumlah: 300 }),
    });
  });

  it('tidak melakukan apa pun untuk pesanan tanpa poin terpakai', async () => {
    prisma.order.findUnique.mockResolvedValue(pesanan({ poinDipakai: 0 }));

    await service.kembalikan(prisma as never, 'order-1');

    expect(prisma.customer.update).not.toHaveBeenCalled();
  });

  it('tidak melakukan apa pun untuk pesanan tamu', async () => {
    prisma.order.findUnique.mockResolvedValue(pesanan({ customerId: null, poinDipakai: 300 }));

    await service.kembalikan(prisma as never, 'order-1');

    expect(prisma.customer.update).not.toHaveBeenCalled();
  });

  it('tidak mengembalikan poin dua kali', async () => {
    prisma.pointLedger.findFirst.mockResolvedValue({ id: 'ledger-1' });

    await service.kembalikan(prisma as never, 'order-1');

    expect(prisma.customer.update).not.toHaveBeenCalled();
  });
});

describe('LoyaltyService.tukarJadiVoucher', () => {
  let prisma: PrismaPalsu;
  let service: LoyaltyService;

  beforeEach(() => {
    prisma = buatPrismaPalsu();
    service = new LoyaltyService(prisma as unknown as PrismaService);
    prisma.customer.updateMany.mockResolvedValue({ count: 1 });
    prisma.customer.findUniqueOrThrow.mockResolvedValue({ poin: 400 });
  });

  it('menolak penukaran di bawah ambang minimum', async () => {
    await expect(service.tukarJadiVoucher('pelanggan-1', MIN_POIN_JADI_VOUCHER - 1)).rejects.toThrow(
      new RegExp(`${MIN_POIN_JADI_VOUCHER} poin`),
    );
  });

  it('menolak bila saldo tidak mencukupi', async () => {
    prisma.customer.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.tukarJadiVoucher('pelanggan-1', 500)).rejects.toThrow(/tidak mencukupi/i);
    expect(prisma.voucher.create).not.toHaveBeenCalled();
  });

  it('membuat voucher nominal senilai poin yang ditukar', async () => {
    const hasil = await service.tukarJadiVoucher('pelanggan-1', 500);

    expect(hasil.nilai).toBe(50_000);
    expect(prisma.voucher.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tipe: 'NOMINAL',
        nilai: 50_000,
        // Voucher tidak boleh melebihi nilai belanjanya sendiri.
        minBelanja: 50_000,
        kuota: 1,
      }),
    });
  });

  it('memberi kode yang tidak bisa ditebak dari kode lain', async () => {
    const a = await service.tukarJadiVoucher('pelanggan-1', 500);
    const b = await service.tukarJadiVoucher('pelanggan-1', 500);

    expect(a.kode).toMatch(/^POIN[A-Z2-9]{8}$/);
    expect(a.kode).not.toBe(b.kode);
    // Karakter yang mudah tertukar saat dibacakan lewat telepon dihindari.
    expect(a.kode.slice(4)).not.toMatch(/[01IO]/);
  });

  it('mengulang bila kode acaknya kebetulan sudah dipakai', async () => {
    prisma.voucher.findUnique
      .mockResolvedValueOnce({ id: 'sudah-ada' })
      .mockResolvedValueOnce(null);

    await expect(service.tukarJadiVoucher('pelanggan-1', 500)).resolves.toBeDefined();
    expect(prisma.voucher.findUnique).toHaveBeenCalledTimes(2);
  });

  it('mencatat penukaran di ledger dengan kode vouchernya', async () => {
    const hasil = await service.tukarJadiVoucher('pelanggan-1', 500);

    expect(prisma.pointLedger.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tipe: 'TO_VOUCHER',
        jumlah: -500,
        kodeVoucher: hasil.kode,
      }),
    });
  });

  it('memberi voucher masa berlaku yang terbatas', async () => {
    const hasil = await service.tukarJadiVoucher('pelanggan-1', 500);

    expect(hasil.berlakuSampai.getTime()).toBeGreaterThan(Date.now());
  });
});

describe('LoyaltyService.sesuaikan (penyesuaian manual admin)', () => {
  let prisma: PrismaPalsu;
  let service: LoyaltyService;

  beforeEach(() => {
    prisma = buatPrismaPalsu();
    service = new LoyaltyService(prisma as unknown as PrismaService);
    prisma.customer.findUnique.mockResolvedValue({ poin: 500 });
    prisma.customer.update.mockResolvedValue({ poin: 600 });
  });

  it('menolak penyesuaian nol', async () => {
    await expect(service.sesuaikan('p1', 0, 'alasan', 'admin@toko.local')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('mewajibkan alasan supaya penyesuaian bisa dipertanggungjawabkan', async () => {
    await expect(service.sesuaikan('p1', 100, '   ', 'admin@toko.local')).rejects.toThrow(
      /alasan/i,
    );
  });

  it('menolak pengurangan yang membuat saldo jadi minus', async () => {
    await expect(service.sesuaikan('p1', -600, 'koreksi', 'admin@toko.local')).rejects.toThrow(
      /hanya 500/,
    );
  });

  it('mencatat siapa yang melakukan penyesuaian', async () => {
    await service.sesuaikan('p1', 100, 'kompensasi keterlambatan', 'admin@toko.local');

    expect(prisma.pointLedger.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tipe: 'ADJUST',
        jumlah: 100,
        keterangan: 'kompensasi keterlambatan — oleh admin@toko.local',
      }),
    });
  });

  it('menolak pelanggan yang tidak ada', async () => {
    prisma.customer.findUnique.mockResolvedValue(null);

    await expect(service.sesuaikan('hantu', 100, 'x', 'admin@toko.local')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('LoyaltyService.ringkasan', () => {
  let prisma: PrismaPalsu;
  let service: LoyaltyService;

  beforeEach(() => {
    prisma = buatPrismaPalsu();
    service = new LoyaltyService(prisma as unknown as PrismaService);
  });

  it('menghitung poin tertunda dari pesanan yang belum sampai ke pembeli', async () => {
    prisma.customer.findUnique.mockResolvedValue({
      poin: 200,
      tier: 'SILVER',
      belanja12Bulan: 3_000_000,
    });
    prisma.order.findMany.mockResolvedValue([
      { subtotal: 200_000, diskon: 0, potonganPoin: 0 },
      { subtotal: 100_000, diskon: 20_000, potonganPoin: 0 },
    ]);

    const hasil = await service.ringkasan('pelanggan-1');

    // (200.000/10.000 × 1,25) + (80.000/10.000 × 1,25) = 25 + 10
    expect(hasil.poinTertunda).toBe(35);
    expect(hasil.nilaiPoin).toBe(20_000);
    expect(hasil.tierBerikutnya).toEqual({ nama: 'Gold', kurang: 3_000_000, pengali: 1.5 });
  });

  it('menolak pelanggan yang tidak ada', async () => {
    prisma.customer.findUnique.mockResolvedValue(null);

    await expect(service.ringkasan('hantu')).rejects.toBeInstanceOf(NotFoundException);
  });
});
