// Dekorator Nest & class-validator membaca metadata lewat Reflect.
import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { beforeAll, vi } from 'vitest';

/**
 * Service di proyek ini banyak menulis log operasional (pesanan lunas, stok
 * dikembalikan, voucher dibuat). Itu berguna di production tapi hanya membuat
 * keluaran test ramai, sampai kegagalan yang sebenarnya sulit terlihat.
 */
beforeAll(() => {
  vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
  vi.spyOn(Logger.prototype, 'verbose').mockImplementation(() => undefined);
});
