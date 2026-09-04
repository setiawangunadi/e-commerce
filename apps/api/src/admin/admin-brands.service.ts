import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buatSlug } from '../common/slug';
import type { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';

@Injectable()
export class AdminBrandsService {
  constructor(private readonly prisma: PrismaService) {}

  async daftar() {
    const merek = await this.prisma.brand.findMany({
      orderBy: [{ urutan: 'asc' }, { nama: 'asc' }],
      include: { _count: { select: { products: true } } },
    });

    return merek.map((m) => ({
      id: m.id,
      nama: m.nama,
      slug: m.slug,
      deskripsi: m.deskripsi,
      logoUrl: m.logoUrl,
      urutan: m.urutan,
      aktif: m.aktif,
      jumlahProduk: m._count.products,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }));
  }

  async buat(dto: CreateBrandDto) {
    const nama = dto.nama.trim();
    await this.pastikanNamaBebas(nama);

    const slug = await this.slugUnik(dto.slug?.trim() || nama);

    return this.prisma.brand.create({
      data: {
        nama,
        slug,
        deskripsi: dto.deskripsi?.trim() || null,
        logoUrl: dto.logoUrl?.trim() || null,
        urutan: dto.urutan ?? 0,
        aktif: dto.aktif ?? true,
      },
    });
  }

  async perbarui(id: string, dto: UpdateBrandDto) {
    const ada = await this.prisma.brand.findUnique({
      where: { id },
      select: { id: true, nama: true, slug: true },
    });
    if (!ada) throw new NotFoundException('Merek tidak ditemukan');

    const nama = dto.nama?.trim();
    if (nama && nama !== ada.nama) await this.pastikanNamaBebas(nama, id);

    let slug: string | undefined;
    if (dto.slug && buatSlug(dto.slug) !== ada.slug) {
      slug = await this.slugUnik(dto.slug, id);
    }

    return this.prisma.brand.update({
      where: { id },
      data: {
        ...(nama ? { nama } : {}),
        ...(slug ? { slug } : {}),
        ...(dto.deskripsi !== undefined ? { deskripsi: dto.deskripsi?.trim() || null } : {}),
        ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl?.trim() || null } : {}),
        ...(dto.urutan !== undefined ? { urutan: dto.urutan } : {}),
        ...(dto.aktif !== undefined ? { aktif: dto.aktif } : {}),
      },
    });
  }

  /**
   * Hapus merek. Produknya tidak ikut terhapus — relasinya di-set null oleh
   * skema, jadi produk tetap ada tapi jadi tanpa merek. Jumlah produk yang
   * terpengaruh dikembalikan supaya admin tahu dampaknya, bukan menebak.
   */
  async hapus(id: string) {
    const ada = await this.prisma.brand.findUnique({
      where: { id },
      select: { id: true, _count: { select: { products: true } } },
    });
    if (!ada) throw new NotFoundException('Merek tidak ditemukan');

    await this.prisma.brand.delete({ where: { id } });
    return { id, dihapus: true, produkTerpengaruh: ada._count.products };
  }

  /**
   * Nama merek unik di level basis data, tapi dicek di sini juga supaya
   * pesannya terbaca manusia — bukan pelanggaran constraint mentah.
   */
  private async pastikanNamaBebas(nama: string, kecualiId?: string): Promise<void> {
    const bentrok = await this.prisma.brand.findFirst({
      where: { nama: { equals: nama, mode: 'insensitive' }, ...(kecualiId ? { NOT: { id: kecualiId } } : {}) },
      select: { id: true },
    });
    if (bentrok) throw new BadRequestException(`Merek "${nama}" sudah ada`);
  }

  private async slugUnik(sumber: string, kecualiId?: string): Promise<string> {
    const dasar = buatSlug(sumber) || 'merek';
    let kandidat = dasar;
    let n = 2;

    while (
      await this.prisma.brand.findFirst({
        where: { slug: kandidat, ...(kecualiId ? { NOT: { id: kecualiId } } : {}) },
        select: { id: true },
      })
    ) {
      kandidat = `${dasar}-${n++}`;
    }
    return kandidat;
  }
}
