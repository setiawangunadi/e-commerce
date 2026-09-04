import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateBannerDto, UpdateBannerDto } from '../admin/dto/banner.dto';
import type { Prisma } from '../generated/prisma/client.ts';

@Injectable()
export class BannerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Banner yang boleh tampil ke pembeli: aktif, dan bila jadwal tayang diisi,
   * waktu sekarang harus berada di dalam rentangnya.
   */
  async yangTayang() {
    const sekarang = new Date();

    const banners = await this.prisma.banner.findMany({
      where: {
        aktif: true,
        AND: [
          { OR: [{ mulaiTayang: null }, { mulaiTayang: { lte: sekarang } }] },
          { OR: [{ selesaiTayang: null }, { selesaiTayang: { gte: sekarang } }] },
        ],
      },
      orderBy: [{ urutan: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        judul: true,
        subjudul: true,
        gambarUrl: true,
        gambarMobileUrl: true,
        teksTombol: true,
        tautanTombol: true,
      },
    });

    return banners;
  }

  /** Daftar lengkap untuk admin — termasuk yang nonaktif & di luar jadwal. */
  daftarAdmin() {
    return this.prisma.banner.findMany({
      orderBy: [{ urutan: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async detail(id: string) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException('Banner tidak ditemukan');
    return banner;
  }

  buat(dto: CreateBannerDto) {
    const jadwal = this.validasiJadwal(dto.mulaiTayang, dto.selesaiTayang);

    return this.prisma.banner.create({
      data: {
        judul: dto.judul,
        subjudul: dto.subjudul ?? null,
        gambarUrl: dto.gambarUrl,
        gambarMobileUrl: dto.gambarMobileUrl ?? null,
        teksTombol: dto.teksTombol ?? null,
        tautanTombol: dto.tautanTombol ?? null,
        urutan: dto.urutan ?? 0,
        aktif: dto.aktif ?? true,
        ...jadwal,
      },
    });
  }

  async perbarui(id: string, dto: UpdateBannerDto) {
    const ada = await this.prisma.banner.findUnique({
      where: { id },
      select: { mulaiTayang: true, selesaiTayang: true },
    });
    if (!ada) throw new NotFoundException('Banner tidak ditemukan');

    // Jadwal divalidasi terhadap gabungan nilai lama & baru, supaya mengubah
    // salah satu tanggal saja tetap menghasilkan rentang yang masuk akal.
    const mulai =
      dto.mulaiTayang === undefined ? ada.mulaiTayang?.toISOString() ?? null : dto.mulaiTayang;
    const selesai =
      dto.selesaiTayang === undefined
        ? ada.selesaiTayang?.toISOString() ?? null
        : dto.selesaiTayang;
    const jadwal = this.validasiJadwal(mulai, selesai);

    const data: Prisma.BannerUpdateInput = {
      ...(dto.judul !== undefined ? { judul: dto.judul } : {}),
      ...(dto.subjudul !== undefined ? { subjudul: dto.subjudul } : {}),
      ...(dto.gambarUrl !== undefined ? { gambarUrl: dto.gambarUrl } : {}),
      ...(dto.gambarMobileUrl !== undefined ? { gambarMobileUrl: dto.gambarMobileUrl } : {}),
      ...(dto.teksTombol !== undefined ? { teksTombol: dto.teksTombol } : {}),
      ...(dto.tautanTombol !== undefined ? { tautanTombol: dto.tautanTombol } : {}),
      ...(dto.urutan !== undefined ? { urutan: dto.urutan } : {}),
      ...(dto.aktif !== undefined ? { aktif: dto.aktif } : {}),
      ...(dto.mulaiTayang !== undefined || dto.selesaiTayang !== undefined ? jadwal : {}),
    };

    return this.prisma.banner.update({ where: { id }, data });
  }

  async hapus(id: string) {
    const ada = await this.prisma.banner.findUnique({ where: { id }, select: { id: true } });
    if (!ada) throw new NotFoundException('Banner tidak ditemukan');
    await this.prisma.banner.delete({ where: { id } });
    return { id, dihapus: true };
  }

  private validasiJadwal(mulai?: string | null, selesai?: string | null) {
    const mulaiTayang = mulai ? new Date(mulai) : null;
    const selesaiTayang = selesai ? new Date(selesai) : null;

    if (mulaiTayang && selesaiTayang && selesaiTayang <= mulaiTayang) {
      throw new BadRequestException('Tanggal selesai tayang harus setelah tanggal mulai');
    }
    return { mulaiTayang, selesaiTayang };
  }
}
