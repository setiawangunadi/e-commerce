import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateBrandDto {
  @IsString()
  @MinLength(2, { message: 'Nama merek minimal 2 karakter' })
  @MaxLength(100)
  nama!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  deskripsi?: string | null;

  @IsOptional()
  @IsString()
  logoUrl?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  urutan?: number;

  @IsOptional()
  @IsBoolean()
  aktif?: boolean;
}

export class UpdateBrandDto extends PartialType(CreateBrandDto) {}
