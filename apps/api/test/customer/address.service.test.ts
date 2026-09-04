import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { AddressService } from '../../src/customer/address.service';
import type { AlamatDto } from '../../src/customer/dto/customer-auth.dto';
import type { PrismaService } from '../../src/prisma/prisma.service';
import { buatPrismaPalsu, type PrismaPalsu } from '../bantuan/prisma-palsu';

const dtoDasar: AlamatDto = {
  label: 'Rumah',
  namaPenerima: 'Budi Santoso',
  teleponPenerima: '081234567890',
  alamatLengkap: 'Jl. Merdeka No. 1, RT 01 RW 02',
  provinsi: 'Jawa Barat',
  kota: 'Kabupaten Bandung',
  kodePos: '40111',
};

function alamat(ubah: Record<string, unknown> = {}) {
  return {
    id: 'alamat-1',
    customerId: 'pelanggan-1',
    utama: false,
    provinsi: 'Jawa Barat',
    kota: 'Kabupaten Bandung',
    kecamatan: null,
    ...ubah,
  };
}

describe('AddressService', () => {
  let prisma: PrismaPalsu;
  let service: AddressService;

  beforeEach(() => {
    prisma = buatPrismaPalsu();
    service = new AddressService(prisma as unknown as PrismaService);
    prisma.customerAddress.create.mockResolvedValue(alamat());
    prisma.customerAddress.update.mockResolvedValue(alamat());
  });

  describe('buat', () => {
    it('menolak provinsi yang tidak dikenali', async () => {
      await expect(
        service.buat('pelanggan-1', { ...dtoDasar, provinsi: 'Wakanda' }),
      ).rejects.toThrow(/provinsi/i);
    });

    it('menolak kota yang tidak ada di provinsi yang dipilih', async () => {
      // Alamat yang mustahil membuat ongkir meleset dan paket tidak sampai.
      await expect(
        service.buat('pelanggan-1', { ...dtoDasar, provinsi: 'Aceh' }),
      ).rejects.toThrow(/tidak ada di Aceh/);
    });

    it('menolak kecamatan yang tidak ada di kotanya', async () => {
      await expect(
        service.buat('pelanggan-1', { ...dtoDasar, kecamatan: 'Kecamatan Karangan' }),
      ).rejects.toThrow(/kecamatan/i);
    });

    it('menerima kecamatan yang benar', async () => {
      await expect(
        service.buat('pelanggan-1', { ...dtoDasar, kecamatan: 'Cileunyi' }),
      ).resolves.toBeDefined();
    });

    it('membatasi jumlah alamat tersimpan per akun', async () => {
      prisma.customerAddress.count.mockResolvedValue(20);

      await expect(service.buat('pelanggan-1', dtoDasar)).rejects.toThrow(/maksimal 20/i);
    });

    it('menjadikan alamat pertama sebagai alamat utama otomatis', async () => {
      // Tanpa alamat utama, checkout tidak punya apa pun untuk diisikan otomatis.
      prisma.customerAddress.count.mockResolvedValue(0);

      await service.buat('pelanggan-1', dtoDasar);

      expect(prisma.customerAddress.create.mock.calls[0]![0].data.utama).toBe(true);
    });

    it('tidak menjadikan alamat kedua sebagai utama kecuali diminta', async () => {
      prisma.customerAddress.count.mockResolvedValue(1);

      await service.buat('pelanggan-1', dtoDasar);

      expect(prisma.customerAddress.create.mock.calls[0]![0].data.utama).toBe(false);
    });

    it('menurunkan alamat utama lama saat yang baru ditandai utama', async () => {
      prisma.customerAddress.count.mockResolvedValue(2);

      await service.buat('pelanggan-1', { ...dtoDasar, utama: true });

      expect(prisma.customerAddress.updateMany).toHaveBeenCalledWith({
        where: { customerId: 'pelanggan-1' },
        data: { utama: false },
      });
    });

    it('merapikan spasi berlebih pada isian teks', async () => {
      prisma.customerAddress.count.mockResolvedValue(0);

      await service.buat('pelanggan-1', { ...dtoDasar, label: '  Kantor  ' });

      expect(prisma.customerAddress.create.mock.calls[0]![0].data.label).toBe('Kantor');
    });
  });

  describe('kepemilikan alamat', () => {
    it('menolak membaca atau mengubah alamat milik orang lain', async () => {
      // Tanpa pemeriksaan ini, menebak id alamat sudah cukup untuk membaca
      // alamat rumah orang lain.
      prisma.customerAddress.findUnique.mockResolvedValue(alamat({ customerId: 'orang-lain' }));

      await expect(service.perbarui('pelanggan-1', 'alamat-1', {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(service.hapus('pelanggan-1', 'alamat-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('menolak alamat yang tidak ada', async () => {
      prisma.customerAddress.findUnique.mockResolvedValue(null);

      await expect(service.hapus('pelanggan-1', 'hantu')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('perbarui', () => {
    beforeEach(() => {
      prisma.customerAddress.findUnique.mockResolvedValue(alamat());
    });

    it('memvalidasi wilayah terhadap gabungan nilai lama dan baru', async () => {
      // Mengubah provinsi saja tetap harus menghasilkan kombinasi yang masuk akal.
      await expect(
        service.perbarui('pelanggan-1', 'alamat-1', { provinsi: 'Aceh' }),
      ).rejects.toThrow(/tidak ada di Aceh/);
    });

    it('menerima perubahan provinsi dan kota sekaligus', async () => {
      await expect(
        service.perbarui('pelanggan-1', 'alamat-1', { provinsi: 'Aceh', kota: 'Kabupaten Aceh Besar' }),
      ).resolves.toBeDefined();
    });

    it('hanya mengubah kolom yang dikirim', async () => {
      await service.perbarui('pelanggan-1', 'alamat-1', { label: 'Kantor' });

      expect(prisma.customerAddress.update.mock.calls[0]![0].data).toEqual({ label: 'Kantor' });
    });

    it('menurunkan alamat utama lain saat alamat ini dijadikan utama', async () => {
      await service.perbarui('pelanggan-1', 'alamat-1', { utama: true });

      expect(prisma.customerAddress.updateMany).toHaveBeenCalledWith({
        where: { customerId: 'pelanggan-1' },
        data: { utama: false },
      });
    });
  });

  describe('hapus', () => {
    it('menunjuk alamat pengganti saat alamat utama dihapus', async () => {
      // Akun tidak boleh ditinggalkan tanpa alamat utama — checkout mengandalkannya.
      prisma.customerAddress.findUnique.mockResolvedValue(alamat({ utama: true }));
      prisma.customerAddress.findFirst.mockResolvedValue({ id: 'alamat-2' });

      await service.hapus('pelanggan-1', 'alamat-1');

      expect(prisma.customerAddress.update).toHaveBeenCalledWith({
        where: { id: 'alamat-2' },
        data: { utama: true },
      });
    });

    it('tidak mencari pengganti saat yang dihapus bukan alamat utama', async () => {
      prisma.customerAddress.findUnique.mockResolvedValue(alamat({ utama: false }));

      await service.hapus('pelanggan-1', 'alamat-1');

      expect(prisma.customerAddress.update).not.toHaveBeenCalled();
    });

    it('tidak gagal bila alamat utama terakhir dihapus', async () => {
      prisma.customerAddress.findUnique.mockResolvedValue(alamat({ utama: true }));
      prisma.customerAddress.findFirst.mockResolvedValue(null);

      await expect(service.hapus('pelanggan-1', 'alamat-1')).resolves.toEqual({
        id: 'alamat-1',
        dihapus: true,
      });
    });
  });

  describe('daftar', () => {
    it('menempatkan alamat utama di urutan pertama', async () => {
      await service.daftar('pelanggan-1');

      expect(prisma.customerAddress.findMany).toHaveBeenCalledWith({
        where: { customerId: 'pelanggan-1' },
        orderBy: [{ utama: 'desc' }, { createdAt: 'desc' }],
      });
    });
  });
});
