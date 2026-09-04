import { Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { AUD_ADMIN } from '../customer/customer.types';
import type { AdminJwtPayload, AdminProfile } from './auth.types';
import type { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService implements OnModuleInit {
  /**
   * Hash dari string acak. Diverifikasi saat email tidak ditemukan agar waktu
   * respons login sama saja — mencegah kebocoran email terdaftar lewat timing.
   */
  private dummyHash!: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.dummyHash = await AuthService.hashPassword(randomBytes(32).toString('hex'));
  }

  async login(dto: LoginDto): Promise<{ accessToken: string; expiresIn: string; user: AdminProfile }> {
    const admin = await this.prisma.adminUser.findUnique({ where: { email: dto.email } });

    // Pesan error sengaja dibuat sama untuk email tidak ada / password salah,
    // agar tidak membocorkan email mana yang terdaftar (user enumeration).
    const kredensialSalah = new UnauthorizedException('Email atau password salah');
    if (!admin || !admin.aktif) {
      await argon2.verify(this.dummyHash, dto.password).catch(() => false);
      throw kredensialSalah;
    }

    const cocok = await argon2.verify(admin.passwordHash, dto.password).catch(() => false);
    if (!cocok) throw kredensialSalah;

    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    // `aud` memisahkan token admin dari token pelanggan yang ditandatangani
    // rahasia yang sama — tanpa itu, token pelanggan lolos JwtAuthGuard.
    const payload: AdminJwtPayload = {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      aud: AUD_ADMIN,
    };
    const expiresIn = this.config.get<string>('JWT_EXPIRES_IN', '8h');

    return {
      accessToken: await this.jwt.signAsync(payload),
      expiresIn,
      user: { id: admin.id, email: admin.email, nama: admin.nama, role: admin.role },
    };
  }

  async profil(adminId: string): Promise<AdminProfile> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
      select: { id: true, email: true, nama: true, role: true, aktif: true },
    });
    if (!admin || !admin.aktif) throw new UnauthorizedException('Sesi tidak valid');
    return { id: admin.id, email: admin.email, nama: admin.nama, role: admin.role };
  }

  static hashPassword(password: string): Promise<string> {
    return argon2.hash(password, { type: argon2.argon2id });
  }
}
