import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buatSlug } from '../common/slug';
import type { CreateLabelDto, UpdateLabelDto } from './dto/label.dto';

@Injectable()
export class LabelService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Label yang boleh tampil ke pembeli: aktif dan berada dalam jadwalnya.
   *
   * Jadwal penting untuk Flash Sale — lencananya harus hilang sendiri saat
   * periodenya habis, tanpa admin perlu mematikannya manual.
   */
  async yangTayang() {
    const sekarang = new Date();
    return this.prisma.label.findMany({
      where: {
        aktif: true,
        AND: [
          { OR: [{ mulai: null }, { mulai: { lte: sekarang } }] },
          { OR: [{ selesai: null }, { selesai: { gte: sekarang } }] },
        ],
      },
      orderBy: [{ urutan: 'asc' }, { nama: 'asc' }],
      select: { id: true, nama: true, slug: true, warna: true },
    });
  }

  async daftarAdmin() {
    const semua = await this.prisma.label.findMany({
      orderBy: [{ urutan: 'asc' }, { nama: 'asc' }],
      include: { _count: { select: { produk: true } } },
    });

    const sekarang = new Date();
    return semua.map((l) => ({
      id: l.id,
      nama: l.nama,
      slug: l.slug,
      warna: l.warna,
      urutan: l.urutan,
      aktif: l.aktif,
      mulai: l.mulai,
      selesai: l.selesai,
      jumlahProduk: l._count.produk,
      keadaan: !l.aktif
        ? 'Nonaktif'
        : l.mulai && sekarang < l.mulai
          ? 'Terjadwal'
          : l.selesai && sekarang > l.selesai
            ? 'Berakhir'
            : 'Tayang',
    }));
  }

  async buat(dto: CreateLabelDto) {
    const slug = await this.slugUnik(dto.slug?.trim() || dto.nama);
    const jadwal = this.validasiJadwal(dto.mulai, dto.selesai);

    return this.prisma.label.create({
      data: {
        nama: dto.nama,
        slug,
        warna: dto.warna ?? '#c96442',
        urutan: dto.urutan ?? 0,
        aktif: dto.aktif ?? true,
        ...jadwal,
      },
    });
  }

  async perbarui(id: string, dto: UpdateLabelDto) {
    const ada = await this.prisma.label.findUnique({
      where: { id },
      select: { id: true, slug: true, mulai: true, selesai: true },
    });
    if (!ada) throw new NotFoundException('Label tidak ditemukan');

    const slug =
      dto.slug && buatSlug(dto.slug) !== ada.slug ? await this.slugUnik(dto.slug, id) : undefined;

    const jadwal = this.validasiJadwal(
      dto.mulai === undefined ? (ada.mulai?.toISOString() ?? null) : dto.mulai,
      dto.selesai === undefined ? (ada.selesai?.toISOString() ?? null) : dto.selesai,
    );

    return this.prisma.label.update({
      where: { id },
      data: {
        ...(dto.nama !== undefined ? { nama: dto.nama } : {}),
        ...(slug ? { slug } : {}),
        ...(dto.warna !== undefined ? { warna: dto.warna } : {}),
        ...(dto.urutan !== undefined ? { urutan: dto.urutan } : {}),
        ...(dto.aktif !== undefined ? { aktif: dto.aktif } : {}),
        ...(dto.mulai !== undefined || dto.selesai !== undefined ? jadwal : {}),
      },
    });
  }

  async hapus(id: string) {
    const ada = await this.prisma.label.findUnique({ where: { id }, select: { id: true } });
    if (!ada) throw new NotFoundException('Label tidak ditemukan');
    await this.prisma.label.delete({ where: { id } });
    return { id, dihapus: true };
  }

  private validasiJadwal(mulai?: string | null, selesai?: string | null) {
    const m = mulai ? new Date(mulai) : null;
    const s = selesai ? new Date(selesai) : null;
    if (m && s && s <= m) {
      throw new BadRequestException('Waktu selesai harus setelah waktu mulai');
    }
    return { mulai: m, selesai: s };
  }

  private async slugUnik(sumber: string, kecualiId?: string): Promise<string> {
    const dasar = buatSlug(sumber) || 'label';
    let kandidat = dasar;
    let n = 2;
    while (
      await this.prisma.label.findFirst({
        where: { slug: kandidat, ...(kecualiId ? { NOT: { id: kecualiId } } : {}) },
        select: { id: true },
      })
    ) {
      kandidat = `${dasar}-${n++}`;
    }
    return kandidat;
  }
}
