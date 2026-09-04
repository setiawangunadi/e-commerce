import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const src = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': src,
      // `server-only` sengaja melempar galat saat di-import di luar Server
      // Component. Di test itu bukan kesalahan — yang diuji adalah fungsi
      // murni di dalam modulnya, bukan tempat modulnya dipakai.
      'server-only': fileURLToPath(new URL('./test/bantuan/kosong.ts', import.meta.url)),
    },
  },
  test: {
    // jsdom dipakai seluruhnya: helper tracking menyentuh window,
    // localStorage, dan sessionStorage, sedangkan sisanya fungsi murni yang
    // berjalan sama saja di lingkungan mana pun.
    environment: 'jsdom',
    globals: true,
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/lib/**/*.ts', 'src/proxy.ts'],
    },
  },
});
