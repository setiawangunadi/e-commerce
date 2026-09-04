import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MinLength(2, { message: 'Nama kategori minimal 2 karakter' })
  @MaxLength(120)
  nama!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  deskripsi?: string | null;

  @IsOptional()
  @IsString()
  gambarUrl?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  urutan?: number;

  @IsOptional()
  @IsBoolean()
  aktif?: boolean;

  /** Kategori induk, mis. "Fashion". Kosong = kategori tingkat atas. */
  @IsOptional()
  @IsString()
  parentId?: string | null;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
