import 'reflect-metadata';
import fastifyHelmet from '@fastify/helmet';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/http-exception.filter';
import { ResponseInterceptor } from './common/response.interceptor';

async function bootstrap(): Promise<void> {
  // Konfigurasi env dibaca sekali di sini hanya untuk hal-hal yang dibutuhkan
  // sebelum container Nest siap; sisanya lewat ConfigService.
  const produksi = process.env.NODE_ENV === 'production';

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      bodyLimit: 6 * 1024 * 1024,
      // Di belakang load balancer, IP asli pembeli ada di X-Forwarded-For.
      // Tanpa ini, pembatasan laju melihat semua orang sebagai satu IP proxy.
      trustProxy: Number(process.env.TRUST_PROXY ?? 1),
    }),
    { logger: produksi ? ['error', 'warn', 'log'] : ['error', 'warn', 'log', 'debug', 'verbose'] },
  );

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 4000);
  const webOrigin = config.get<string>('WEB_ORIGIN', 'http://localhost:3000');

  // Versioning /api/v1/... sejak awal — lihat research/tech/02-backend-api.md
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  /**
   * Header keamanan.
   *
   * CSP dimatikan karena API ini tidak pernah menyajikan HTML — satu-satunya
   * yang dilayaninya selain JSON adalah berkas gambar. CSP untuk halaman ada
   * di sisi Next.js, tempat ia benar-benar berpengaruh.
   *
   * `crossOriginResourcePolicy: cross-origin` diperlukan supaya gambar produk
   * di /uploads bisa dimuat oleh frontend yang berbeda origin.
   */
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: produksi ? { maxAge: 31_536_000, includeSubDomains: true } : false,
  });

  app.enableCors({
    origin: webOrigin.split(',').map((o) => o.trim()),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // buang field yang tidak ada di DTO
      forbidNonWhitelisted: true, // tolak request yang mengirim field asing
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      // Pesan validasi berbahasa Indonesia memang ditujukan ke pengguna, jadi
      // tetap ditampilkan; yang tidak pernah keluar adalah galat tak terduga
      // (lihat AllExceptionsFilter).
      disableErrorMessages: false,
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.register(fastifyMultipart, {
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  });

  // Melayani gambar produk yang di-upload saat development.
  const uploadDir = resolve(process.cwd(), config.get<string>('UPLOAD_DIR', './uploads'));
  await mkdir(uploadDir, { recursive: true });
  await app.register(fastifyStatic, { root: uploadDir, prefix: '/uploads/' });

  /**
   * Menutup koneksi database dan menyelesaikan request yang sedang berjalan
   * saat menerima SIGTERM. Tanpa ini, deploy ulang bisa memutus pembeli di
   * tengah checkout dan meninggalkan transaksi setengah jadi.
   */
  app.enableShutdownHooks();

  await app.listen({ port, host: '0.0.0.0' });
  new Logger('Bootstrap').log(`API berjalan di http://localhost:${port}/api/v1`);
}

void bootstrap();
