import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { CartService } from './cart.service';
import { VoucherService } from '../voucher/voucher.service';
import { CekVoucherDto } from '../voucher/dto/voucher.dto';

/**
 * Token keranjang dikirim lewat header `X-Cart-Token`.
 *
 * Cookie httpOnly-nya sendiri dipegang Next.js: browser tidak pernah menyentuh
 * token ini langsung, Server Action yang membacanya lalu meneruskan ke API.
 */
const HEADER_TOKEN = 'x-cart-token';

class TambahItemDto {
  @IsUUID(undefined, { message: 'Produk tidak valid' })
  produkId!: string;

  @IsOptional()
  @IsUUID(undefined, { message: 'Varian tidak valid' })
  varianId?: string | null;

  @IsInt()
  @Min(1, { message: 'Jumlah minimal 1' })
  @Max(99, { message: 'Maksimal 99 buah per produk' })
  jumlah!: number;
}

class UbahJumlahDto {
  @IsInt()
  @Min(0)
  @Max(99, { message: 'Maksimal 99 buah per produk' })
  jumlah!: number;
}

@Controller({ path: 'keranjang', version: '1' })
export class CartController {
  constructor(
    private readonly cart: CartService,
    private readonly voucher: VoucherService,
  ) {}

  /**
   * Pratinjau potongan voucher untuk isi keranjang saat ini.
   *
   * Nilai potongan dihitung ulang saat pesanan dibuat — hasil dari sini hanya
   * untuk ditampilkan, tidak pernah dipercaya sebagai harga final.
   */
  @Post('voucher')
  @HttpCode(HttpStatus.OK)
  async cekVoucher(@Body() dto: CekVoucherDto, @Headers(HEADER_TOKEN) token?: string) {
    const keranjang = await this.cart.ambilAtauBuat(wajibToken(token));
    if (keranjang.items.length === 0) {
      throw new BadRequestException('Keranjang Anda masih kosong');
    }

    return this.voucher.hitungPotongan(
      dto.kode,
      keranjang.items
        .filter((i) => !i.tidakTersedia)
        .map((i) => ({ produkId: i.produkId, kategoriId: i.kategoriId, subtotal: i.subtotal })),
    );
  }

  @Get()
  lihat(@Headers(HEADER_TOKEN) token?: string) {
    // Tanpa token berarti pembeli belum pernah menambah apa pun.
    if (!token) return kosong();
    return this.cart.ambilAtauBuat(token);
  }

  @Post('item')
  tambah(@Body() dto: TambahItemDto, @Headers(HEADER_TOKEN) token?: string) {
    return this.cart.tambah(wajibToken(token), {
      produkId: dto.produkId,
      varianId: dto.varianId ?? null,
      jumlah: dto.jumlah,
    });
  }

  @Patch('item/:id')
  ubah(
    @Param('id') id: string,
    @Body() dto: UbahJumlahDto,
    @Headers(HEADER_TOKEN) token?: string,
  ) {
    return this.cart.ubahJumlah(wajibToken(token), id, dto.jumlah);
  }

  @Delete('item/:id')
  hapus(@Param('id') id: string, @Headers(HEADER_TOKEN) token?: string) {
    return this.cart.hapus(wajibToken(token), id);
  }

  @Delete()
  kosongkan(@Headers(HEADER_TOKEN) token?: string) {
    return this.cart.kosongkan(wajibToken(token));
  }
}

function wajibToken(token?: string): string {
  if (!token) throw new BadRequestException('Sesi keranjang tidak ditemukan');
  return token;
}

function kosong() {
  return { id: null, items: [], jumlahItem: 0, subtotal: 0, beratTotal: 0, adaMasalah: false };
}
