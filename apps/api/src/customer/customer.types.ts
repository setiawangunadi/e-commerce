/**
 * Audience JWT. Token admin dan token pelanggan ditandatangani dengan rahasia
 * yang sama, jadi tanpa pemisahan ini token pelanggan akan lolos JwtAuthGuard
 * dan bisa membuka endpoint /admin yang tidak menuntut peran tertentu.
 */
export const AUD_ADMIN = 'admin';
export const AUD_PELANGGAN = 'pelanggan';

/** Payload JWT pelanggan. `sub` = id Customer. */
export interface CustomerJwtPayload {
  sub: string;
  email: string;
  aud: typeof AUD_PELANGGAN;
}

/** Bentuk pelanggan yang aman dikirim ke browser (tanpa passwordHash). */
export interface CustomerProfile {
  id: string;
  email: string;
  nama: string;
  telepon: string | null;
  tier: string;
  poin: number;
  createdAt: Date;
}
