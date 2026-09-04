import { PartialType } from '@nestjs/mapped-types';
import {
  IsBoolean,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateBannerDto {
  @IsString()
  @MinLength(3, { message: 'Judul banner minimal 3 karakter' })
  @MaxLength(120)
  judul!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  subjudul?: string | null;

  @IsString()
  @MinLength(1, { message: 'Gambar banner wajib diunggah' })
  gambarUrl!: string;

  @IsOptional()
  @IsString()
  gambarMobileUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  teksTombol?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  tautanTombol?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  urutan?: number;

  @IsOptional()
  @IsBoolean()
  aktif?: boolean;

  @IsOptional()
  @IsISO8601({}, { message: 'Tanggal mulai tayang tidak valid' })
  mulaiTayang?: string | null;

  @IsOptional()
  @IsISO8601({}, { message: 'Tanggal selesai tayang tidak valid' })
  selesaiTayang?: string | null;
}

export class UpdateBannerDto extends PartialType(CreateBannerDto) {}
