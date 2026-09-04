import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AdminRole } from '../generated/prisma/enums.ts';
import type { RequestWithAdmin } from './jwt-auth.guard';

export const ROLES_KEY = 'roles';

/**
 * Membatasi endpoint ke role tertentu.
 * RBAC minimal sesuai research/tech/04-authentication-security.md:
 * ADMIN (akses penuh) dan STAFF (tidak boleh ubah harga / hapus produk).
 */
export const Roles = (...roles: AdminRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AdminRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const req = context.switchToHttp().getRequest<RequestWithAdmin>();
    if (!req.admin || !required.includes(req.admin.role)) {
      throw new ForbiddenException('Role Anda tidak punya akses ke aksi ini');
    }
    return true;
  }
}
