import { PartialType } from '@nestjs/mapped-types';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * Nomor Indonesia dalam bentuk apa pun yang lazim diketik pembeli:
 * 08xx, 8xx, +628xx, atau 628xx.
 */
const TELEPON_ID = /^(\+?62|0)?8[1-9][0-9]{6,11}$/;

/**
 * Panjang minimal 8 dan tanpa aturan komposisi yang rumit. Memaksa simbol dan
 * angka mendorong orang memakai pola tebakan seperti "Password1!" — panjang
 * lebih menentukan daripada ragam karakter.
 */
const SANDI_MIN = 8;

export class DaftarDto {
  @IsEmail({}, { message: 'Format email tidak valid' })
  @MaxLength(200)
  email!: string;

  @IsString()
  @MinLength(2, { message: 'Nama minimal 2 karakter' })
  @MaxLength(120)
  nama!: string;

  @IsString()
  @MinLength(SANDI_MIN, { message: `Kata sandi minimal ${SANDI_MIN} karakter` })
  @MaxLength(200)
  password!: string;

  @IsOptional()
  @IsString()
  @Matches(TELEPON_ID, { message: 'Nomor WhatsApp tidak valid, contoh: 081234567890' })
  telepon?: string;
}

export class MasukDto {
  @IsEmail({}, { message: 'Format email tidak valid' })
  email!: string;

  @IsString()
  @MinLength(1, { message: 'Kata sandi wajib diisi' })
  password!: string;
}

export class UbahProfilDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Nama minimal 2 karakter' })
  @MaxLength(120)
  nama?: string;

  @IsOptional()
  @IsString()
  @Matches(TELEPON_ID, { message: 'Nomor WhatsApp tidak valid, contoh: 081234567890' })
  telepon?: string | null;
}

export class UbahSandiDto {
  @IsString()
  @MinLength(1, { message: 'Kata sandi lama wajib diisi' })
  sandiLama!: string;

  @IsString()
  @MinLength(SANDI_MIN, { message: `Kata sandi baru minimal ${SANDI_MIN} karakter` })
  @MaxLength(200)
  sandiBaru!: string;
}

export class AlamatDto {
  @IsString()
  @MinLength(1, { message: 'Label alamat wajib diisi, mis. Rumah' })
  @MaxLength(40)
  label!: string;

  @IsString()
  @MinLength(2, { message: 'Nama penerima minimal 2 karakter' })
  @MaxLength(120)
  namaPenerima!: string;

  @IsString()
  @Matches(TELEPON_ID, { message: 'Nomor penerima tidak valid, contoh: 081234567890' })
  teleponPenerima!: string;

  @IsString()
  @MinLength(10, { message: 'Alamat terlalu pendek — tulis nama jalan dan nomor' })
  @MaxLength(500)
  alamatLengkap!: string;

  @IsString() @MinLength(1) @MaxLength(100) provinsi!: string;
  @IsString() @MinLength(1) @MaxLength(100) kota!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  kecamatan?: string | null;

  @IsString()
  @Matches(/^\d{5}$/, { message: 'Kode pos harus 5 angka' })
  kodePos!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  catatan?: string | null;

  @IsOptional()
  @IsBoolean()
  utama?: boolean;
}

export class UpdateAlamatDto extends PartialType(AlamatDto) {}

export class TukarPoinDto {
  @IsInt({ message: 'Jumlah poin harus berupa angka' })
  @Min(1, { message: 'Jumlah poin minimal 1' })
  poin!: number;
}
