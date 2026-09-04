import type { AdminRole } from '../generated/prisma/enums.ts';
import type { AUD_ADMIN } from '../customer/customer.types';

/** Payload JWT admin. `sub` = id AdminUser. */
export interface AdminJwtPayload {
  sub: string;
  email: string;
  role: AdminRole;
  aud: typeof AUD_ADMIN;
}

/** Bentuk user yang aman dikirim ke client (tanpa passwordHash). */
export interface AdminProfile {
  id: string;
  email: string;
  nama: string;
  role: AdminRole;
}
