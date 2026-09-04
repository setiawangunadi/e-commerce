import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { CartService } from '../cart/cart.service';
import { MidtransService } from '../payment/midtrans.service';
import { PaymentService } from '../payment/payment.service';
import { PrismaService } from '../prisma/prisma.service';
import { ShippingService } from '../shipping/shipping.service';
import { VoucherService } from '../voucher/voucher.service';
import { LoyaltyService } from '../customer/loyalty.service';
import type { BuatOrderDto } from './dto/order.dto';
import type { Prisma } from '../generated/prisma/client.ts';

const orderInclude = { items: true } satisfies Prisma.OrderInclude;
type OrderLengkap = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);
  private readonly batasBayarMenit: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cart: CartService,
    private readonly shipping: ShippingService,
    private readonly midtrans: MidtransService,
    private readonly payment: PaymentService,
    private readonly voucher: VoucherService,
    private readonly loyalty: LoyaltyService,
    config: ConfigService,
  ) {
    this.batasBayarMenit = Number(config.get('BATAS_BAYAR_MENIT', '1440')) || 1440;
  }

  /**
   * Membuat pesanan dari isi keranjang.
   *
   * Harga, stok, dan ongkir dihitung ulang di sini dari sumber aslinya —
   * tidak ada satu pun nilai uang yang dipercaya dari client.
   */
  async buatDariKeranjang(
    tokenKeranjang: string,
    dto: BuatOrderDto,
    customerId: string | null = null,
  ) {
    const keranjang = await this.cart.ambilAtauBuat(tokenKeranjang);

    if (keranjang.items.length === 0) {
      throw new BadRequestException('Keranjang Anda kosong');
    }
    if (keranjang.adaMasalah) {
      throw new ConflictException(
        'Ada item di keranjang yang stok atau ketersediaannya berubah. Silakan periksa kembali keranjang Anda.',
      );
    }

    // Ongkir divalidasi ulang ke penyedia — kode opsi dari client hanya dipakai
    // untuk memilih, bukan untuk menentukan nominalnya.
    const { opsi, penyedia } = await this.shipping.pastikanOpsiValid(
      {
        tujuan: {
          provinsi: dto.provinsi,
          kota: dto.kota,
          kecamatan: dto.kecamatan ?? null,
          kodePos: dto.kodePos,
        },
        berat: keranjang.beratTotal,
        nilaiBarang: keranjang.subtotal,
      },
      dto.kodeOngkir,
    );

    const subtotal = keranjang.subtotal;

    // Potongan voucher dihitung ulang di sini dari kodenya saja. Client tidak
    // pernah mengirim nominal diskon — kalau tidak, siapa pun bisa memesan
    // dengan potongan sebesar apa pun.
    let diskon = 0;
    let kodeVoucher: string | null = null;
    if (dto.kodeVoucher?.trim()) {
      const hasil = await this.voucher.hitungPotongan(
        dto.kodeVoucher,
        keranjang.items.map((i) => ({
          produkId: i.produkId,
          kategoriId: i.kategoriId,
          subtotal: i.subtotal,
        })),
      );
      diskon = hasil.potongan;
      kodeVoucher = hasil.kode;
    }

    // Poin hanya untuk pembeli yang sedang masuk. Nilainya pun dihitung ulang
    // di sini dari jumlah poin saja — sama seperti voucher, client tidak pernah
    // menentukan besar potongannya.
    let poinDipakai = 0;
    let potonganPoin = 0;
    if (customerId && dto.poinDipakai && dto.poinDipakai > 0) {
      const hasil = await this.loyalty.hitungPotongan(
        customerId,
        dto.poinDipakai,
        subtotal - diskon,
      );
      poinDipakai = hasil.poin;
      potonganPoin = hasil.potongan;
    }

    // Potongan tidak pernah boleh menutup ongkir: pengiriman adalah biaya nyata
    // yang tetap ditagih kurir apa pun promonya.
    const total = Math.max(0, subtotal - diskon - potonganPoin) + opsi.ongkir;
    const kedaluwarsaPada = new Date(Date.now() + this.batasBayarMenit * 60_000);

    const order = await this.prisma.$transaction(async (tx) => {
      // Stok dicek sekali lagi di dalam transaksi: antara pembeli membuka
      // checkout dan menekan bayar, stok bisa saja diambil pembeli lain.
      for (const item of keranjang.items) {
        const stok = item.varianId
          ? (await tx.productVariant.findUnique({ where: { id: item.varianId }, select: { stok: true } }))
              ?.stok
          : (await tx.product.findUnique({ where: { id: item.produkId }, select: { stok: true } }))?.stok;

        if (stok === undefined || stok === null || stok < item.jumlah) {
          throw new ConflictException(
            `Stok "${item.nama}" tinggal ${stok ?? 0}, tidak cukup untuk ${item.jumlah} buah.`,
          );
        }
      }

      // Kuota dicek & dinaikkan di dalam transaksi yang sama dengan pembuatan
      // pesanan, supaya dua pembeli yang menekan bayar bersamaan tidak
      // sama-sama lolos pada kuota terakhir.
      if (kodeVoucher) await this.voucher.pakai(tx, kodeVoucher);

      const nomor = await this.nomorBerikutnya(tx);

      const dibuat = await tx.order.create({
        data: {
          nomor,
          customerId,
          token: randomBytes(24).toString('base64url'),
          namaPembeli: dto.nama,
          emailPembeli: dto.email,
          teleponPembeli: dto.telepon,
          alamatLengkap: dto.alamatLengkap,
          provinsi: dto.provinsi,
          kota: dto.kota,
          kecamatan: dto.kecamatan ?? null,
          kodePos: dto.kodePos,
          catatanAlamat: dto.catatan ?? null,
          kurir: opsi.kurir,
          layananKurir: opsi.layanan,
          namaLayanan: opsi.nama,
          estimasiTiba: opsi.estimasi,
          beratTotal: keranjang.beratTotal,
          penyediaOngkir: penyedia,
          subtotal,
          ongkir: opsi.ongkir,
          diskon,
          kodeVoucher,
          poinDipakai,
          potonganPoin,
          total,
          kedaluwarsaPada,
          utmSource: dto.utmSource ?? null,
          utmMedium: dto.utmMedium ?? null,
          utmCampaign: dto.utmCampaign ?? null,
          utmContent: dto.utmContent ?? null,
          utmTerm: dto.utmTerm ?? null,
          landingSlug: dto.landingSlug ?? null,
          items: {
            create: keranjang.items.map((i) => ({
              productId: i.produkId,
              variantId: i.varianId,
              namaProduk: i.nama,
              namaVarian: i.namaVarian,
              sku: i.sku,
              gambarUrl: i.gambarUrl,
              harga: i.harga,
              jumlah: i.jumlah,
              subtotal: i.subtotal,
              berat: i.berat,
            })),
          },
        },
        include: orderInclude,
      });

      // Poin dipotong di transaksi yang sama dengan pembuatan pesanan, dengan
      // syarat saldo — dua checkout bersamaan tidak bisa memakai poin yang sama.
      if (customerId && poinDipakai > 0) {
        await this.loyalty.pakai(tx, customerId, poinDipakai, dibuat.id, dibuat.nomor);
      }

      return dibuat;
    });

    // Keranjang dikosongkan setelah pesanan jadi, supaya pembeli tidak
    // memesan barang yang sama dua kali.
    await this.prisma.cart.update({
      where: { token: tokenKeranjang },
      data: { checkoutAt: new Date(), items: { deleteMany: {} } },
    });

    this.logger.log(`Pesanan ${order.nomor} dibuat — total ${order.total}`);
    return this.bentukResponse(order);
  }

  /** Menyiapkan (atau memakai ulang) token Snap untuk sebuah pesanan. */
  async siapkanPembayaran(nomor: string, token: string) {
    const order = await this.cariMilikPembeli(nomor, token);

    if (order.statusPembayaran === 'LUNAS') {
      throw new BadRequestException('Pesanan ini sudah dibayar');
    }
    if (order.status === 'PAYMENT_EXPIRED' || order.status === 'ORDER_CANCELLED') {
      throw new BadRequestException('Pesanan ini sudah tidak berlaku');
    }
    if (order.kedaluwarsaPada < new Date()) {
      await this.tandaiKedaluwarsa(order.id);
      throw new BadRequestException('Batas waktu pembayaran pesanan ini sudah lewat');
    }

    // Token Snap yang masih hidup dipakai ulang agar tidak membuat transaksi
    // ganda di Midtrans untuk pesanan yang sama.
    if (order.snapToken && order.midtransOrderId) {
      return { snapToken: order.snapToken, redirectUrl: order.snapRedirectUrl, clientKey: this.midtrans.clientKey };
    }

    // order_id Midtrans harus unik seumur akun. Nomor pesanan sudah unik,
    // tapi sufiks waktu menjaga percobaan ulang tetap bisa dibuat.
    const midtransOrderId = `${order.nomor}-${Date.now().toString(36)}`;

    const sisaMenit = Math.max(
      5,
      Math.floor((order.kedaluwarsaPada.getTime() - Date.now()) / 60_000),
    );

    const hasil = await this.midtrans.buatTransaksi({
      orderId: midtransOrderId,
      total: order.total,
      pelanggan: {
        nama: order.namaPembeli,
        email: order.emailPembeli,
        telepon: order.teleponPembeli,
      },
      items: [
        ...order.items.map((i) => ({
          id: i.sku,
          price: i.harga,
          quantity: i.jumlah,
          name: i.namaVarian ? `${i.namaProduk} (${i.namaVarian})` : i.namaProduk,
        })),
        {
          id: 'ONGKIR',
          price: order.ongkir,
          quantity: 1,
          name: `Ongkir ${order.kurir} ${order.layananKurir}`,
        },
        // Midtrans menolak transaksi bila jumlah item tidak sama persis dengan
        // gross_amount, jadi setiap potongan ikut dikirim sebagai baris
        // berharga negatif. Potongan poin dipisah dari voucher supaya invoice
        // Midtrans terbaca sama dengan rincian yang dilihat pembeli.
        ...(order.diskon > 0
          ? [
              {
                id: 'DISKON',
                price: -order.diskon,
                quantity: 1,
                name: `Voucher ${order.kodeVoucher ?? ''}`.trim().slice(0, 50),
              },
            ]
          : []),
        ...(order.potonganPoin > 0
          ? [
              {
                id: 'POIN',
                price: -order.potonganPoin,
                quantity: 1,
                name: `Potongan ${order.poinDipakai} poin`.slice(0, 50),
              },
            ]
          : []),
      ],
      kedaluwarsaMenit: sisaMenit,
    });

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        midtransOrderId,
        snapToken: hasil.token,
        snapRedirectUrl: hasil.redirectUrl,
      },
    });

    return { snapToken: hasil.token, redirectUrl: hasil.redirectUrl, clientKey: this.midtrans.clientKey };
  }

  async lihat(nomor: string, token: string) {
    let order = await this.cariMilikPembeli(nomor, token);

    // Pembeli yang baru selesai membayar biasanya langsung mendarat di sini,
    // dan webhook belum tentu sudah sampai. Menanyakan status ke Midtrans
    // membuat halaman ini menampilkan keadaan sebenarnya, bukan status basi.
    if (order.statusPembayaran === 'MENUNGGU' && order.midtransOrderId) {
      try {
        const hasil = await this.payment.sinkronkan(nomor);
        if (hasil.diperbarui) order = await this.cariMilikPembeli(nomor, token);
      } catch (e) {
        // Kegagalan menghubungi Midtrans tidak boleh menjatuhkan halaman —
        // pembeli tetap melihat pesanannya dengan status terakhir yang tercatat.
        this.logger.warn(
          `Gagal menyelaraskan ${nomor}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    // Kedaluwarsa dievaluasi saat dibaca, jadi status yang dilihat pembeli
    // selalu benar meski cron belum sempat jalan.
    if (
      order.statusPembayaran === 'MENUNGGU' &&
      order.status === 'WAITING_PAYMENT' &&
      order.kedaluwarsaPada < new Date()
    ) {
      const diperbarui = await this.tandaiKedaluwarsa(order.id);
      return this.bentukResponse(diperbarui);
    }

    return this.bentukResponse(order);
  }

  // -------------------------------------------------------------------------

  private async cariMilikPembeli(nomor: string, token: string): Promise<OrderLengkap> {
    const order = await this.prisma.order.findUnique({ where: { nomor }, include: orderInclude });

    // Token wajib cocok: nomor pesanan saja mudah ditebak dan berisi data pribadi.
    if (!order || order.token !== token) {
      throw new NotFoundException('Pesanan tidak ditemukan');
    }
    return order;
  }

  private tandaiKedaluwarsa(id: string) {
    return this.prisma.order.update({
      where: { id },
      data: { status: 'PAYMENT_EXPIRED', statusPembayaran: 'KEDALUWARSA' },
      include: orderInclude,
    });
  }

  /** Nomor berurutan per hari: INV-20260814-0001 */
  private async nomorBerikutnya(tx: Prisma.TransactionClient): Promise<string> {
    const sekarang = new Date();
    const tanggal = [
      sekarang.getFullYear(),
      String(sekarang.getMonth() + 1).padStart(2, '0'),
      String(sekarang.getDate()).padStart(2, '0'),
    ].join('');

    const prefix = `INV-${tanggal}-`;
    const terakhir = await tx.order.findFirst({
      where: { nomor: { startsWith: prefix } },
      orderBy: { nomor: 'desc' },
      select: { nomor: true },
    });

    const urutan = terakhir ? Number(terakhir.nomor.slice(prefix.length)) + 1 : 1;
    return `${prefix}${String(urutan).padStart(4, '0')}`;
  }

  private bentukResponse(order: OrderLengkap) {
    return {
      nomor: order.nomor,
      token: order.token,
      status: order.status,
      statusPembayaran: order.statusPembayaran,
      metodePembayaran: order.metodePembayaran,
      pembeli: {
        nama: order.namaPembeli,
        email: order.emailPembeli,
        telepon: order.teleponPembeli,
      },
      alamat: {
        lengkap: order.alamatLengkap,
        provinsi: order.provinsi,
        kota: order.kota,
        kecamatan: order.kecamatan,
        kodePos: order.kodePos,
        catatan: order.catatanAlamat,
      },
      pengiriman: {
        kurir: order.kurir,
        layanan: order.layananKurir,
        nama: order.namaLayanan,
        estimasi: order.estimasiTiba,
        beratTotal: order.beratTotal,
        nomorResi: order.nomorResi,
      },
      items: order.items.map((i) => ({
        namaProduk: i.namaProduk,
        namaVarian: i.namaVarian,
        sku: i.sku,
        gambarUrl: i.gambarUrl,
        harga: i.harga,
        jumlah: i.jumlah,
        subtotal: i.subtotal,
      })),
      subtotal: order.subtotal,
      ongkir: order.ongkir,
      diskon: order.diskon,
      kodeVoucher: order.kodeVoucher,
      poinDipakai: order.poinDipakai,
      potonganPoin: order.potonganPoin,
      total: order.total,
      kedaluwarsaPada: order.kedaluwarsaPada,
      dibayarPada: order.dibayarPada,
      createdAt: order.createdAt,
    };
  }
}
