import {
  BadRequestException,
  ConflictException,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { AUD_PELANGGAN, type CustomerJwtPayload, type CustomerProfile } from './customer.types';
import type { DaftarDto, MasukDto, UbahProfilDto, UbahSandiDto } from './dto/customer-auth.dto';

/** Sesi pelanggan berumur panjang — belanja tidak seharusnya terputus login. */
const MASA_BERLAKU = '30d';

@Injectable()
export class CustomerAuthService implements OnModuleInit {
  /**
   * Hash dari string acak, diverifikasi saat email tidak terdaftar agar waktu
   * respons sama saja. Tanpa ini, selisih waktu balasan membocorkan email mana
   * yang punya akun di toko ini.
   */
  private dummyHash!: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.dummyHash = await argon2.hash(randomBytes(32).toString('hex'), { type: argon2.argon2id });
  }

  async daftar(dto: DaftarDto) {
    const email = dto.email.trim().toLowerCase();

    const sudahAda = await this.prisma.customer.findUnique({
      where: { email },
      select: { id: true },
    });
    if (sudahAda) {
      throw new ConflictException('Email ini sudah terdaftar. Silakan masuk.');
    }

    const pelanggan = await this.prisma.customer.create({
      data: {
        email,
        nama: dto.nama.trim(),
        telepon: dto.telepon?.trim() || null,
        passwordHash: await argon2.hash(dto.password, { type: argon2.argon2id }),
      },
    });

    // Pesanan tamu dengan email yang sama langsung ditarik ke akun baru, supaya
    // pembeli yang sudah pernah belanja tidak menemukan riwayatnya kosong.
    const diklaim = await this.klaimPesananTamu(pelanggan.id, email);

    return {
      ...(await this.terbitkanToken(pelanggan.id, email)),
      user: this.keProfil(pelanggan),
      pesananDiklaim: diklaim,
    };
  }

  async masuk(dto: MasukDto) {
    const email = dto.email.trim().toLowerCase();
    const pelanggan = await this.prisma.customer.findUnique({ where: { email } });

    // Pesan sengaja seragam untuk email tidak ada / sandi salah / akun nonaktif.
    const salah = new UnauthorizedException('Email atau kata sandi salah');
    if (!pelanggan || !pelanggan.aktif) {
      await argon2.verify(this.dummyHash, dto.password).catch(() => false);
      throw salah;
    }

    const cocok = await argon2.verify(pelanggan.passwordHash, dto.password).catch(() => false);
    if (!cocok) throw salah;

    await this.prisma.customer.update({
      where: { id: pelanggan.id },
      data: { lastLoginAt: new Date() },
    });

    const diklaim = await this.klaimPesananTamu(pelanggan.id, email);

    return {
      ...(await this.terbitkanToken(pelanggan.id, email)),
      user: this.keProfil(pelanggan),
      pesananDiklaim: diklaim,
    };
  }

  async profil(customerId: string): Promise<CustomerProfile> {
    const pelanggan = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!pelanggan || !pelanggan.aktif) throw new UnauthorizedException('Sesi tidak valid');
    return this.keProfil(pelanggan);
  }

  async ubahProfil(customerId: string, dto: UbahProfilDto): Promise<CustomerProfile> {
    const pelanggan = await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        ...(dto.nama !== undefined ? { nama: dto.nama.trim() } : {}),
        ...(dto.telepon !== undefined ? { telepon: dto.telepon?.trim() || null } : {}),
      },
    });
    return this.keProfil(pelanggan);
  }

  /**
   * Ganti kata sandi. Sandi lama tetap diminta walau sesi sudah terverifikasi —
   * itu yang menghalangi orang yang menemukan perangkat tak terkunci untuk
   * mengunci pemiliknya keluar dari akunnya sendiri.
   */
  async ubahSandi(customerId: string, dto: UbahSandiDto): Promise<{ ok: true }> {
    const pelanggan = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { passwordHash: true },
    });
    if (!pelanggan) throw new UnauthorizedException('Sesi tidak valid');

    const cocok = await argon2.verify(pelanggan.passwordHash, dto.sandiLama).catch(() => false);
    if (!cocok) throw new BadRequestException('Kata sandi lama salah');

    await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        passwordHash: await argon2.hash(dto.sandiBaru, { type: argon2.argon2id }),
      },
    });

    return { ok: true };
  }

  // --- Pembantu -------------------------------------------------------------

  /**
   * Menautkan pesanan tamu ke akun berdasarkan email.
   *
   * Hanya menyentuh pesanan yang belum punya pemilik, jadi memakai email orang
   * lain tidak bisa merebut pesanan yang sudah tertaut ke akun lain. Poin dari
   * pesanan lama sengaja tidak diberikan surut — pesanan itu selesai sebelum
   * akunnya ada, dan mengkreditkannya membuka celah pemberian poin berulang
   * lewat daftar-hapus-daftar.
   */
  private async klaimPesananTamu(customerId: string, email: string): Promise<number> {
    const hasil = await this.prisma.order.updateMany({
      where: { customerId: null, emailPembeli: { equals: email, mode: 'insensitive' } },
      data: { customerId },
    });
    return hasil.count;
  }

  private async terbitkanToken(id: string, email: string) {
    const payload: CustomerJwtPayload = { sub: id, email, aud: AUD_PELANGGAN };
    return {
      accessToken: await this.jwt.signAsync(payload, { expiresIn: MASA_BERLAKU }),
      expiresIn: this.config.get<string>('CUSTOMER_JWT_EXPIRES_IN', MASA_BERLAKU),
    };
  }

  private keProfil(p: {
    id: string;
    email: string;
    nama: string;
    telepon: string | null;
    tier: string;
    poin: number;
    createdAt: Date;
  }): CustomerProfile {
    return {
      id: p.id,
      email: p.email,
      nama: p.nama,
      telepon: p.telepon,
      tier: p.tier,
      poin: p.poin,
      createdAt: p.createdAt,
    };
  }
}
