import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buatSlug } from '../common/slug';
import type { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class AdminCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async daftar() {
    const kategori = await this.prisma.category.findMany({
      orderBy: [{ urutan: 'asc' }, { nama: 'asc' }],
      include: {
        _count: { select: { products: true, anak: true } },
        parent: { select: { id: true, nama: true, slug: true } },
      },
    });

    return kategori.map((k) => ({
      id: k.id,
      nama: k.nama,
      slug: k.slug,
      deskripsi: k.deskripsi,
      gambarUrl: k.gambarUrl,
      urutan: k.urutan,
      aktif: k.aktif,
      parentId: k.parentId,
      induk: k.parent,
      jumlahAnak: k._count.anak,
      jumlahProduk: k._count.products,
    }));
  }

  async buat(dto: CreateCategoryDto) {
    const slug = buatSlug(dto.slug?.trim() || dto.nama);
    const bentrok = await this.prisma.category.findUnique({ where: { slug }, select: { id: true } });
    if (bentrok) throw new BadRequestException(`Kategori dengan slug "${slug}" sudah ada`);

    await this.pastikanIndukValid(dto.parentId ?? null);

    return this.prisma.category.create({
      data: {
        nama: dto.nama,
        slug,
        deskripsi: dto.deskripsi ?? null,
        gambarUrl: dto.gambarUrl ?? null,
        urutan: dto.urutan ?? 0,
        aktif: dto.aktif ?? true,
        parentId: dto.parentId || null,
      },
    });
  }

  async perbarui(id: string, dto: UpdateCategoryDto) {
    const ada = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true, slug: true },
    });
    if (!ada) throw new NotFoundException('Kategori tidak ditemukan');

    if (dto.parentId !== undefined) {
      if (dto.parentId === id) {
        throw new BadRequestException('Kategori tidak bisa menjadi induk dirinya sendiri');
      }
      await this.pastikanIndukValid(dto.parentId ?? null, id);
    }

    let slug: string | undefined;
    if (dto.slug && buatSlug(dto.slug) !== ada.slug) {
      slug = buatSlug(dto.slug);
      const bentrok = await this.prisma.category.findFirst({
        where: { slug, NOT: { id } },
        select: { id: true },
      });
      if (bentrok) throw new BadRequestException(`Slug "${slug}" sudah dipakai kategori lain`);
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.nama !== undefined ? { nama: dto.nama } : {}),
        ...(slug ? { slug } : {}),
        ...(dto.deskripsi !== undefined ? { deskripsi: dto.deskripsi } : {}),
        ...(dto.gambarUrl !== undefined ? { gambarUrl: dto.gambarUrl } : {}),
        ...(dto.urutan !== undefined ? { urutan: dto.urutan } : {}),
        ...(dto.aktif !== undefined ? { aktif: dto.aktif } : {}),
        ...(dto.parentId !== undefined ? { parentId: dto.parentId || null } : {}),
      },
    });
  }

  async hapus(id: string) {
    const ada = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true, _count: { select: { anak: true, products: true } } },
    });
    if (!ada) throw new NotFoundException('Kategori tidak ditemukan');

    if (ada._count.anak > 0) {
      throw new BadRequestException(
        'Pindahkan atau hapus sub-kategorinya dulu sebelum menghapus kategori ini',
      );
    }

    // Produk tidak ikut terhapus — relasinya di-set null oleh skema, jadi
    // produknya tetap ada tapi jadi tanpa kategori.
    await this.prisma.category.delete({ where: { id } });
    return { id, dihapus: true, produkTerpengaruh: ada._count.products };
  }

  /**
   * Hanya dua tingkat yang didukung: induk tidak boleh punya induk lagi.
   * Membatasinya di sini mencegah rantai kategori yang tidak bisa dirender
   * rapi di navigasi maupun remah roti.
   */
  private async pastikanIndukValid(parentId: string | null, kecualiId?: string): Promise<void> {
    if (!parentId) return;

    const induk = await this.prisma.category.findUnique({
      where: { id: parentId },
      select: { id: true, parentId: true },
    });
    if (!induk) throw new BadRequestException('Kategori induk tidak ditemukan');
    if (induk.parentId) {
      throw new BadRequestException(
        'Kategori induk tidak boleh punya induk lagi — struktur dibatasi dua tingkat',
      );
    }

    // Kategori yang sudah punya anak tidak boleh dijadikan anak kategori lain,
    // karena itu akan membuat tingkat ketiga.
    if (kecualiId) {
      const punyaAnak = await this.prisma.category.count({ where: { parentId: kecualiId } });
      if (punyaAnak > 0) {
        throw new BadRequestException(
          'Kategori ini sudah punya sub-kategori, jadi tidak bisa dijadikan sub-kategori lain',
        );
      }
    }
  }
}
