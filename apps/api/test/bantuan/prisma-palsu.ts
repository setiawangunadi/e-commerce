import { vi, type Mock } from 'vitest';
import type { PrismaService } from '../../src/prisma/prisma.service';

/**
 * PrismaService tiruan untuk unit test.
 *
 * Dibuat lewat Proxy supaya setiap `prisma.<model>.<metode>` otomatis menjadi
 * `vi.fn()` saat pertama kali disentuh. Alternatifnya adalah mendaftarkan
 * ratusan metode per model secara manual, dan daftar itu akan basi setiap kali
 * skema Prisma bertambah.
 *
 * `$transaction` menjalankan callback dengan objek yang SAMA, jadi ekspektasi
 * pada `prisma.order.update` tetap tertangkap walaupun kode aslinya memanggil
 * `tx.order.update` di dalam transaksi.
 */
export type PrismaPalsu = PrismaService & {
  [model: string]: Record<string, Mock>;
};

export function buatPrismaPalsu(): PrismaPalsu {
  const model = new Map<string, Record<string, Mock>>();

  const target: Record<string, unknown> = {};

  const proxy: PrismaPalsu = new Proxy(target, {
    get(_t, prop: string | symbol) {
      if (typeof prop !== 'string') return undefined;

      if (prop === '$transaction') {
        return transaksi;
      }
      if (prop === '$queryRaw' || prop === '$executeRaw' || prop === '$connect' || prop === '$disconnect') {
        if (!(prop in target)) target[prop] = vi.fn().mockResolvedValue(undefined);
        return target[prop];
      }
      // Vitest & util inspeksi menyentuh properti aneh saat mencetak objek;
      // mengembalikan mock untuk itu membuat pesan kegagalan tidak terbaca.
      if (prop.startsWith('$$') || prop === 'then' || prop === 'constructor') return undefined;

      if (!model.has(prop)) model.set(prop, metodeModel());
      return model.get(prop);
    },
  }) as PrismaPalsu;

  const transaksi = vi.fn(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: unknown) => unknown)(proxy);
    }
    // Bentuk array: Prisma menjalankan seluruh promise lalu mengembalikan hasilnya.
    return Promise.all(arg as Promise<unknown>[]);
  });

  return proxy;
}

/** Metode Prisma yang dipakai di kode ini. Semuanya default `null`/`[]` yang aman. */
function metodeModel(): Record<string, Mock> {
  return {
    findUnique: vi.fn().mockResolvedValue(null),
    findUniqueOrThrow: vi.fn().mockResolvedValue(null),
    findFirst: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
    createMany: vi.fn().mockResolvedValue({ count: 0 }),
    update: vi.fn().mockResolvedValue({}),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    upsert: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    count: vi.fn().mockResolvedValue(0),
    aggregate: vi.fn().mockResolvedValue({ _sum: {}, _count: { _all: 0 } }),
    groupBy: vi.fn().mockResolvedValue([]),
  };
}

/** ConfigService tiruan: membaca dari objek biasa, dengan dukungan nilai bawaan. */
export function buatConfigPalsu(nilai: Record<string, string | number> = {}) {
  return {
    get: vi.fn(<T>(kunci: string, bawaan?: T): T | undefined => {
      const ada = nilai[kunci];
      return (ada === undefined ? bawaan : ada) as T | undefined;
    }),
  };
}

/**
 * Galat unik Prisma (P2002). Dipakai untuk menguji jalur "sudah pernah terjadi"
 * pada operasi yang idempoten, mis. pengkreditan poin dari satu pesanan.
 */
export function galatUnik(): Error & { code: string } {
  const e = new Error('Unique constraint failed') as Error & { code: string };
  e.code = 'P2002';
  return e;
}
