import { PartialType } from '@nestjs/mapped-types';
import {
  IsBoolean,
  IsHexColor,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateLabelDto {
  @IsString()
  @MinLength(2, { message: 'Nama label minimal 2 karakter' })
  @MaxLength(40)
  nama!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  slug?: string;

  @IsOptional()
  @IsHexColor({ message: 'Warna harus kode heksadesimal, mis. #c96442' })
  warna?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  urutan?: number;

  @IsOptional()
  @IsBoolean()
  aktif?: boolean;

  @IsOptional()
  @IsISO8601({}, { message: 'Waktu mulai tidak valid' })
  mulai?: string | null;

  @IsOptional()
  @IsISO8601({}, { message: 'Waktu selesai tidak valid' })
  selesai?: string | null;
}

export class UpdateLabelDto extends PartialType(CreateLabelDto) {}
