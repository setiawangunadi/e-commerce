import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

/**
 * Unit test API dijalankan lewat Vitest, bukan Jest bawaan Nest.
 *
 * Transformasinya memakai SWC karena kode ini bergantung pada dekorator dan
 * `emitDecoratorMetadata` (class-validator, Nest DI) — esbuild bawaan Vite
 * tidak memancarkan metadata itu, dan validasi DTO akan diam-diam melewatkan
 * konversi tipe implisit kalau metadatanya hilang.
 */
export default defineConfig({
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        target: 'es2023',
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
  test: {
    environment: 'node',
    globals: true,
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      // Kode hasil generate Prisma dan berkas rakitan Nest tidak diuji:
      // yang pertama bukan tulisan kita, yang kedua tidak punya cabang logika.
      exclude: [
        'src/generated/**',
        'src/**/*.module.ts',
        'src/**/dto/**',
        'src/main.ts',
        'src/prisma/prisma.service.ts',
      ],
    },
  },
});
