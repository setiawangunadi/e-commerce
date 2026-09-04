import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsHexColor,
  IsInt,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { LandingBlockType, LandingStatus } from '../../generated/prisma/enums.ts';

export class BlokDto {
  @IsEnum(LandingBlockType, { message: 'Jenis blok tidak dikenal' })
  tipe!: LandingBlockType;

  @IsOptional()
  @IsBoolean()
  aktif?: boolean;

  /** Divalidasi lebih lanjut oleh skema Zod per jenis blok. */
  @IsObject({ message: 'Isi blok tidak valid' })
  konten!: Record<string, unknown>;
}

export class CreateLandingDto {
  @IsString()
  @MinLength(3, { message: 'Nama kampanye minimal 3 karakter' })
  @MaxLength(120)
  nama!: string;

  @IsOptional()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug hanya boleh huruf kecil, angka, dan tanda hubung',
  })
  @MaxLength(120)
  slug?: string;

  @IsOptional()
  @IsEnum(LandingStatus)
  status?: LandingStatus;

  @IsOptional() @IsString() @MaxLength(120) judulMeta?: string | null;
  @IsOptional() @IsString() @MaxLength(320) deskripsiMeta?: string | null;
  @IsOptional() @IsString() @MaxLength(500) gambarOg?: string | null;

  // Format ID sengaja divalidasi: salah tempel ID membuat kampanye berjalan
  // tanpa data konversi, dan itu baru ketahuan setelah anggaran iklan terpakai.
  @IsOptional()
  @Matches(/^\d{10,20}$/, { message: 'Meta Pixel ID berupa 10–20 digit angka' })
  metaPixelId?: string | null;

  @IsOptional()
  @Matches(/^G-[A-Z0-9]{6,15}$/i, { message: 'ID GA4 berformat G-XXXXXXXXXX' })
  ga4Id?: string | null;

  @IsOptional()
  @Matches(/^AW-\d{9,12}$/i, { message: 'ID Google Ads berformat AW-123456789' })
  googleAdsId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  googleAdsLabel?: string | null;

  @IsOptional()
  @Matches(/^GTM-[A-Z0-9]{4,10}$/i, { message: 'ID GTM berformat GTM-XXXXXXX' })
  gtmId?: string | null;

  @IsOptional()
  @IsHexColor({ message: 'Warna aksen harus kode heksadesimal, mis. #c96442' })
  warnaAksen?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'Tanggal mulai tayang tidak valid' })
  mulaiTayang?: string | null;

  @IsOptional()
  @IsISO8601({}, { message: 'Tanggal selesai tayang tidak valid' })
  selesaiTayang?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlokDto)
  blok?: BlokDto[];
}

export class UpdateLandingDto extends PartialType(CreateLandingDto) {}

export class UrutanBlokDto {
  @IsInt()
  @Min(0)
  urutan!: number;
}
