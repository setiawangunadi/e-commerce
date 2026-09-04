import { PartialType } from '@nestjs/mapped-types';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { VoucherType } from '../../generated/prisma/enums.ts';

export class CreateVoucherDto {
  @IsString()
  @MinLength(3, { message: 'Kode voucher minimal 3 karakter' })
  @MaxLength(32)
  kode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  deskripsi?: string | null;

  @IsEnum(VoucherType, { message: 'Tipe voucher harus PERSEN atau NOMINAL' })
  tipe!: VoucherType;

  @IsInt({ message: 'Nilai potongan harus berupa angka' })
  @Min(1)
  nilai!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maksPotongan?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  minBelanja?: number;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Kuota minimal 1' })
  kuota?: number | null;

  @IsOptional()
  @IsISO8601({}, { message: 'Tanggal mulai tidak valid' })
  mulai?: string | null;

  @IsOptional()
  @IsISO8601({}, { message: 'Tanggal selesai tidak valid' })
  selesai?: string | null;

  @IsOptional()
  @IsBoolean()
  aktif?: boolean;

  /** Kosongkan keduanya agar voucher berlaku untuk semua produk. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  produkIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  kategoriIds?: string[];
}

export class UpdateVoucherDto extends PartialType(CreateVoucherDto) {}

export class CekVoucherDto {
  @IsString()
  @MinLength(3, { message: 'Kode voucher terlalu pendek' })
  @MaxLength(32)
  kode!: string;
}
