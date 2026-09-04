# 08. Infrastructure & Hosting

## Ringkasan

Dokumen ini membahas perbandingan opsi hosting/infrastruktur untuk go-live, sesuai permintaan riset & rekomendasi (belum ada preferensi hosting yang ditentukan sebelumnya).

## Rekomendasi Utama

**Railway** untuk fase MVP–early growth, dengan opsi migrasi ke **VPS** (Hetzner/lokal Indonesia) saat traffic & biaya sudah bisa diprediksi, atau ke **cloud provider besar** (AWS/GCP) jika skala sudah signifikan.

## Perbandingan Opsi

| | Vercel | Railway | VPS (Hetzner/lokal ID) | AWS/GCP |
|---|---|---|---|---|
| Cocok untuk | Frontend Next.js murni, sangat mudah deploy | Full-stack (app + database + background job) dalam satu platform | Kontrol penuh, biaya paling rendah di skala kecil-menengah | Skala besar, kontrol penuh, tapi kompleksitas DevOps tinggi |
| Estimasi biaya awal | Gratis untuk hobby, tapi Pro $20/seat/bulan + biaya bandwidth overage saat traffic nyata | ~$8–15/bulan untuk app trafik sedang; Pro $20/bulan/workspace tanpa batas seat | VPS ~$6–9/bulan (Hetzner) atau hosting lokal Indonesia dengan harga serupa | Bervariasi, mudah membengkak tanpa monitoring ketat |
| Database & background job | Tidak native — perlu provider terpisah (Neon/Supabase) | Native — database & worker bisa di-host di platform yang sama | Perlu setup manual (tapi fleksibel) | Managed service tersedia (RDS, dll.) tapi berbayar terpisah |
| Cold start | Ya (serverless functions) — bisa jadi masalah untuk API yang perlu respons cepat konsisten | Tidak — container long-lived, cocok untuk WebSocket, cron job, proses background | Tidak | Tergantung konfigurasi (serverless vs VM) |
| Kesulitan setup | Sangat mudah | Mudah | Perlu setup manual (Docker, reverse proxy, SSL) | Butuh pengetahuan DevOps mendalam |

## Alasan Rekomendasi Railway untuk MVP

- Backend e-commerce butuh **long-lived process** untuk job queue (BullMQ), cron job (auto-cancel order, lihat [05-payment-integration.md](05-payment-integration.md)), dan koneksi database yang stabil — ini cocok dengan model Railway (container biasa), bukan serverless function Vercel yang punya batas durasi eksekusi.
- Database PostgreSQL & Redis bisa di-host di platform yang sama, mengurangi kompleksitas mengelola banyak provider terpisah.
- Biaya lebih predictable untuk usage moderat dibanding Vercel yang bisa melonjak akibat biaya bandwidth/seat.

## Pembagian Komponen Infrastruktur

| Komponen | Rekomendasi Hosting |
|---|---|
| Frontend (Next.js) | Bisa tetap di Vercel (gratis/murah untuk static+ISR, sangat dioptimalkan untuk Next.js) **atau** disatukan di Railway dengan backend — pilih satu untuk kesederhanaan operasional |
| Backend API (NestJS) | Railway |
| Database (PostgreSQL) | Railway managed Postgres, atau alternatif seperti Neon/Supabase |
| Redis (cache & queue) | Railway managed Redis |
| Search engine (Meilisearch) | Self-hosted di Railway/VPS terpisah, atau Meilisearch Cloud |
| Object storage (gambar produk) | Cloudflare R2 (lihat [09-storage-cdn-media.md](09-storage-cdn-media.md)) |

## Kapan Pindah ke VPS atau Cloud Besar

- **Pindah ke VPS** (Hetzner atau provider lokal seperti Biznet Gio/Niagahoster) jika biaya platform managed (Railway) mulai terasa mahal di skala traffic tinggi tapi predictable, dan tim sudah nyaman mengelola server sendiri (Docker, reverse proxy, monitoring).
- **Pindah ke AWS/GCP** jika butuh skalabilitas otomatis yang matang, compliance khusus, atau integrasi dengan layanan cloud lanjutan (ML, data warehouse) — biasanya relevan di skala yang jauh lebih besar dari MVP single-store.
- Untuk latensi terbaik bagi pengguna Indonesia, pastikan region server dekat (Singapore adalah region umum yang dipakai banyak provider termasuk Railway/AWS/GCP untuk melayani Indonesia dengan latensi rendah).

## Domain & DNS

- Daftarkan domain `.id`/`.co.id` (memberi sinyal kredibilitas lokal ke pembeli Indonesia, lihat kepercayaan sebagai hambatan trust di [research/business/01-customer-journey.md](../business/01-customer-journey.md)) melalui registrar seperti Niagahoster/Domainesia, atau domain internasional via Cloudflare Registrar/Namecheap.
- Gunakan **Cloudflare** sebagai DNS + proxy layer — memberi CDN gratis, proteksi DDoS dasar, dan SSL otomatis di depan aplikasi.

## Keputusan Teknis yang Perlu Diambil

1. Railway untuk semua komponen backend, atau split frontend ke Vercel?
2. Kapan titik traffic/biaya yang jadi trigger untuk evaluasi pindah ke VPS/cloud besar?
3. Apakah perlu multi-region sejak awal, atau satu region (Singapore) sudah cukup untuk latensi yang baik ke seluruh Indonesia?

## Referensi

- [10 Best Next.js Hosting Providers in 2026](https://makerkit.dev/blog/tutorials/best-hosting-nextjs)
- [Vercel vs Railway (2026): Serverless vs Full-Stack Hosting](https://www.buildmvpfast.com/compare/vercel-vs-railway)
- [Next.js Hosting Cost Calculator: Vercel vs VPS — Temps](https://temps.sh/blog/nextjs-deployment-cost-calculator)
