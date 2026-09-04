import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerAuthService } from '../../src/customer/customer-auth.service';
import { AuthService } from '../../src/auth/auth.service';
import { AUD_PELANGGAN } from '../../src/customer/customer.types';
import type { PrismaService } from '../../src/prisma/prisma.service';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import { buatConfigPalsu, buatPrismaPalsu, type PrismaPalsu } from '../bantuan/prisma-palsu';

const SANDI = 'rahasia12345';
let hashSandi: string;

beforeAll(async () => {
  hashSandi = await AuthService.hashPassword(SANDI);
}, 30_000);

function pelanggan(ubah: Record<string, unknown> = {}) {
  return {
    id: 'pelanggan-1',
    email: 'budi@contoh.id',
    nama: 'Budi Santoso',
    telepon: '081234567890',
    tier: 'BRONZE',
    poin: 0,
    aktif: true,
    passwordHash: hashSandi,
    createdAt: new Date('2026-01-01'),
    ...ubah,
  };
}

describe('CustomerAuthService', () => {
  let prisma: PrismaPalsu;
  let jwt: { signAsync: ReturnType<typeof vi.fn> };
  let service: CustomerAuthService;

  beforeEach(async () => {
    prisma = buatPrismaPalsu();
    jwt = { signAsync: vi.fn().mockResolvedValue('token-pelanggan') };
    service = new CustomerAuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
      buatConfigPalsu() as unknown as ConfigService,
    );
    await service.onModuleInit();
  });

  describe('daftar', () => {
    beforeEach(() => {
      prisma.customer.create.mockResolvedValue(pelanggan());
    });

    it('menolak email yang sudah terdaftar', async () => {
      prisma.customer.findUnique.mockResolvedValue({ id: 'pelanggan-lama' });

      await expect(
        service.daftar({ email: 'budi@contoh.id', nama: 'Budi', password: SANDI }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('menyimpan email dalam huruf kecil', async () => {
      // Kalau tidak, "Budi@Contoh.ID" dan "budi@contoh.id" jadi dua akun.
      await service.daftar({ email: '  Budi@Contoh.ID ', nama: 'Budi', password: SANDI });

      expect(prisma.customer.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ email: 'budi@contoh.id' }) }),
      );
    });

    it('tidak pernah menyimpan sandi dalam bentuk teks biasa', async () => {
      await service.daftar({ email: 'budi@contoh.id', nama: 'Budi', password: SANDI });

      const data = prisma.customer.create.mock.calls[0]![0].data;
      expect(data.passwordHash).toMatch(/^\$argon2id\$/);
      expect(JSON.stringify(data)).not.toContain(SANDI);
    });

    it('menandai token sebagai audience pelanggan', async () => {
      await service.daftar({ email: 'budi@contoh.id', nama: 'Budi', password: SANDI });

      expect(jwt.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ aud: AUD_PELANGGAN }),
        expect.anything(),
      );
    });

    it('tidak mengembalikan hash sandi ke browser', async () => {
      const hasil = await service.daftar({ email: 'budi@contoh.id', nama: 'Budi', password: SANDI });

      expect(hasil.user).not.toHaveProperty('passwordHash');
    });

    it('menyimpan telepon kosong sebagai null, bukan string kosong', async () => {
      await service.daftar({
        email: 'budi@contoh.id',
        nama: 'Budi',
        password: SANDI,
        telepon: '   ',
      });

      expect(prisma.customer.create.mock.calls[0]![0].data.telepon).toBeNull();
    });
  });

  describe('klaim pesanan tamu', () => {
    beforeEach(() => {
      prisma.customer.create.mockResolvedValue(pelanggan());
      prisma.customer.findUnique.mockResolvedValue(null);
    });

    it('menarik pesanan tamu beremail sama ke akun yang baru dibuat', async () => {
      // Pembeli yang sudah pernah belanja sebagai tamu tidak boleh menemukan
      // riwayat pesanannya kosong setelah mendaftar.
      prisma.order.updateMany.mockResolvedValue({ count: 3 });

      const hasil = await service.daftar({
        email: 'budi@contoh.id',
        nama: 'Budi',
        password: SANDI,
      });

      expect(hasil.pesananDiklaim).toBe(3);
    });

    it('HANYA menyentuh pesanan yang belum punya pemilik', async () => {
      // Tanpa syarat ini, mendaftar dengan email orang lain akan merebut
      // pesanan yang sudah tertaut ke akun mereka.
      await service.daftar({ email: 'budi@contoh.id', nama: 'Budi', password: SANDI });

      expect(prisma.order.updateMany).toHaveBeenCalledWith({
        where: { customerId: null, emailPembeli: { equals: 'budi@contoh.id', mode: 'insensitive' } },
        data: { customerId: 'pelanggan-1' },
      });
    });

    it('juga mengklaim pesanan tamu saat pelanggan lama masuk', async () => {
      prisma.customer.findUnique.mockResolvedValue(pelanggan());
      prisma.order.updateMany.mockResolvedValue({ count: 1 });

      const hasil = await service.masuk({ email: 'budi@contoh.id', password: SANDI });

      expect(hasil.pesananDiklaim).toBe(1);
    });
  });

  describe('masuk', () => {
    it('menerbitkan token untuk kredensial yang benar', async () => {
      prisma.customer.findUnique.mockResolvedValue(pelanggan());

      const hasil = await service.masuk({ email: 'budi@contoh.id', password: SANDI });

      expect(hasil.accessToken).toBe('token-pelanggan');
      expect(hasil.user.email).toBe('budi@contoh.id');
    });

    it('menolak akun yang dinonaktifkan admin', async () => {
      prisma.customer.findUnique.mockResolvedValue(pelanggan({ aktif: false }));

      await expect(
        service.masuk({ email: 'budi@contoh.id', password: SANDI }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('mencatat waktu masuk terakhir', async () => {
      prisma.customer.findUnique.mockResolvedValue(pelanggan());

      await service.masuk({ email: 'budi@contoh.id', password: SANDI });

      expect(prisma.customer.update).toHaveBeenCalledWith({
        where: { id: 'pelanggan-1' },
        data: { lastLoginAt: expect.any(Date) },
      });
    });

    it('mencari email tanpa peduli huruf besar-kecil', async () => {
      prisma.customer.findUnique.mockResolvedValue(pelanggan());

      await service.masuk({ email: ' BUDI@CONTOH.ID ', password: SANDI });

      expect(prisma.customer.findUnique).toHaveBeenCalledWith({
        where: { email: 'budi@contoh.id' },
      });
    });
  });

  describe('profil & pengubahan data', () => {
    it('menolak sesi milik akun yang sudah dinonaktifkan', async () => {
      prisma.customer.findUnique.mockResolvedValue(pelanggan({ aktif: false }));

      await expect(service.profil('pelanggan-1')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('hanya mengubah kolom yang benar-benar dikirim', async () => {
      prisma.customer.update.mockResolvedValue(pelanggan());

      await service.ubahProfil('pelanggan-1', { nama: '  Budi Baru  ' });

      expect(prisma.customer.update.mock.calls[0]![0].data).toEqual({ nama: 'Budi Baru' });
    });

    it('mengosongkan telepon jadi null bila diisi spasi', async () => {
      prisma.customer.update.mockResolvedValue(pelanggan());

      await service.ubahProfil('pelanggan-1', { telepon: '  ' });

      expect(prisma.customer.update.mock.calls[0]![0].data).toEqual({ telepon: null });
    });
  });

  describe('ubahSandi', () => {
    it('MENUNTUT sandi lama walau sesinya sudah terverifikasi', async () => {
      // Itulah yang menghalangi orang yang menemukan perangkat tak terkunci
      // untuk mengunci pemiliknya keluar dari akunnya sendiri.
      prisma.customer.findUnique.mockResolvedValue({ passwordHash: hashSandi });

      await expect(
        service.ubahSandi('pelanggan-1', { sandiLama: 'salah', sandiBaru: 'sandibaru123' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.customer.update).not.toHaveBeenCalled();
    });

    it('menyimpan sandi baru sebagai hash argon2id', async () => {
      prisma.customer.findUnique.mockResolvedValue({ passwordHash: hashSandi });

      await service.ubahSandi('pelanggan-1', { sandiLama: SANDI, sandiBaru: 'sandibaru123' });

      const data = prisma.customer.update.mock.calls[0]![0].data;
      expect(data.passwordHash).toMatch(/^\$argon2id\$/);
      expect(data.passwordHash).not.toBe(hashSandi);
    });

    it('menolak sesi milik akun yang sudah hilang', async () => {
      prisma.customer.findUnique.mockResolvedValue(null);

      await expect(
        service.ubahSandi('hantu', { sandiLama: SANDI, sandiBaru: 'sandibaru123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
