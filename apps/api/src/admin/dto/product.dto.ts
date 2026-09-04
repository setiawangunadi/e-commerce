import { PartialType } from "@nestjs/mapped-types";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  IsUrl,
  ValidateNested,
} from "class-validator";
import { ProductStatus } from "../../generated/prisma/enums.ts";

/**
 * Host marketplace yang diterima. Dibatasi agar tombol "Beli di Shopee" benar-benar
 * mengarah ke Shopee — tautan yang salah label menyesatkan pembeli.
 * Termasuk domain pemendek resmi masing-masing platform.
 */
const HOST_SHOPEE = [
  "shopee.co.id",
  "www.shopee.co.id",
  "shopee.com",
  "shope.ee",
  "s.shopee.co.id",
];
const HOST_TIKTOK = [
  "tiktok.com",
  "www.tiktok.com",
  "vt.tiktok.com",
  "vm.tiktok.com",
  "shop.tiktok.com",
  "shop-id.tokopedia.com",
];

export class ImageDto {
  @IsString()
  @MinLength(1)
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  alt?: string | null;
}

export class VariantDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MinLength(1, { message: "Nama varian wajib diisi" })
  @MaxLength(120)
  nama!: string;

  @IsString()
  @MinLength(1, { message: "SKU varian wajib diisi" })
  @MaxLength(64)
  sku!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  harga?: number | null;

  @IsInt()
  @Min(0, { message: "Stok tidak boleh negatif" })
  stok!: number;

  @IsOptional()
  @IsBoolean()
  aktif?: boolean;

  /**
   * Gambar khusus varian ini. Kosongkan agar varian memakai gambar umum
   * produk — itu yang wajar untuk varian ukuran, yang barangnya sama persis.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10, { message: "Maksimal 10 gambar per varian" })
  @ValidateNested({ each: true })
  @Type(() => ImageDto)
  gambar?: ImageDto[];
}

export class CreateProductDto {
  @IsString()
  @MinLength(3, { message: "Nama produk minimal 3 karakter" })
  @MaxLength(200)
  nama!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  slug?: string;

  @IsOptional()
  @IsString()
  deskripsi?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  deskripsiSingkat?: string | null;

  /** Id merek. Kosong = produk tanpa merek. */
  @IsOptional()
  @IsString()
  brandId?: string | null;

  @IsString()
  @MinLength(1, { message: "SKU wajib diisi" })
  @MaxLength(64)
  sku!: string;

  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @IsInt({ message: "Harga harus berupa angka" })
  @Min(0, { message: "Harga tidak boleh negatif" })
  harga!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  hargaCoret?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  hpp?: number | null;

  @IsInt({ message: "Berat harus berupa angka (gram)" })
  @Min(1, { message: "Berat minimal 1 gram — dibutuhkan untuk hitung ongkir" })
  berat!: number;

  @IsOptional() @IsInt() @Min(0) panjang?: number | null;
  @IsOptional() @IsInt() @Min(0) lebar?: number | null;
  @IsOptional() @IsInt() @Min(0) tinggi?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0, { message: "Stok tidak boleh negatif" })
  stok?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stokMinimum?: number;

  @IsOptional()
  @IsEnum(ProductStatus, {
    message: "Status harus DRAFT, PUBLISHED, atau ARCHIVED",
  })
  status?: ProductStatus;

  @IsOptional()
  @IsBoolean()
  unggulan?: boolean;

  @IsOptional()
  @IsBoolean()
  kenaPpn?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  metaTitle?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  metaDescription?: string | null;

  // `require_protocol` + batasan protokol http/https mencegah admin (atau akun
  // admin yang dibajak) menyisipkan `javascript:` yang akan dirender sebagai
  // tautan di etalase.
  @IsOptional()
  @IsUrl(
    {
      protocols: ["http", "https"],
      require_protocol: true,
      host_whitelist: HOST_SHOPEE,
    },
    {
      message:
        "Link Shopee harus URL Shopee yang valid (contoh: https://shopee.co.id/...)",
    },
  )
  @MaxLength(500)
  linkShopee?: string | null;

  @IsOptional()
  @IsUrl(
    {
      protocols: ["http", "https"],
      require_protocol: true,
      host_whitelist: HOST_TIKTOK,
    },
    {
      message:
        "Link TikTok Shop harus URL TikTok yang valid (contoh: https://vt.tiktok.com/...)",
    },
  )
  @MaxLength(500)
  linkTiktok?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10, { message: "Maksimal 10 gambar per produk" })
  @ValidateNested({ each: true })
  @Type(() => ImageDto)
  gambar?: ImageDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  varian?: VariantDto[];

  /** Label promosi yang ditempel ke produk ini, mis. Flash Sale. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10, { message: "Maksimal 10 label per produk" })
  @IsString({ each: true })
  labelIds?: string[];
}

/** PATCH: semua field CreateProductDto jadi opsional, aturan validasinya tetap. */
export class UpdateProductDto extends PartialType(CreateProductDto) {}
