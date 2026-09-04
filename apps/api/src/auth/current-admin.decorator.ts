import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AdminJwtPayload } from './auth.types';
import type { RequestWithAdmin } from './jwt-auth.guard';

/** Mengambil payload JWT admin yang sudah divalidasi JwtAuthGuard. */
export const CurrentAdmin = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AdminJwtPayload => {
    const req = context.switchToHttp().getRequest<RequestWithAdmin>();
    return req.admin!;
  },
);
