# 05. Payment Integration (Teknis)

## Ringkasan

Dokumen ini membahas implementasi teknis integrasi payment gateway — melengkapi sisi bisnis di [research/business/04-payment.md](../business/04-payment.md) dengan detail SDK, alur API, dan penanganan webhook.

## Rekomendasi Payment Gateway

**Midtrans** sebagai pilihan utama untuk MVP, dengan **Xendit** sebagai alternatif yang dipertimbangkan.

| | Midtrans | Xendit |
|---|---|---|
| Ekosistem | Bagian GoTo Group, sangat matang untuk pasar Indonesia | Fitur lengkap termasuk disbursement & invoicing otomatis |
| SDK Node.js | `midtrans-client` (resmi) | SDK resmi Node.js tersedia |
| Produk utama | Snap (popup terkustomisasi), Snap Redirect, Core API | Invoice API, Payment Channels API |
| Cocok untuk | Bisnis yang ingin implementasi cepat dengan UI pembayaran siap pakai (Snap) | Bisnis yang butuh kontrol lebih detail atas UI pembayaran sendiri |

Rekomendasi: mulai dengan **Snap** (Midtrans) — popup pembayaran siap pakai yang mendukung semua metode (VA, e-wallet, QRIS, kartu, dst.) tanpa perlu membangun UI pembayaran sendiri, mempercepat time-to-market untuk solo developer.

## Alur Integrasi Teknis

1. **Buat transaksi** — backend memanggil API Midtrans (`snap.createTransaction()`) dengan detail order (order ID, total, item, data pembeli) setelah order dibuat dengan status `pending_payment` (lihat [research/business/06-order-management.md](../business/06-order-management.md)).
2. **Terima Snap token/redirect URL** — dikirim ke frontend untuk menampilkan popup pembayaran atau redirect.
3. **Pembeli membayar** di kanal pilihan mereka.
4. **Terima webhook notification** — endpoint backend (`POST /api/webhooks/midtrans`) menerima callback berisi `order_id`, `transaction_status`, `signature_key`.
5. **Verifikasi signature** — cocokkan `signature_key` yang dikirim dengan hasil hash SHA512 dari `order_id + status_code + gross_amount + server_key` milik sendiri. **Jangan pernah update status order tanpa verifikasi ini** — mencegah pihak lain memalsukan notifikasi pembayaran sukses.
6. **Update status order** sesuai `transaction_status` (`settlement`/`capture` → paid, `pending` → tetap menunggu, `deny`/`expire`/`cancel` → gagal) — trigger perubahan status di [research/business/06-order-management.md](../business/06-order-management.md).
7. **Idempotency** — webhook bisa terkirim lebih dari sekali untuk event yang sama; pastikan proses update status order aman dijalankan berkali-kali tanpa efek samping ganda (misal jangan kirim email konfirmasi dua kali).

## Fallback: Polling Status

Karena webhook bisa gagal terkirim (masalah jaringan, server down sesaat), sediakan mekanisme fallback:
- Job terjadwal (via BullMQ, lihat [02-backend-api.md](02-backend-api.md)) yang secara berkala mengecek status transaksi via API `Get Status` untuk order yang masih `pending_payment` lebih dari beberapa menit.
- Ini menutup celah dari edge case "webhook gagal terkirim/telat" yang diidentifikasi di [research/business/04-payment.md](../business/04-payment.md).

## Auto-Cancel Order Kedaluwarsa

- Set `expiry` saat membuat transaksi Snap (misal 24 jam untuk transfer, lebih singkat untuk e-wallet/QRIS).
- Job terjadwal mengecek order yang masih `pending_payment` melewati batas waktu, ubah status jadi `expired`, dan lepas kembali reservasi stok (lihat [03-database.md](03-database.md) bagian stock reservation).

## Refund via API

Untuk alur retur di [research/business/07-returns-refunds.md](../business/07-returns-refunds.md):
- Midtrans menyediakan API refund yang mengembalikan dana ke metode pembayaran asal (untuk kartu kredit/e-wallet yang mendukung).
- Untuk transfer bank/VA, refund umumnya perlu diproses manual via transfer balik oleh tim finance (VA tidak selalu mendukung refund otomatis) — perlu alur kerja terpisah di dashboard admin untuk menandai refund manual sebagai selesai.

## Keputusan Teknis yang Perlu Diambil

1. Midtrans Snap, Snap Redirect, atau Core API (UI custom sendiri)?
2. Apakah backend perlu mendukung lebih dari satu payment gateway sejak awal (untuk redundansi), atau cukup satu dulu?
3. Berapa lama interval job polling fallback status pembayaran?
4. Siapa yang menangani proses refund manual untuk metode yang tidak mendukung refund otomatis?

## Referensi

- [midtrans-nodejs-client — GitHub (Official Midtrans Payment API Client for Node JS)](https://github.com/Midtrans/midtrans-nodejs-client)
- [midtrans-client — npm](https://www.npmjs.com/package/midtrans-client)
- Dokumentasi resmi Midtrans (docs.midtrans.com) untuk detail lengkap Snap, Core API, dan webhook notification.
