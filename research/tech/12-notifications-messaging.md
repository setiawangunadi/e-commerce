# 12. Notifications & Messaging (Teknis)

## Ringkasan

Dokumen ini membahas implementasi teknis pengiriman notifikasi (email, WhatsApp, SMS) ke pembeli — melengkapi kebutuhan bisnis di [research/business/06-order-management.md](../business/06-order-management.md) (notifikasi status order), [research/business/03-cart-checkout.md](../business/03-cart-checkout.md) (cart abandonment), dan [research/business/08-customer-service.md](../business/08-customer-service.md) (WhatsApp-first communication).

## WhatsApp Business API

Karena WhatsApp adalah kanal komunikasi dominan bagi pembeli Indonesia (lihat [research/business/01-customer-journey.md](../business/01-customer-journey.md) dan [research/business/08-customer-service.md](../business/08-customer-service.md)), integrasi WhatsApp API adalah prioritas teknis, bukan sekadar nice-to-have.

**Opsi integrasi:**
- **Meta WhatsApp Cloud API resmi** — bisa diintegrasikan langsung tanpa perantara, tapi butuh proses verifikasi bisnis (Meta Business verification) dan effort setup lebih besar.
- **Business Solution Provider (BSP)** pihak ketiga — mis. Qontak, Cekat, atau provider lain yang menyediakan Cloud API resmi dengan layer kemudahan tambahan (dashboard, template management), dengan biaya langganan bulanan di atas biaya per-pesan resmi Meta.

**Biaya (per Agustus 2026):** pesan kategori marketing ~Rp586/pesan, utility & authentication ~Rp357/pesan (+PPN 11%), dengan diskon volume hingga 25% seiring volume bulanan bertambah. Pesan utility & service saat ini masih gratis namun **akan berbayar mulai 1 Oktober 2026** — perlu diperhitungkan dalam proyeksi biaya operasional (lihat [research/business/10-finance-accounting.md](../business/10-finance-accounting.md)).

**Rekomendasi untuk MVP:** mulai dengan BSP yang menawarkan Cloud API resmi dengan biaya setup rendah (beberapa provider menawarkan mulai ~Rp100rb/bulan tanpa markup per-pesan) — lebih cepat live dibanding mengurus verifikasi resmi Meta secara mandiri di awal.

## Template Pesan (Message Templates)

WhatsApp Business API mengharuskan pesan di luar jendela 24 jam (setelah pembeli terakhir membalas) memakai **template pesan** yang sudah disetujui Meta. Template yang perlu disiapkan sejak awal:
- Konfirmasi order dibuat
- Instruksi pembayaran (khusus VA/transfer)
- Konfirmasi pembayaran diterima
- Update status pengiriman (nomor resi, estimasi tiba)
- Reminder cart abandonment (lihat [research/business/09-marketing-promotion.md](../business/09-marketing-promotion.md))
- Konfirmasi pengajuan retur diterima/ditolak

## Email

Untuk komunikasi yang lebih formal (invoice, faktur pajak, dokumentasi retur) dan sebagai fallback bagi pembeli yang lebih nyaman email:
- **Resend** atau **SendGrid** sebagai penyedia email transaksional — API sederhana, deliverability baik, terintegrasi mudah dengan Node.js.
- Template email dibangun dengan React Email atau MJML agar konsisten tampilannya di berbagai email client.
- Domain email sendiri (bukan alamat gratisan) dengan SPF/DKIM/DMARC dikonfigurasi dengan benar — penting agar email tidak masuk folder spam, terutama untuk email transaksional kritis seperti konfirmasi pembayaran.

## Push Notification (Opsional untuk MVP)

Jika ke depannya ada PWA/mobile app, web push notification (via layanan seperti OneSignal) bisa menambah kanal untuk cart abandonment recovery dan update status order — tapi untuk MVP web biasa, WhatsApp & email sudah cukup mencakup kebutuhan utama.

## Arsitektur Pengiriman Notifikasi

- Semua notifikasi dikirim melalui **job queue** (BullMQ, lihat [02-backend-api.md](02-backend-api.md)), bukan langsung sinkron di request handler — mencegah kegagalan pengiriman notifikasi (misal API WhatsApp lambat) memperlambat/menggagalkan proses utama seperti pembuatan order.
- Retry otomatis dengan backoff jika pengiriman gagal (koneksi API provider terputus sementara).
- Log status pengiriman tiap notifikasi (terkirim, gagal, dibaca jika tersedia) untuk keperluan audit & debugging komplain "saya tidak menerima notifikasi" (lihat [research/business/08-customer-service.md](../business/08-customer-service.md)).

## Keputusan Teknis yang Perlu Diambil

1. WhatsApp Cloud API langsung dari Meta, atau via BSP pihak ketiga untuk mempercepat setup?
2. Resend atau SendGrid untuk email transaksional?
3. Notifikasi mana yang wajib dikirim via WhatsApp vs cukup email vs keduanya?
4. Bagaimana menangani pembeli yang tidak mencantumkan nomor WhatsApp aktif (fallback ke SMS/email saja)?

## Referensi

- [WhatsApp Business API Pricing in Indonesia 2026 (Per Message)](https://chatmaxima.com/whatsapp-api-pricing/indonesia/)
- [Harga WhatsApp API Indonesia 2026: Biaya Resmi — Cekat](https://cekat.ai/en/blog/harga-whatsapp-api-indonesia-2026)
- [Official WhatsApp API (WABA) Termurah se-Indonesia — Api.co.id](https://api.co.id/whatsapp-api-gateway/)
