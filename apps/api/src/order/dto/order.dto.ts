import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class BuatOrderDto {
  @IsString()
  @MinLength(3, { message: 'Nama penerima minimal 3 karakter' })
  @MaxLength(100)
  nama!: string;

  @IsEmail({}, { message: 'Format email tidak valid' })
  @MaxLength(200)
  email!: string;

  // Nomor Indonesia: 08xx, 62xx, atau +62xx — 9–15 digit setelah dinormalkan.
  @Matches(/^(\+?62|0)8\d{7,13}$/, {
    message: 'Nomor WhatsApp tidak valid (contoh: 081234567890)',
  })
  telepon!: string;

  @IsString()
  @MinLength(10, { message: 'Alamat terlalu pendek — sertakan nama jalan dan nomor rumah' })
  @MaxLength(500)
  alamatLengkap!: string;

  @IsString()
  @IsNotEmpty({ message: 'Provinsi wajib dipilih' })
  provinsi!: string;

  @IsString()
  @IsNotEmpty({ message: 'Kota/kabupaten wajib diisi' })
  @MaxLength(100)
  kota!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  kecamatan?: string | null;

  @Matches(/^\d{5}$/, { message: 'Kode pos harus 5 digit angka' })
  kodePos!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  catatan?: string | null;

  @IsString()
  @IsNotEmpty({ message: 'Layanan pengiriman wajib dipilih' })
  kodeOngkir!: string;

  /** Kode voucher opsional. Potongannya dihitung ulang di server. */
  @IsOptional()
  @IsString()
  @MaxLength(32)
  kodeVoucher?: string | null;

  /** Jumlah poin yang ingin dipakai. Diabaikan bila pembeli belum masuk. */
  @IsOptional()
  @IsInt({ message: 'Jumlah poin harus berupa angka' })
  @Min(0)
  poinDipakai?: number;

  // --- Atribusi iklan (opsional, diisi otomatis dari landing page) ---
  @IsOptional() @IsString() @MaxLength(120) utmSource?: string | null;
  @IsOptional() @IsString() @MaxLength(120) utmMedium?: string | null;
  @IsOptional() @IsString() @MaxLength(200) utmCampaign?: string | null;
  @IsOptional() @IsString() @MaxLength(200) utmContent?: string | null;
  @IsOptional() @IsString() @MaxLength(200) utmTerm?: string | null;
  @IsOptional() @IsString() @MaxLength(120) landingSlug?: string | null;
}
