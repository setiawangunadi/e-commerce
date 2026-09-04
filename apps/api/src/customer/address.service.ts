import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { kecamatanValid, kotaValid, provinsiValid } from '../shipping/wilayah';
import type { AlamatDto, UpdateAlamatDto } from './dto/customer-auth.dto';

/** Batas jumlah alamat per akun — cukup untuk pemakaian wajar, menahan penyalahgunaan. */
const MAKS_ALAMAT = 20;

@Injectable()
export class AddressService {
  constructor(private readonly prisma: PrismaService) {}

  async daftar(customerId: string) {
    return this.prisma.customerAddress.findMany({
      where: { customerId },
      orderBy: [{ utama: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async buat(customerId: string, dto: AlamatDto) {
    const jumlah = await this.prisma.customerAddress.count({ where: { customerId } });
    if (jumlah >= MAKS_ALAMAT) {
      throw new BadRequestException(`Maksimal ${MAKS_ALAMAT} alamat tersimpan`);
    }

    this.pastikanWilayahValid(dto.provinsi, dto.kota, dto.kecamatan ?? null);

    // Alamat pertama otomatis jadi utama — kalau tidak, checkout tidak punya
    // apa pun untuk diisikan otomatis.
    const utama = dto.utama ?? jumlah === 0;

    return this.prisma.$transaction(async (tx) => {
      if (utama) {
        await tx.customerAddress.updateMany({ where: { customerId }, data: { utama: false } });
      }
      return tx.customerAddress.create({
        data: {
          customerId,
          label: dto.label.trim(),
          namaPenerima: dto.namaPenerima.trim(),
          teleponPenerima: dto.teleponPenerima.trim(),
          alamatLengkap: dto.alamatLengkap.trim(),
          provinsi: dto.provinsi,
          kota: dto.kota,
          kecamatan: dto.kecamatan || null,
          kodePos: dto.kodePos,
          catatan: dto.catatan?.trim() || null,
          utama,
        },
      });
    });
  }

  async perbarui(customerId: string, id: string, dto: UpdateAlamatDto) {
    const ada = await this.milikSendiri(customerId, id);

    const provinsi = dto.provinsi ?? ada.provinsi;
    const kota = dto.kota ?? ada.kota;
    const kecamatan = dto.kecamatan !== undefined ? dto.kecamatan : ada.kecamatan;
    this.pastikanWilayahValid(provinsi, kota, kecamatan);

    return this.prisma.$transaction(async (tx) => {
      if (dto.utama) {
        await tx.customerAddress.updateMany({ where: { customerId }, data: { utama: false } });
      }
      return tx.customerAddress.update({
        where: { id },
        data: {
          ...(dto.label !== undefined ? { label: dto.label.trim() } : {}),
          ...(dto.namaPenerima !== undefined ? { namaPenerima: dto.namaPenerima.trim() } : {}),
          ...(dto.teleponPenerima !== undefined
            ? { teleponPenerima: dto.teleponPenerima.trim() }
            : {}),
          ...(dto.alamatLengkap !== undefined
            ? { alamatLengkap: dto.alamatLengkap.trim() }
            : {}),
          ...(dto.provinsi !== undefined ? { provinsi: dto.provinsi } : {}),
          ...(dto.kota !== undefined ? { kota: dto.kota } : {}),
          ...(dto.kecamatan !== undefined ? { kecamatan: dto.kecamatan || null } : {}),
          ...(dto.kodePos !== undefined ? { kodePos: dto.kodePos } : {}),
          ...(dto.catatan !== undefined ? { catatan: dto.catatan?.trim() || null } : {}),
          ...(dto.utama !== undefined ? { utama: dto.utama } : {}),
        },
      });
    });
  }

  async hapus(customerId: string, id: string) {
    const alamat = await this.milikSendiri(customerId, id);
    await this.prisma.customerAddress.delete({ where: { id } });

    // Jangan tinggalkan akun tanpa alamat utama — checkout mengandalkannya.
    if (alamat.utama) {
      const pengganti = await this.prisma.customerAddress.findFirst({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      if (pengganti) {
        await this.prisma.customerAddress.update({
          where: { id: pengganti.id },
          data: { utama: true },
        });
      }
    }

    return { id, dihapus: true };
  }

  /**
   * Memastikan alamat benar-benar milik pemanggil.
   *
   * Tanpa pemeriksaan ini, siapa pun yang menebak id alamat orang lain bisa
   * membaca atau mengubah alamat rumah orang tersebut.
   */
  private async milikSendiri(customerId: string, id: string) {
    const alamat = await this.prisma.customerAddress.findUnique({ where: { id } });
    if (!alamat || alamat.customerId !== customerId) {
      throw new NotFoundException('Alamat tidak ditemukan');
    }
    return alamat;
  }

  private pastikanWilayahValid(provinsi: string, kota: string, kecamatan: string | null): void {
    if (!provinsiValid(provinsi)) {
      throw new BadRequestException(`Provinsi "${provinsi}" tidak dikenali`);
    }
    if (!kotaValid(provinsi, kota)) {
      throw new BadRequestException(`Kota/kabupaten "${kota}" tidak ada di ${provinsi}`);
    }
    if (kecamatan && !kecamatanValid(provinsi, kota, kecamatan)) {
      throw new BadRequestException(`Kecamatan "${kecamatan}" tidak ada di ${kota}`);
    }
  }
}
