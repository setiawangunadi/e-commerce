import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { FastifyRequest } from 'fastify';
import { AUD_ADMIN } from '../customer/customer.types';
import type { AdminJwtPayload } from './auth.types';

export interface RequestWithAdmin extends FastifyRequest {
  admin?: AdminJwtPayload;
}

/** Memvalidasi header `Authorization: Bearer <token>` dan menempelkan payload ke request. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithAdmin>();
    const header = req.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token tidak ditemukan');
    }

    try {
      req.admin = await this.jwt.verifyAsync<AdminJwtPayload>(header.slice(7), {
        audience: AUD_ADMIN,
      });
      return true;
    } catch {
      throw new UnauthorizedException('Token tidak valid atau sudah kedaluwarsa');
    }
  }
}
