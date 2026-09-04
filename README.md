# E-Commerce Single-Store

Toko online satu brand untuk pasar Indonesia — implementasi dari riset di
[`research/`](research/00-overview.md).

Katalog, keranjang, checkout dengan ongkir, dan pembayaran Midtrans; akun pembeli
dengan program poin & tier; voucher; panel admin lengkap dengan pembuat landing
page iklan; serta pembelian alternatif lewat Shopee dan TikTok Shop.

## 📚 Dokumentasi

**Dokumentasi lengkap ada di [`docs/`](docs/README.md).** Mulai dari sana kalau
baru menerima proyek ini.

| | |
|---|---|
| [Setup lokal](docs/02-setup-lokal.md) | dari nol sampai toko terbuka di browser |
| [Arsitektur](docs/01-arsitektur.md) | peta besar: apa berbicara dengan apa |
| [Model data](docs/03-model-data.md) | tabel, relasi, dan arti kolomnya |
| [Referensi API](docs/04-api-reference.md) | seluruh endpoint |
| [**Alur bisnis**](docs/05-alur-bisnis.md) | pesanan, pembayaran, voucher, poin — **paling penting** |
| [Frontend](docs/06-frontend.md) | struktur Next.js, Server Action, caching |
| [Testing](docs/07-testing.md) | menjalankan & menulis test |
| [Deploy produksi](docs/08-deploy-produksi.md) | termasuk checklist rilis |
| [Runbook operasional](docs/09-runbook.md) | apa yang dilakukan saat ada yang rusak |
| [Keputusan teknis](docs/10-keputusan-teknis.md) | kenapa sesuatu dibuat begitu |

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 |
| Backend | NestJS 11 + Fastify + TypeScript |
| Database | PostgreSQL 17 + Prisma 7 |
| Auth | JWT (argon2id) di cookie httpOnly + RBAC |
| Pembayaran | Midtrans Snap (QRIS, VA, e-wallet, kartu) |
| Ongkir | Biteship, dengan tarif perkiraan bawaan sebagai cadangan |
| Test | Vitest — 760 unit test |

Pilihan ini beserta alasannya ada di
[`research/tech/00-overview.md`](research/tech/00-overview.md) dan
[`docs/10-keputusan-teknis.md`](docs/10-keputusan-teknis.md).

## Menjalankan

Prasyarat: Node.js 20.9+, Docker, npm.

```bash
npm install
cp apps/api/.env.example apps/api/.env && cp apps/web/.env.example apps/web/.env.local
```

Isi `JWT_SECRET` di `apps/api/.env` dengan nilai acak:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

```bash
npm run db:up && npm run db:migrate && npm run db:seed
```

Lalu jalankan keduanya di terminal terpisah:

```bash
npm run dev:api
```

```bash
npm run dev:web
```

Toko terbuka di http://localhost:3000, panel admin di http://localhost:3000/admin.

Akun dari seed:

| Email | Password | Peran |
|---|---|---|
| `admin@toko.local` | `admin12345` | ADMIN — akses penuh |
| `staff@toko.local` | `staff12345` | STAFF — tidak bisa menghapus permanen |

Langkah lengkap, termasuk mengaktifkan Midtrans dan Biteship, ada di
[`docs/02-setup-lokal.md`](docs/02-setup-lokal.md).

## Struktur

```
apps/
├── api/                    NestJS — REST API /api/v1
│   ├── prisma/             skema, migrasi, seed
│   ├── src/
│   │   ├── order/          pesanan & aturan status   ← logika uang inti
│   │   ├── payment/        Midtrans: webhook, sinkronisasi, cron
│   │   ├── voucher/        potongan voucher & label promosi
│   │   ├── customer/       akun pembeli, alamat, poin & tier
│   │   ├── cart/           keranjang tamu berbasis token
│   │   ├── shipping/       ongkir (Biteship + tarif lokal)
│   │   ├── catalog/        endpoint publik
│   │   ├── landing/        landing page iklan + skema blok
│   │   ├── admin/          CRUD katalog, dashboard, upload
│   │   ├── auth/           login admin, JWT, RBAC
│   │   ├── config/         validasi environment saat boot
│   │   └── common/         envelope response, filter galat
│   └── test/               675 unit test
└── web/                    Next.js — etalase + panel admin
    ├── src/
    │   ├── app/(toko)/     halaman publik
    │   ├── app/admin/      panel admin
    │   ├── app/lp/         landing page kampanye
    │   ├── components/
    │   └── lib/
    └── test/               85 unit test

docs/                       dokumentasi handover
research/                   riset bisnis & teknis (14 + 14 dokumen)
```

## Perintah

```bash
npm test
```

```bash
npm run typecheck
```

```bash
npm run build
```

```bash
npm run test:coverage
```

```bash
npm run db:studio
```

```bash
npm run tunnel
```

`npm run tunnel` membuka URL publik sementara ke API lokal untuk menerima webhook
Midtrans saat development.

## Tiga aturan yang menjaga sistem ini

Kalau hanya sempat membaca satu bagian dokumentasi, baca
[alur bisnis](docs/05-alur-bisnis.md). Isinya bertumpu pada tiga aturan:

1. **Tidak ada nilai uang yang dipercaya dari browser.** Harga, ongkir, diskon
   voucher, dan potongan poin dihitung ulang di server saat pesanan dibuat.
   Client hanya mengirim kode.
2. **Stok berkurang saat pembayaran lunas, bukan saat pesanan dibuat** — dan
   hanya sekali, walau Midtrans mengirim notifikasi berulang.
3. **Status pesanan hanya boleh maju, dan pelunasan tidak bisa dilakukan admin.**
   Hanya notifikasi Midtrans yang boleh menandai pesanan sebagai lunas.

Ketiganya dijaga unit test. Kalau ada yang berubah, testnya gagal lebih dulu
sebelum uangnya yang salah.

## Naik ke produksi

Baca [`docs/08-deploy-produksi.md`](docs/08-deploy-produksi.md) — di dalamnya ada
checklist rilis dan daftar hal yang membuat API sengaja menolak menyala bila
konfigurasinya belum layak produksi.

Berkas yang sudah disiapkan:

- [`apps/api/Dockerfile`](apps/api/Dockerfile) dan [`apps/web/Dockerfile`](apps/web/Dockerfile)
- [`docker-compose.prod.yml`](docker-compose.prod.yml)
- [`apps/api/.env.production.example`](apps/api/.env.production.example) dan [`apps/web/.env.production.example`](apps/web/.env.production.example)
- [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — typecheck, test, build, dan pemeriksaan migrasi

## Yang belum dibangun

Sesuai urutan prioritas MVP di riset: cetak label pengiriman & order kurir
otomatis lewat Biteship, notifikasi WhatsApp/email ke pembeli, Meta Conversions
API, laporan performa kampanye per UTM, retur & refund, Redis + BullMQ untuk job
asinkron, Meilisearch untuk pencarian, serta test integrasi dan end-to-end.

Daftar lengkapnya di
[`docs/10-keputusan-teknis.md`](docs/10-keputusan-teknis.md#yang-belum-dibangun).
