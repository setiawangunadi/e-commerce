import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { FastifyRequest } from 'fastify';
import { AUD_PELANGGAN, type CustomerJwtPayload } from './customer.types';

export interface RequestWithCustomer extends FastifyRequest {
  pelanggan?: CustomerJwtPayload;
}

/** Memvalidasi `Authorization: Bearer <token>` milik pelanggan. */
@Injectable()
export class CustomerJwtGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithCustomer>();
    const header = req.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Silakan masuk dulu');
    }

    try {
      req.pelanggan = await this.jwt.verifyAsync<CustomerJwtPayload>(header.slice(7), {
        audience: AUD_PELANGGAN,
      });
      return true;
    } catch {
      throw new UnauthorizedException('Sesi Anda sudah berakhir. Silakan masuk kembali.');
    }
  }
}

/**
 * Varian longgar untuk endpoint yang melayani tamu maupun pelanggan, mis.
 * checkout. Token yang tidak valid diperlakukan sama seperti tanpa token —
 * pembeli tetap bisa menyelesaikan belanjanya sebagai tamu.
 */
@Injectable()
export class CustomerOpsionalGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithCustomer>();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return true;

    try {
      req.pelanggan = await this.jwt.verifyAsync<CustomerJwtPayload>(header.slice(7), {
        audience: AUD_PELANGGAN,
      });
    } catch {
      // Diabaikan dengan sengaja — lihat komentar kelas.
    }
    return true;
  }
}
