import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../src/auth/auth.service';
import { AUD_ADMIN } from '../../src/customer/customer.types';
import type { PrismaService } from '../../src/prisma/prisma.service';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import { buatConfigPalsu, buatPrismaPalsu, type PrismaPalsu } from '../bantuan/prisma-palsu';

const SANDI = 'admin12345';
let hashSandi: string;

// argon2 sengaja lambat; satu hash dipakai ulang untuk seluruh berkas ini.
beforeAll(async () => {
  hashSandi = await AuthService.hashPassword(SANDI);
}, 30_000);

function admin(ubah: Record<string, unknown> = {}) {
  return {
    id: 'admin-1',
    email: 'admin@toko.local',
    nama: 'Admin Toko',
    role: 'ADMIN',
    aktif: true,
    passwordHash: hashSandi,
    ...ubah,
  };
}

describe('AuthService.hashPassword', () => {
  it('memakai argon2id, bukan algoritma lama', async () => {
    expect(hashSandi.startsWith('$argon2id$')).toBe(true);
  });

  it('memberi hash berbeda untuk sandi yang sama (salt acak)', async () => {
    const lain = await AuthService.hashPassword(SANDI);

    expect(lain).not.toBe(hashSandi);
    expect(await argon2.verify(lain, SANDI)).toBe(true);
  });
});

describe('AuthService.login', () => {
  let prisma: PrismaPalsu;
  let jwt: { signAsync: ReturnType<typeof vi.fn> };
  let service: AuthService;

  beforeEach(async () => {
    prisma = buatPrismaPalsu();
    jwt = { signAsync: vi.fn().mockResolvedValue('token-jwt') };
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
      buatConfigPalsu({ JWT_EXPIRES_IN: '8h' }) as unknown as ConfigService,
    );
    await service.onModuleInit();
  });

  it('menerbitkan token untuk kredensial yang benar', async () => {
    prisma.adminUser.findUnique.mockResolvedValue(admin());

    const hasil = await service.login({ email: 'admin@toko.local', password: SANDI });

    expect(hasil.accessToken).toBe('token-jwt');
    expect(hasil.user).toEqual({
      id: 'admin-1',
      email: 'admin@toko.local',
      nama: 'Admin Toko',
      role: 'ADMIN',
    });
  });

  it('MENANDAI token sebagai audience admin', async () => {
    // Tanpa `aud`, token pelanggan yang ditandatangani rahasia yang sama akan
    // lolos JwtAuthGuard dan membuka endpoint admin.
    prisma.adminUser.findUnique.mockResolvedValue(admin());

    await service.login({ email: 'admin@toko.local', password: SANDI });

    expect(jwt.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 'admin-1', role: 'ADMIN', aud: AUD_ADMIN }),
    );
  });

  it('tidak pernah memasukkan hash sandi ke dalam token', async () => {
    prisma.adminUser.findUnique.mockResolvedValue(admin());

    await service.login({ email: 'admin@toko.local', password: SANDI });

    expect(JSON.stringify(jwt.signAsync.mock.calls[0]![0])).not.toContain('argon2');
  });

  it('menolak sandi yang salah', async () => {
    prisma.adminUser.findUnique.mockResolvedValue(admin());

    await expect(
      service.login({ email: 'admin@toko.local', password: 'salah' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('menolak akun yang dinonaktifkan', async () => {
    prisma.adminUser.findUnique.mockResolvedValue(admin({ aktif: false }));

    await expect(
      service.login({ email: 'admin@toko.local', password: SANDI }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('memberi pesan seragam untuk email tak terdaftar, sandi salah, dan akun nonaktif', async () => {
    // Membedakannya akan membocorkan email mana yang punya akun di sini.
    const pesan: string[] = [];

    prisma.adminUser.findUnique.mockResolvedValue(null);
    pesan.push(await service.login({ email: 'x@y.z', password: SANDI }).catch((e) => e.message));

    prisma.adminUser.findUnique.mockResolvedValue(admin());
    pesan.push(
      await service.login({ email: 'admin@toko.local', password: 'salah' }).catch((e) => e.message),
    );

    prisma.adminUser.findUnique.mockResolvedValue(admin({ aktif: false }));
    pesan.push(
      await service.login({ email: 'admin@toko.local', password: SANDI }).catch((e) => e.message),
    );

    expect(new Set(pesan).size).toBe(1);
    expect(pesan[0]).toBe('Email atau password salah');
  });

  it('mencatat waktu login terakhir', async () => {
    prisma.adminUser.findUnique.mockResolvedValue(admin());

    await service.login({ email: 'admin@toko.local', password: SANDI });

    expect(prisma.adminUser.update).toHaveBeenCalledWith({
      where: { id: 'admin-1' },
      data: { lastLoginAt: expect.any(Date) },
    });
  });

  it('tidak menyentuh catatan login saat kredensialnya salah', async () => {
    prisma.adminUser.findUnique.mockResolvedValue(admin());

    await service.login({ email: 'admin@toko.local', password: 'salah' }).catch(() => undefined);

    expect(prisma.adminUser.update).not.toHaveBeenCalled();
  });
});

describe('AuthService.profil', () => {
  let prisma: PrismaPalsu;
  let service: AuthService;

  beforeEach(() => {
    prisma = buatPrismaPalsu();
    service = new AuthService(
      prisma as unknown as PrismaService,
      { signAsync: vi.fn() } as unknown as JwtService,
      buatConfigPalsu() as unknown as ConfigService,
    );
  });

  it('mengembalikan profil admin aktif', async () => {
    prisma.adminUser.findUnique.mockResolvedValue(admin());

    await expect(service.profil('admin-1')).resolves.toEqual({
      id: 'admin-1',
      email: 'admin@toko.local',
      nama: 'Admin Toko',
      role: 'ADMIN',
    });
  });

  it('menolak sesi milik akun yang sudah dinonaktifkan', async () => {
    // Token yang sudah terlanjur terbit harus berhenti berlaku begitu akunnya
    // dimatikan, tanpa menunggu masa berlakunya habis.
    prisma.adminUser.findUnique.mockResolvedValue(admin({ aktif: false }));

    await expect(service.profil('admin-1')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('menolak sesi milik akun yang sudah dihapus', async () => {
    prisma.adminUser.findUnique.mockResolvedValue(null);

    await expect(service.profil('admin-1')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
