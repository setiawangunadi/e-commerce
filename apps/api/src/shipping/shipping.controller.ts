import { BadRequestException, Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { ShippingService } from './shipping.service';

class TujuanDto {
  @IsString()
  @IsNotEmpty({ message: 'Provinsi wajib dipilih' })
  provinsi!: string;

  @IsString()
  @IsNotEmpty({ message: 'Kota/kabupaten wajib diisi' })
  kota!: string;

  @IsOptional()
  @IsString()
  kecamatan?: string | null;

  @Matches(/^\d{5}$/, { message: 'Kode pos harus 5 digit angka' })
  kodePos!: string;
}

class HitungOngkirDto {
  @ValidateNested()
  @Type(() => TujuanDto)
  tujuan!: TujuanDto;

  @IsInt()
  @Min(1, { message: 'Berat kiriman tidak valid' })
  berat!: number;

  @IsInt()
  @Min(0)
  nilaiBarang!: number;
}

@Controller({ path: 'pengiriman', version: '1' })
export class ShippingController {
  constructor(private readonly shipping: ShippingService) {}

  @Get('provinsi')
  provinsi() {
    return this.shipping.daftarProvinsi();
  }

  @Get('kota')
  kota(@Query('provinsi') provinsi?: string) {
    if (!provinsi) throw new BadRequestException('Parameter provinsi wajib diisi');
    return this.shipping.daftarKota(provinsi);
  }

  @Get('kecamatan')
  kecamatan(@Query('provinsi') provinsi?: string, @Query('kota') kota?: string) {
    if (!provinsi || !kota) {
      throw new BadRequestException('Parameter provinsi dan kota wajib diisi');
    }
    return this.shipping.daftarKecamatan(provinsi, kota);
  }

  @Post('ongkir')
  ongkir(@Body() dto: HitungOngkirDto) {
    return this.shipping.hitungOngkir({
      tujuan: {
        provinsi: dto.tujuan.provinsi,
        kota: dto.tujuan.kota,
        kecamatan: dto.tujuan.kecamatan ?? null,
        kodePos: dto.tujuan.kodePos,
      },
      berat: dto.berat,
      nilaiBarang: dto.nilaiBarang,
    });
  }
}
