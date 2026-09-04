# 00. Overview — Peta Riset Teknis E-Commerce

## Tentang Riset Ini

Riset ini memetakan pilihan teknologi untuk membangun e-commerce single-store secara **custom build dari nol**, oleh **developer solo yang sudah berpengalaman coding**, dengan hosting yang direkomendasikan berdasarkan riset (belum ditentukan sebelumnya). Riset ini adalah lanjutan teknis dari [research/business/](../business/00-overview.md) — setiap keputusan teknologi di sini dipilih untuk mendukung alur bisnis yang sudah dipetakan di sana.

## Ringkasan Tech Stack yang Direkomendasikan

| Layer | Rekomendasi | Alasan Utama |
|---|---|---|
| Frontend | **Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui** | SEO-friendly, performa baik, ekosistem besar |
| Backend | **Node.js + NestJS (TypeScript)** | Satu bahasa dgn frontend, struktur modular untuk 14+ domain bisnis |
| Database | **PostgreSQL + Prisma ORM** | Konsistensi transaksi kuat, type-safe |
| Cache & Queue | **Redis + BullMQ** | Cache produk, session, job asinkron (notifikasi, auto-cancel) |
| Search | **Meilisearch** | Instant search murah, cukup untuk skala single-store |
| Payment | **Midtrans (Snap)** | Ekosistem lokal matang, SDK Node.js resmi |
| Shipping | **Biteship** | Agregator 30+ kurir Indonesia dalam satu API |
| Object Storage | **Cloudflare R2** | Egress gratis, jauh lebih murah dari S3 untuk gambar produk |
| Hosting | **Railway** (MVP), evaluasi VPS/cloud besar saat skala bertumbuh | Cocok untuk long-lived process (job queue, cron) |
| Notifikasi | **WhatsApp Cloud API (via BSP) + Resend/SendGrid (email)** | WhatsApp adalah kanal dominan pembeli Indonesia |
| Monitoring | **Sentry + structured logging (pino)** | Error tracking + APM dasar dalam satu tool |
| Analytics | **GA4 + Meta Pixel + dashboard internal (Metabase)** | Marketing analytics + data bisnis akurat dari DB sendiri |

## Peta Dokumen

| # | Dokumen | Cakupan |
|---|---|---|
| 01 | [Frontend](01-frontend.md) | Next.js, rendering strategy, state management, UI components |
| 02 | [Backend & API](02-backend-api.md) | NestJS, arsitektur modular monolith, job queue |
| 03 | [Database](03-database.md) | PostgreSQL, Prisma, skema data inti, Redis caching |
| 04 | [Authentication & Security](04-authentication-security.md) | Auth pembeli/admin, keamanan data, kepatuhan UU PDP |
| 05 | [Payment Integration](05-payment-integration.md) | Midtrans Snap, webhook, refund, auto-cancel |
| 06 | [Shipping Integration](06-shipping-integration.md) | Biteship API, kalkulasi ongkir, tracking |
| 07 | [Search & Catalog](07-search-catalog.md) | Meilisearch, sinkronisasi index, fitur pencarian |
| 08 | [Infrastructure & Hosting](08-infrastructure-hosting.md) | Perbandingan Vercel/Railway/VPS/cloud besar |
| 09 | [Storage, CDN & Media](09-storage-cdn-media.md) | Cloudflare R2, optimasi gambar produk |
| 10 | [DevOps, CI/CD & Testing](10-devops-cicd-testing.md) | GitHub Actions, strategi testing, environment |
| 11 | [Monitoring & Logging](11-monitoring-logging.md) | Sentry, structured logging, alerting |
| 12 | [Notifications & Messaging](12-notifications-messaging.md) | WhatsApp Business API, email transaksional |
| 13 | [Analytics & Tracking](13-analytics-tracking-technical.md) | GA4, event tracking plan, cookie consent |
| 14 | [Performance & SEO Teknis](14-performance-seo-technical.md) | Core Web Vitals, structured data, caching |

## Prinsip yang Mendasari Semua Rekomendasi

1. **Optimasi untuk solo developer berpengalaman** — stack dipilih agar satu orang bisa membangun & memelihara seluruh sistem tanpa kompleksitas operasional berlebih (misal modular monolith, bukan microservices; satu bahasa TypeScript di frontend & backend).
2. **Biaya rendah di awal, bisa berkembang seiring skala** — semua rekomendasi punya tier gratis/murah untuk MVP (Railway, Meilisearch self-hosted, Sentry Developer plan, Cloudflare R2 free tier) dengan jalur upgrade jelas saat traffic bertumbuh.
3. **Selalu terhubung ke kebutuhan bisnis nyata** — tidak ada pilihan teknologi "karena sedang tren"; tiap rekomendasi ditautkan ke dokumen riset bisnis yang menjelaskan *kenapa* kebutuhan itu ada.
4. **Konteks Indonesia diprioritaskan** — WhatsApp API, payment gateway lokal (Midtrans), agregator kurir lokal (Biteship), dan pertimbangan latensi/kualitas jaringan Indonesia bukan tambahan belakangan, tapi bagian dari keputusan arsitektur sejak awal.
5. **Keamanan & kepatuhan bukan lapisan tempelan** — autentikasi, enkripsi, dan kepatuhan UU PDP dipertimbangkan sebagai bagian arsitektur inti, bukan ditambahkan setelah fitur selesai.

## Bagaimana Menggunakan Riset Ini

- Gunakan sebagai **checklist keputusan teknis** sebelum mulai coding — tiap dokumen punya bagian "Keputusan Teknis yang Perlu Diambil" yang sebaiknya dijawab dulu.
- Gunakan tabel ringkasan di atas sebagai referensi cepat saat setup project pertama kali (`package.json`, provisioning database, dsb.).
- Untuk MVP, tidak semua bagian perlu diimplementasikan sekaligus — prioritaskan: **Frontend + Backend + Database + Payment + Shipping** (alur transaksi inti) terlebih dulu, lalu **Search, Monitoring, Notifications** menyusul, dan **Analytics lanjutan, optimasi performa mendalam** di iterasi berikutnya.

## Estimasi Biaya Infrastruktur Bulanan (MVP Awal)

| Layanan | Estimasi Biaya |
|---|---|
| Railway (backend + DB + Redis) | ~$10–20/bulan |
| Cloudflare R2 (storage + CDN) | Gratis di tier awal (10GB) |
| Meilisearch (self-hosted di Railway) | Termasuk dalam biaya Railway |
| Midtrans | Tanpa biaya bulanan, hanya fee per transaksi (~0.7–2.9% MDR) |
| Biteship | Tanpa biaya bulanan untuk API, hanya biaya ongkir aktual diteruskan ke pembeli |
| WhatsApp Business API (via BSP) | Mulai ~Rp100rb/bulan + biaya per pesan |
| Sentry | Gratis (Developer plan) |
| Domain (.id/.co.id) | ~Rp200-500rb/tahun |
| **Total estimasi** | **~Rp300rb–800rb/bulan** di luar fee transaksi & pesan WhatsApp yang scale dengan volume penjualan |

## Catatan Batasan Riset

- Riset ini adalah rekomendasi awal berdasarkan kondisi pasar teknologi per Agustus 2026 — versi/harga tools bisa berubah, perlu dicek ulang saat implementasi dimulai.
- Rekomendasi diasumsikan untuk skala MVP–early growth (single-store, belum multi-warehouse/multi-region besar). Jika skala bisnis melonjak drastis, sebagian keputusan (terutama hosting & database) perlu dievaluasi ulang.
- Dokumen ini fokus pada *apa* teknologi yang dipakai dan *kenapa* — bukan tutorial implementasi langkah-demi-langkah, yang sebaiknya mengikuti dokumentasi resmi tiap tool saat development dimulai.

## Referensi

Sumber riset spesifik tercantum di masing-masing dokumen (01-14). Riset diverifikasi via pencarian web per Agustus 2026 untuk area yang bergerak cepat (versi framework, harga hosting, harga API pihak ketiga).
