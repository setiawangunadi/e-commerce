# 11. Monitoring, Logging & Error Tracking

## Ringkasan

Dokumen ini membahas bagaimana memantau kesehatan sistem secara teknis — mendukung kebutuhan operasional di [research/business/06-order-management.md](../business/06-order-management.md) (order stuck/bermasalah perlu terdeteksi cepat) dan insiden keamanan di [research/business/13-security-fraud.md](../business/13-security-fraud.md).

## Error Tracking: Sentry

**Sentry** direkomendasikan untuk menangkap error runtime di frontend & backend:
- **Developer plan gratis** (5.000 error/bulan, 1 user) cukup untuk fase MVP/early stage.
- SDK resmi untuk Next.js & Node.js, menangkap stack trace, breadcrumb (urutan aksi sebelum error terjadi), dan context pengguna — sangat membantu debug masalah yang dilaporkan pembeli (lihat [research/business/08-customer-service.md](../business/08-customer-service.md)).
- Alert otomatis (email/Slack) saat error baru muncul atau error rate melonjak — penting untuk segera tahu jika ada masalah di alur checkout/payment tanpa menunggu laporan pembeli.

## Application Performance Monitoring (APM)

- Sentry juga menyediakan performance tracing (durasi request, query database lambat) di tier yang sama — cukup untuk visibilitas awal tanpa perlu tool APM terpisah.
- Pantau khusus **endpoint kritis**: checkout, create order, webhook payment — durasi respons yang melambat di area ini langsung berdampak ke pengalaman pembeli dan potensi order gagal.

## Logging Terstruktur

- Gunakan logging terstruktur (JSON, bukan `console.log` string bebas) di backend agar mudah di-query — misal library `pino` untuk Node.js (cepat & ringan).
- Log setiap **perubahan status order** dengan konteks lengkap (order ID, status lama, status baru, trigger/aktor) — melengkapi audit trail di database ([03-database.md](03-database.md)) dengan log yang bisa di-cross-check saat debugging.
- Log semua **webhook masuk** (payment, shipping) mentah sebelum diproses — jika ada bug parsing, log mentah ini jadi bukti untuk investigasi tanpa perlu meminta ulang data dari pihak ketiga.

## Uptime Monitoring

- Uptime monitor sederhana (misal UptimeRobot, atau bawaan dari platform hosting seperti Railway) yang mengecek endpoint health check secara berkala dan mengirim alert jika aplikasi down.
- Health check endpoint (`/api/health`) yang memverifikasi koneksi ke database, Redis, dan dependency kritis lain — bukan sekadar "server menyala".

## Dashboard Operasional (Bukan Analytics Bisnis)

Berbeda dengan dashboard KPI bisnis di [13-analytics-tracking-technical.md](13-analytics-tracking-technical.md) dan [research/business/12-analytics-kpi.md](../business/12-analytics-kpi.md), dashboard operasional teknis berfokus pada kesehatan sistem:
- Jumlah error per jam/hari
- Response time endpoint kritis (p50, p95, p99)
- Jumlah job queue yang gagal/tertunda (relevan untuk auto-cancel order, notifikasi, sinkronisasi stok — lihat [02-backend-api.md](02-backend-api.md))
- Status koneksi ke layanan pihak ketiga (payment gateway, kurir, WhatsApp API)

## Alerting

- Alert kritis (payment webhook gagal berulang kali, database tidak bisa diakses, error rate melonjak tajam) harus sampai ke developer secepat mungkin — kanal yang disarankan: WhatsApp/Telegram bot atau email dengan prioritas tinggi, bukan hanya dashboard yang perlu dicek manual.
- Hindari alert fatigue — hanya alert untuk kondisi yang benar-benar butuh tindakan segera, bukan setiap error kecil.

## Keputusan Teknis yang Perlu Diambil

1. Sentry tier gratis cukup untuk MVP, atau perlu upgrade ke Team plan sejak awal?
2. Kanal alert kritis apa yang dipakai (WhatsApp bot, Telegram, email)?
3. Berapa lama retention log disimpan, mengingat kebutuhan investigasi komplain/dispute yang bisa muncul beberapa minggu setelah transaksi?

## Referensi

- [Sentry Pricing 2026: Plans, Costs & How to Reduce Your Bill — Last9](https://last9.io/blog/sentry-pricing/)
- Praktik umum observability (error tracking + structured logging + uptime monitoring) untuk aplikasi Node.js/Next.js skala startup.
