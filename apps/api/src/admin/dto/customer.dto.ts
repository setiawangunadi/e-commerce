import { IsBoolean, IsInt, IsString, MaxLength, MinLength, NotEquals } from 'class-validator';

export class UbahAktifPelangganDto {
  @IsBoolean()
  aktif!: boolean;
}

/**
 * Penyesuaian poin manual. Alasan diwajibkan karena mutasi ini menciptakan
 * nilai dari ketiadaan — tanpa jejak alasannya, selisih saldo di kemudian hari
 * tidak bisa ditelusuri ke keputusan siapa pun.
 */
export class SesuaikanPoinDto {
  @IsInt({ message: 'Jumlah poin harus berupa angka' })
  @NotEquals(0, { message: 'Jumlah penyesuaian tidak boleh nol' })
  jumlah!: number;

  @IsString()
  @MinLength(5, { message: 'Alasan minimal 5 karakter' })
  @MaxLength(300)
  alasan!: string;
}
