import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard, type RequestWithAdmin } from '../../src/auth/jwt-auth.guard';
import { ROLES_KEY, RolesGuard } from '../../src/auth/roles.guard';
import {
  CustomerJwtGuard,
  CustomerOpsionalGuard,
  type RequestWithCustomer,
} from '../../src/customer/customer-jwt.guard';
import { AUD_ADMIN, AUD_PELANGGAN } from '../../src/customer/customer.types';
import { buatKonteks } from '../bantuan/konteks';
import type { JwtService } from '@nestjs/jwt';

function permintaan(authorization?: string) {
  return { headers: authorization ? { authorization } : {} } as RequestWithAdmin &
    RequestWithCustomer;
}

describe('JwtAuthGuard', () => {
  let jwt: { verifyAsync: ReturnType<typeof vi.fn> };
  let guard: JwtAuthGuard;

  beforeEach(() => {
    jwt = { verifyAsync: vi.fn().mockResolvedValue({ sub: 'admin-1', role: 'ADMIN' }) };
    guard = new JwtAuthGuard(jwt as unknown as JwtService);
  });

  it('menolak request tanpa header Authorization', async () => {
    await expect(guard.canActivate(buatKonteks(permintaan()))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('menolak skema selain Bearer', async () => {
    for (const header of ['Basic abc', 'bearer abc', 'Token abc']) {
      await expect(guard.canActivate(buatKonteks(permintaan(header)))).rejects.toThrow(
        /token tidak ditemukan/i,
      );
    }
  });

  it('menolak token yang tidak valid atau kedaluwarsa', async () => {
    jwt.verifyAsync.mockRejectedValue(new Error('jwt expired'));

    await expect(guard.canActivate(buatKonteks(permintaan('Bearer basi')))).rejects.toThrow(
      /kedaluwarsa/i,
    );
  });

  it('MEMERIKSA audience admin — token pelanggan tidak boleh lolos ke endpoint admin', async () => {
    // Token admin dan pelanggan ditandatangani rahasia yang sama; tanpa
    // pemisahan audience, token pelanggan akan membuka panel admin.
    await guard.canActivate(buatKonteks(permintaan('Bearer token-admin')));

    expect(jwt.verifyAsync).toHaveBeenCalledWith('token-admin', { audience: AUD_ADMIN });
  });

  it('menempelkan payload admin ke request supaya guard peran bisa membacanya', async () => {
    const req = permintaan('Bearer token-admin');

    await guard.canActivate(buatKonteks(req));

    expect(req.admin).toEqual({ sub: 'admin-1', role: 'ADMIN' });
  });
});

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function siapkanPeran(peran: string[] | undefined) {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(peran);
  }

  it('membiarkan lewat endpoint yang tidak menuntut peran tertentu', () => {
    siapkanPeran(undefined);

    expect(guard.canActivate(buatKonteks(permintaan()))).toBe(true);
  });

  it('membiarkan lewat bila daftar perannya kosong', () => {
    siapkanPeran([]);

    expect(guard.canActivate(buatKonteks(permintaan()))).toBe(true);
  });

  it('mengizinkan admin dengan peran yang cocok', () => {
    siapkanPeran(['ADMIN']);
    const req = { ...permintaan(), admin: { role: 'ADMIN' } };

    expect(guard.canActivate(buatKonteks(req))).toBe(true);
  });

  it('menolak STAFF pada aksi yang khusus ADMIN, mis. hapus produk permanen', () => {
    siapkanPeran(['ADMIN']);
    const req = { ...permintaan(), admin: { role: 'STAFF' } };

    expect(() => guard.canActivate(buatKonteks(req))).toThrow(ForbiddenException);
  });

  it('menolak request yang belum melewati JwtAuthGuard', () => {
    siapkanPeran(['ADMIN']);

    expect(() => guard.canActivate(buatKonteks(permintaan()))).toThrow(ForbiddenException);
  });

  it('membaca metadata peran dari handler maupun kelas controller', () => {
    const mata = vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    const req = { ...permintaan(), admin: { role: 'ADMIN' } };

    guard.canActivate(buatKonteks(req));

    expect(mata).toHaveBeenCalledWith(ROLES_KEY, [expect.anything(), expect.anything()]);
  });
});

describe('CustomerJwtGuard', () => {
  let jwt: { verifyAsync: ReturnType<typeof vi.fn> };
  let guard: CustomerJwtGuard;

  beforeEach(() => {
    jwt = { verifyAsync: vi.fn().mockResolvedValue({ sub: 'pelanggan-1' }) };
    guard = new CustomerJwtGuard(jwt as unknown as JwtService);
  });

  it('meminta pembeli masuk dulu bila tidak ada token', async () => {
    await expect(guard.canActivate(buatKonteks(permintaan()))).rejects.toThrow(/masuk dulu/i);
  });

  it('memeriksa audience pelanggan — token admin tidak dipakai sebagai identitas pembeli', async () => {
    await guard.canActivate(buatKonteks(permintaan('Bearer token-pelanggan')));

    expect(jwt.verifyAsync).toHaveBeenCalledWith('token-pelanggan', { audience: AUD_PELANGGAN });
  });

  it('memberi pesan yang bisa ditindaklanjuti saat sesi berakhir', async () => {
    jwt.verifyAsync.mockRejectedValue(new Error('jwt expired'));

    await expect(guard.canActivate(buatKonteks(permintaan('Bearer basi')))).rejects.toThrow(
      /masuk kembali/i,
    );
  });

  it('menempelkan payload pelanggan ke request', async () => {
    const req = permintaan('Bearer token-pelanggan');

    await guard.canActivate(buatKonteks(req));

    expect(req.pelanggan).toEqual({ sub: 'pelanggan-1' });
  });
});

describe('CustomerOpsionalGuard', () => {
  let jwt: { verifyAsync: ReturnType<typeof vi.fn> };
  let guard: CustomerOpsionalGuard;

  beforeEach(() => {
    jwt = { verifyAsync: vi.fn().mockResolvedValue({ sub: 'pelanggan-1' }) };
    guard = new CustomerOpsionalGuard(jwt as unknown as JwtService);
  });

  it('membiarkan tamu lewat tanpa token', async () => {
    const req = permintaan();

    expect(await guard.canActivate(buatKonteks(req))).toBe(true);
    expect(req.pelanggan).toBeUndefined();
  });

  it('mengenali pelanggan yang sedang masuk', async () => {
    const req = permintaan('Bearer token-pelanggan');

    expect(await guard.canActivate(buatKonteks(req))).toBe(true);
    expect(req.pelanggan).toEqual({ sub: 'pelanggan-1' });
  });

  it('memperlakukan token rusak sama seperti tanpa token — checkout tetap bisa selesai', async () => {
    // Kegagalan token tidak boleh menghalangi orang menyelesaikan belanjanya.
    jwt.verifyAsync.mockRejectedValue(new Error('jwt malformed'));
    const req = permintaan('Bearer rusak');

    expect(await guard.canActivate(buatKonteks(req))).toBe(true);
    expect(req.pelanggan).toBeUndefined();
  });
});
