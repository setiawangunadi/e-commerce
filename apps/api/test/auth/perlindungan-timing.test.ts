import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as argon2 from 'argon2';
import { AuthService } from '../../src/auth/auth.service';
import { CustomerAuthService } from '../../src/customer/customer-auth.service';
import type { PrismaService } from '../../src/prisma/prisma.service';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import { buatConfigPalsu, buatPrismaPalsu, type PrismaPalsu } from '../bantuan/prisma-palsu';

/**
 * argon2 di-mock seluruhnya di berkas ini.
 *
 * Yang diuji bukan kekuatan hash-nya, melainkan bahwa verifikasi TETAP
 * dijalankan saat email tidak ditemukan. Membalas cepat untuk email tak
 * terdaftar membocorkan daftar email yang punya akun lewat selisih waktu
 * respons — dan itu tidak bisa diamati tanpa mengganti argon2 aslinya.
 */
vi.mock('argon2', () => ({
  argon2id: 2,
  hash: vi.fn().mockResolvedValue('$argon2id$hash-tiruan'),
  verify: vi.fn().mockResolvedValue(false),
}));

const jwtPalsu = { signAsync: vi.fn().mockResolvedValue('token') } as unknown as JwtService;

describe('Login admin — perlindungan terhadap kebocoran lewat waktu respons', () => {
  let prisma: PrismaPalsu;
  let service: AuthService;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(argon2.hash).mockResolvedValue('$argon2id$hash-tiruan');
    vi.mocked(argon2.verify).mockResolvedValue(false);

    prisma = buatPrismaPalsu();
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwtPalsu,
      buatConfigPalsu() as unknown as ConfigService,
    );
    await service.onModuleInit();
  });

  it('menyiapkan hash tiruan sekali saat modul dijalankan', () => {
    expect(argon2.hash).toHaveBeenCalledWith(expect.any(String), { type: argon2.argon2id });
  });

  it('tetap menjalankan verifikasi walau emailnya tidak terdaftar', async () => {
    prisma.adminUser.findUnique.mockResolvedValue(null);

    await service.login({ email: 'tidak-ada@toko.local', password: 'apa saja' }).catch(() => undefined);

    expect(argon2.verify).toHaveBeenCalledWith('$argon2id$hash-tiruan', 'apa saja');
  });

  it('tetap menjalankan verifikasi untuk akun yang dinonaktifkan', async () => {
    prisma.adminUser.findUnique.mockResolvedValue({
      id: 'admin-1',
      aktif: false,
      passwordHash: '$argon2id$asli',
    });

    await service.login({ email: 'admin@toko.local', password: 'apa saja' }).catch(() => undefined);

    expect(argon2.verify).toHaveBeenCalledWith('$argon2id$hash-tiruan', 'apa saja');
  });

  it('tidak jatuh saat argon2 melempar galat untuk hash yang rusak', async () => {
    // Hash rusak di database harus menghasilkan "kredensial salah",
    // bukan galat 500 yang membocorkan keadaan internal.
    vi.mocked(argon2.verify).mockRejectedValue(new Error('hash tidak bisa dibaca'));
    prisma.adminUser.findUnique.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@toko.local',
      nama: 'Admin',
      role: 'ADMIN',
      aktif: true,
      passwordHash: 'rusak',
    });

    await expect(
      service.login({ email: 'admin@toko.local', password: 'apa saja' }),
    ).rejects.toThrow(/Email atau password salah/);
  });
});

describe('Login pelanggan — perlindungan yang sama', () => {
  let prisma: PrismaPalsu;
  let service: CustomerAuthService;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(argon2.hash).mockResolvedValue('$argon2id$hash-tiruan');
    vi.mocked(argon2.verify).mockResolvedValue(false);

    prisma = buatPrismaPalsu();
    service = new CustomerAuthService(
      prisma as unknown as PrismaService,
      jwtPalsu,
      buatConfigPalsu() as unknown as ConfigService,
    );
    await service.onModuleInit();
  });

  it('tetap menjalankan verifikasi walau emailnya belum pernah mendaftar', async () => {
    prisma.customer.findUnique.mockResolvedValue(null);

    await service.masuk({ email: 'baru@contoh.id', password: 'rahasia123' }).catch(() => undefined);

    expect(argon2.verify).toHaveBeenCalledWith('$argon2id$hash-tiruan', 'rahasia123');
  });

  it('memberi pesan seragam untuk email tak terdaftar dan sandi salah', async () => {
    prisma.customer.findUnique.mockResolvedValue(null);
    const tidakAda = await service
      .masuk({ email: 'baru@contoh.id', password: 'rahasia123' })
      .catch((e) => e.message);

    prisma.customer.findUnique.mockResolvedValue({
      id: 'p1',
      email: 'ada@contoh.id',
      aktif: true,
      passwordHash: '$argon2id$asli',
    });
    const sandiSalah = await service
      .masuk({ email: 'ada@contoh.id', password: 'salah' })
      .catch((e) => e.message);

    expect(tidakAda).toBe(sandiSalah);
    expect(tidakAda).toBe('Email atau kata sandi salah');
  });

  it('memakai argon2id saat mendaftarkan pelanggan baru', async () => {
    prisma.customer.findUnique.mockResolvedValue(null);
    prisma.customer.create.mockResolvedValue({
      id: 'p1',
      email: 'baru@contoh.id',
      nama: 'Budi',
      telepon: null,
      tier: 'BRONZE',
      poin: 0,
      createdAt: new Date(),
    });

    await service.daftar({ email: 'Baru@Contoh.ID', nama: 'Budi', password: 'rahasia123' });

    expect(argon2.hash).toHaveBeenCalledWith('rahasia123', { type: argon2.argon2id });
  });
});
