import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { buatSlug } from "../common/slug";
import { productInclude, toAdminProduct } from "../catalog/product.mapper";
import type { CreateProductDto, UpdateProductDto } from "./dto/product.dto";
import type { Prisma } from "../generated/prisma/client.ts";
import type { ProductStatus } from "../generated/prisma/enums.ts";

@Injectable()
export class AdminProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async daftar(params: {
    page: number;
    limit: number;
    q?: string;
    status?: ProductStatus;
    kategoriId?: string;
  }) {
    const { page, limit, q, status, kategoriId } = params;

    const where: Prisma.ProductWhereInput = {
      ...(status ? { status } : {}),
      ...(kategoriId ? { categoryId: kategoriId } : {}),
      ...(q
        ? {
            OR: [
              { nama: { contains: q, mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } },
              { brand: { nama: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: productInclude,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: items.map(toAdminProduct),
      meta: {
        page,
        limit,
        total,
        totalHalaman: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async detail(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });
    if (!product) throw new NotFoundException("Produk tidak ditemukan");
    return toAdminProduct(product);
  }

  async buat(dto: CreateProductDto) {
    this.validasiHarga(dto);
    await this.pastikanSkuBelumDipakai(dto.sku);
    await this.pastikanSkuVarianUnik(dto.varian);

    const slug = await this.slugUnik(dto.slug?.trim() || dto.nama);
    const status = dto.status ?? "DRAFT";

    // Dibungkus transaksi karena gambar varian baru bisa ditulis setelah
    // variannya punya id. Tanpa ini, kegagalan di langkah kedua meninggalkan
    // produk yang variannya ada tapi gambarnya hilang.
    const product = await this.prisma.$transaction(async (tx) => {
      const dibuat = await tx.product.create({
        data: {
          nama: dto.nama,
          slug,
          deskripsi: dto.deskripsi ?? null,
          deskripsiSingkat: dto.deskripsiSingkat ?? null,
          brandId: dto.brandId || null,
          sku: dto.sku,
          categoryId: dto.categoryId || null,
          harga: dto.harga,
          hargaCoret: dto.hargaCoret ?? null,
          hpp: dto.hpp ?? null,
          berat: dto.berat,
          panjang: dto.panjang ?? null,
          lebar: dto.lebar ?? null,
          tinggi: dto.tinggi ?? null,
          stok: dto.stok ?? 0,
          stokMinimum: dto.stokMinimum ?? 5,
          status,
          unggulan: dto.unggulan ?? false,
          kenaPpn: dto.kenaPpn ?? true,
          metaTitle: dto.metaTitle ?? null,
          metaDescription: dto.metaDescription ?? null,
          linkShopee: dto.linkShopee ?? null,
          linkTiktok: dto.linkTiktok ?? null,
          publishedAt: status === "PUBLISHED" ? new Date() : null,
          images: dto.gambar?.length
            ? {
                create: dto.gambar.map((g, i) => ({
                  url: g.url,
                  alt: g.alt ?? null,
                  urutan: i,
                })),
              }
            : undefined,
          labels: dto.labelIds?.length
            ? { create: dto.labelIds.map((labelId) => ({ labelId })) }
            : undefined,
          variants: dto.varian?.length
            ? {
                create: dto.varian.map((v, i) => ({
                  nama: v.nama,
                  sku: v.sku,
                  harga: v.harga ?? null,
                  stok: v.stok,
                  aktif: v.aktif ?? true,
                  urutan: i,
                })),
              }
            : undefined,
        },
        select: { id: true },
      });

      await this.simpanGambarVarian(tx, dibuat.id, dto.varian);

      return tx.product.findUniqueOrThrow({
        where: { id: dibuat.id },
        include: productInclude,
      });
    });

    return toAdminProduct(product);
  }

  async perbarui(id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        status: true,
        publishedAt: true,
        harga: true,
        hargaCoret: true,
      },
    });
    if (!existing) throw new NotFoundException("Produk tidak ditemukan");

    this.validasiHarga({
      harga: dto.harga ?? existing.harga,
      hargaCoret:
        dto.hargaCoret === undefined ? existing.hargaCoret : dto.hargaCoret,
    });

    if (dto.sku) await this.pastikanSkuBelumDipakai(dto.sku, id);
    await this.pastikanSkuVarianUnik(dto.varian, id);

    const slug =
      dto.slug && buatSlug(dto.slug) !== existing.slug
        ? await this.slugUnik(dto.slug, id)
        : undefined;

    const statusBaru = dto.status ?? existing.status;
    // publishedAt di-set sekali saat produk pertama kali terbit, lalu dipertahankan.
    const publishedAt =
      statusBaru === "PUBLISHED" && !existing.publishedAt
        ? new Date()
        : undefined;

    // Gambar & varian dikirim sebagai daftar utuh dari form admin, jadi
    // pendekatannya replace-all di dalam satu transaksi agar tidak ada state setengah jadi.
    await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          ...(dto.nama !== undefined ? { nama: dto.nama } : {}),
          ...(slug ? { slug } : {}),
          ...(dto.deskripsi !== undefined ? { deskripsi: dto.deskripsi } : {}),
          ...(dto.deskripsiSingkat !== undefined
            ? { deskripsiSingkat: dto.deskripsiSingkat }
            : {}),
          ...(dto.brandId !== undefined
            ? { brandId: dto.brandId || null }
            : {}),
          ...(dto.sku !== undefined ? { sku: dto.sku } : {}),
          ...(dto.categoryId !== undefined
            ? { categoryId: dto.categoryId || null }
            : {}),
          ...(dto.harga !== undefined ? { harga: dto.harga } : {}),
          ...(dto.hargaCoret !== undefined
            ? { hargaCoret: dto.hargaCoret }
            : {}),
          ...(dto.hpp !== undefined ? { hpp: dto.hpp } : {}),
          ...(dto.berat !== undefined ? { berat: dto.berat } : {}),
          ...(dto.panjang !== undefined ? { panjang: dto.panjang } : {}),
          ...(dto.lebar !== undefined ? { lebar: dto.lebar } : {}),
          ...(dto.tinggi !== undefined ? { tinggi: dto.tinggi } : {}),
          ...(dto.stok !== undefined ? { stok: dto.stok } : {}),
          ...(dto.stokMinimum !== undefined
            ? { stokMinimum: dto.stokMinimum }
            : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.unggulan !== undefined ? { unggulan: dto.unggulan } : {}),
          ...(dto.kenaPpn !== undefined ? { kenaPpn: dto.kenaPpn } : {}),
          ...(dto.metaTitle !== undefined ? { metaTitle: dto.metaTitle } : {}),
          ...(dto.metaDescription !== undefined
            ? { metaDescription: dto.metaDescription }
            : {}),
          ...(dto.linkShopee !== undefined
            ? { linkShopee: dto.linkShopee }
            : {}),
          ...(dto.linkTiktok !== undefined
            ? { linkTiktok: dto.linkTiktok }
            : {}),
          ...(publishedAt ? { publishedAt } : {}),
        },
      });

      // Hanya gambar umum yang disapu di sini (variantId null). Gambar milik
      // varian punya siklus hidupnya sendiri di bawah — kalau ikut terhapus,
      // menyunting galeri utama diam-diam membuang gambar tiap varian.
      if (dto.gambar) {
        await tx.productImage.deleteMany({
          where: { productId: id, variantId: null },
        });
        if (dto.gambar.length) {
          await tx.productImage.createMany({
            data: dto.gambar.map((g, i) => ({
              productId: id,
              url: g.url,
              alt: g.alt ?? null,
              urutan: i,
            })),
          });
        }
      }

      if (dto.labelIds) {
        await tx.productLabel.deleteMany({ where: { productId: id } });
        if (dto.labelIds.length) {
          await tx.productLabel.createMany({
            data: dto.labelIds.map((labelId) => ({ productId: id, labelId })),
          });
        }
      }

      // Varian dihapus-ganti utuh; gambar miliknya ikut terbuang lewat CASCADE,
      // lalu ditulis ulang setelah varian barunya punya id.
      if (dto.varian) {
        await tx.productVariant.deleteMany({ where: { productId: id } });
        if (dto.varian.length) {
          await tx.productVariant.createMany({
            data: dto.varian.map((v, i) => ({
              productId: id,
              nama: v.nama,
              sku: v.sku,
              harga: v.harga ?? null,
              stok: v.stok,
              aktif: v.aktif ?? true,
              urutan: i,
            })),
          });
          await this.simpanGambarVarian(tx, id, dto.varian);
        }
      }
    });

    return this.detail(id);
  }

  /**
   * Hapus permanen. Untuk produk yang pernah terjual, gunakan status ARCHIVED
   * agar riwayat order tetap utuh (lihat research/business/02-catalog-inventory.md).
   */
  async hapus(id: string) {
    const ada = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!ada) throw new NotFoundException("Produk tidak ditemukan");
    await this.prisma.product.delete({ where: { id } });
    return { id, dihapus: true };
  }

  // -------------------------------------------------------------------------

  /**
   * Menulis gambar milik tiap varian setelah variannya tersimpan.
   *
   * Pemetaannya lewat SKU, bukan urutan array: SKU varian unik secara global,
   * sedangkan urutan bisa bergeser bila ada varian yang ditolak validasi.
   */
  private async simpanGambarVarian(
    tx: Prisma.TransactionClient,
    productId: string,
    varian: CreateProductDto["varian"],
  ): Promise<void> {
    const berGambar = (varian ?? []).filter((v) => v.gambar?.length);
    if (berGambar.length === 0) return;

    const tersimpan = await tx.productVariant.findMany({
      where: { productId },
      select: { id: true, sku: true },
    });
    const idPerSku = new Map(tersimpan.map((v) => [v.sku, v.id]));

    const baris = berGambar.flatMap((v) => {
      const variantId = idPerSku.get(v.sku);
      if (!variantId) return [];
      return (v.gambar ?? []).map((g, i) => ({
        productId,
        variantId,
        url: g.url,
        alt: g.alt ?? null,
        urutan: i,
      }));
    });

    if (baris.length > 0) await tx.productImage.createMany({ data: baris });
  }

  private validasiHarga(dto: {
    harga: number;
    hargaCoret?: number | null;
  }): void {
    if (dto.hargaCoret != null && dto.hargaCoret <= dto.harga) {
      throw new BadRequestException(
        "Harga coret harus lebih besar dari harga jual",
      );
    }
  }

  private async pastikanSkuBelumDipakai(
    sku: string,
    kecualiId?: string,
  ): Promise<void> {
    const bentrok = await this.prisma.product.findFirst({
      where: { sku, ...(kecualiId ? { NOT: { id: kecualiId } } : {}) },
      select: { id: true },
    });
    if (bentrok)
      throw new BadRequestException(`SKU "${sku}" sudah dipakai produk lain`);
  }

  private async pastikanSkuVarianUnik(
    varian: { sku: string }[] | undefined,
    productId?: string,
  ): Promise<void> {
    if (!varian?.length) return;

    const skus = varian.map((v) => v.sku);
    const duplikatInternal = skus.find((sku, i) => skus.indexOf(sku) !== i);
    if (duplikatInternal) {
      throw new BadRequestException(
        `SKU varian "${duplikatInternal}" duplikat dalam produk ini`,
      );
    }

    const bentrok = await this.prisma.productVariant.findFirst({
      where: {
        sku: { in: skus },
        ...(productId ? { NOT: { productId } } : {}),
      },
      select: { sku: true },
    });
    if (bentrok) {
      throw new BadRequestException(
        `SKU varian "${bentrok.sku}" sudah dipakai produk lain`,
      );
    }
  }

  /** Menambahkan sufiks angka bila slug sudah terpakai (kemeja-flanel-2). */
  private async slugUnik(sumber: string, kecualiId?: string): Promise<string> {
    const dasar = buatSlug(sumber) || "produk";
    let kandidat = dasar;
    let n = 2;

    while (
      await this.prisma.product.findFirst({
        where: {
          slug: kandidat,
          ...(kecualiId ? { NOT: { id: kecualiId } } : {}),
        },
        select: { id: true },
      })
    ) {
      kandidat = `${dasar}-${n++}`;
    }
    return kandidat;
  }
}
