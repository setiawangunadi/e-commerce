import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { OrderStatus } from '../../generated/prisma/enums.ts';

export class UbahStatusDto {
  @IsEnum(OrderStatus, { message: 'Status pesanan tidak dikenal' })
  status!: OrderStatus;

  /** Wajib saat status tujuan ORDER_SEND — divalidasi di service. */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  nomorResi?: string | null;
}

export class UbahResiDto {
  @IsString()
  @MinLength(4, { message: 'Nomor resi terlalu pendek' })
  @MaxLength(60)
  nomorResi!: string;
}
