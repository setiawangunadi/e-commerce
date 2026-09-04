import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { CustomerJwtPayload } from './customer.types';
import type { RequestWithCustomer } from './customer-jwt.guard';

/** Payload pelanggan yang sudah divalidasi CustomerJwtGuard. */
export const CurrentCustomer = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CustomerJwtPayload => {
    const req = context.switchToHttp().getRequest<RequestWithCustomer>();
    return req.pelanggan!;
  },
);

/** Sama, tapi boleh kosong — dipakai bersama CustomerOpsionalGuard. */
export const CustomerOpsional = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CustomerJwtPayload | null => {
    const req = context.switchToHttp().getRequest<RequestWithCustomer>();
    return req.pelanggan ?? null;
  },
);
