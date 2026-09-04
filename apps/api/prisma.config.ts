import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Prisma 7 memindahkan konfigurasi koneksi dari schema.prisma ke file ini.
// PrismaClient sendiri terhubung lewat driver adapter — lihat src/prisma/prisma.service.ts
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
    /**
     * Database sementara yang dipakai Prisma untuk memutar ulang migrasi —
     * dibutuhkan `migrate dev` dan `migrate diff --from-migrations`.
     *
     * PERHATIAN: isinya DIHAPUS setiap kali dipakai. Karena itu nilainya harus
     * menunjuk database terpisah; menunjuknya ke DATABASE_URL akan menghapus
     * seluruh data development. Dibiarkan undefined bila variabelnya tidak
     * diisi, sehingga Prisma memakai perilaku bawaannya (membuat dan membuang
     * database sementara sendiri) alih-alih diam-diam memakai database utama.
     */
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
});
