import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from './prisma/prisma.service';

/**
 * Dua endpoint dengan tujuan berbeda, jangan digabung:
 *
 * - `/health/live` menjawab "proses ini masih hidup". Dipakai orchestrator
 *   untuk memutuskan restart. Sengaja TIDAK menyentuh database — kalau tidak,
 *   database yang sedang lambat akan memicu restart beruntun yang justru
 *   memperparah keadaan.
 * - `/health/ready` menjawab "siap menerima trafik". Ini yang menyentuh
 *   database, dan load balancer memakainya untuk mengeluarkan instance dari
 *   rotasi tanpa membunuhnya.
 *
 * Keduanya dikecualikan dari pembatasan laju: health check berjalan sangat
 * sering dan tidak boleh ikut menghabiskan kuota IP load balancer.
 */
@SkipThrottle()
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Kompatibilitas: pemakai lama memanggil /api/v1/health tanpa sufiks. */
  @Get()
  cek() {
    return this.siap();
  }

  @Get('live')
  hidup() {
    return { status: 'ok', waktu: new Date().toISOString() };
  }

  @Get('ready')
  async siap() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      // Pesannya sengaja tanpa detail koneksi — endpoint ini terbuka.
      throw new ServiceUnavailableException('Database tidak bisa dihubungi');
    }

    return { status: 'ok', database: 'terhubung', waktu: new Date().toISOString() };
  }
}
