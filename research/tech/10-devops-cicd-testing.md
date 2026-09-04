# 10. DevOps, CI/CD & Testing

## Ringkasan

Dokumen ini membahas alur pengembangan, otomasi deployment, dan strategi testing agar perubahan kode bisa dirilis dengan aman dan cepat — relevan untuk solo developer yang tetap butuh disiplin proses agar tidak membuat bug regresi saat fitur bertambah banyak sesuai peta 14+ domain bisnis di [research/business/00-overview.md](../business/00-overview.md).

## Version Control & Branching

- **Git** dengan **GitHub** sebagai remote repository (memudahkan integrasi CI/CD, dan portofolio jika suatu saat merekrut developer tambahan).
- Branching sederhana untuk solo developer: `main` (production-ready) + feature branch per fitur, merge via pull request meski solo (kebiasaan review diri sendiri lewat diff sebelum merge membantu menangkap kesalahan).
- **Conventional commits** (`feat:`, `fix:`, `chore:`) — memudahkan penyusunan changelog otomatis nantinya.

## CI/CD Pipeline

Rekomendasi: **GitHub Actions** (terintegrasi langsung dengan repository, gratis untuk kebutuhan skala kecil-menengah).

Pipeline dasar yang perlu ada sejak awal:
1. **Lint & type-check** — jalankan ESLint & TypeScript compiler check di setiap push/PR
2. **Run automated tests** — unit test & integration test (lihat bagian Testing di bawah)
3. **Build** — pastikan aplikasi berhasil di-build tanpa error sebelum deploy
4. **Deploy otomatis** — ke staging saat merge ke branch `develop`/`staging`, dan ke production saat merge ke `main` (dengan approval manual sebagai gerbang terakhir)

## Environment Strategy

Minimal tiga environment terpisah:
- **Local/development** — di komputer developer, memakai database & service lokal (Docker Compose untuk PostgreSQL, Redis, Meilisearch)
- **Staging** — replika production untuk testing fitur baru sebelum rilis, termasuk testing integrasi dengan **sandbox/testing mode** payment gateway (Midtrans/Xendit menyediakan environment sandbox terpisah, lihat [05-payment-integration.md](05-payment-integration.md)) dan kurir
- **Production** — environment live yang dipakai pembeli sungguhan

Setiap environment punya environment variable & credential terpisah (jangan pernah pakai API key production di staging/development).

## Strategi Testing

| Jenis Test | Cakupan | Prioritas untuk MVP |
|---|---|---|
| Unit test | Fungsi bisnis kritis: kalkulasi harga/diskon, kalkulasi ongkir, validasi stok | Tinggi |
| Integration test | Alur API end-to-end: checkout → payment → order status update | Tinggi (area paling rawan bug & paling merugikan jika salah) |
| E2E test (Playwright) | Alur pembeli utama: browse → add to cart → checkout → bayar (sandbox) | Sedang — mulai dari 2-3 skenario kritis, tambah bertahap |
| Manual QA | Fitur baru sebelum rilis, terutama UI/UX | Selalu, terutama untuk solo developer tanpa tim QA |

Fokuskan effort testing otomatis pada area yang paling merugikan jika salah: **kalkulasi harga, stok, dan status pembayaran/order** — kesalahan di area ini berdampak langsung ke uang & kepercayaan pembeli, berbeda dengan bug kosmetik UI yang lebih mudah terlihat & diperbaiki cepat.

## Database Migration Workflow

- Migration dijalankan otomatis di pipeline CI/CD untuk staging, tapi **manual dengan review** untuk production (hindari migration otomatis tanpa pengawasan di data pembeli yang sudah live).
- Selalu punya strategi rollback untuk migration yang gagal atau menyebabkan masalah tak terduga.

## Deployment Strategy

- **Zero-downtime deployment** — platform hosting modern (Railway, Vercel) sudah mendukung ini secara bawaan (deploy versi baru, baru alihkan traffic setelah health check lolos).
- **Feature flag** untuk fitur besar yang berisiko (misal metode pembayaran baru) — bisa dinyalakan/dimatikan tanpa perlu deploy ulang jika ada masalah setelah rilis.
- **Rollback plan** — pastikan bisa kembali ke versi sebelumnya dengan cepat jika deployment baru menyebabkan masalah di production.

## Keputusan Teknis yang Perlu Diambil

1. Seberapa ketat coverage testing yang ditargetkan untuk MVP (rekomendasi: fokus area transaksional dulu, bukan 100% coverage semua kode)?
2. Apakah butuh staging environment terpisah sejak hari pertama, atau langsung ke production dengan hati-hati di awal (berisiko, tapi lebih cepat untuk skala sangat kecil)?
3. Siapa yang melakukan code review jika solo developer (self-review via checklist, atau AI-assisted review)?

## Referensi

- Praktik umum CI/CD & testing untuk aplikasi Next.js/Node.js skala startup, dengan penekanan pada area transaksional yang berisiko tinggi di e-commerce.
