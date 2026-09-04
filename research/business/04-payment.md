# 04. Payment — Metode & Proses Pembayaran

## Ringkasan

Dokumen ini mencakup bagaimana pembeli membayar pesanan, bagaimana status pembayaran diverifikasi, dan bagaimana kegagalan/pembatalan ditangani. Payment adalah jembatan antara [03-cart-checkout.md](03-cart-checkout.md) dan [06-order-management.md](06-order-management.md) — status pembayaran memicu perubahan status order.

## Aktor yang Terlibat

- **Pembeli** — melakukan pembayaran
- **Payment gateway (PG)** — pihak ketiga yang memproses transaksi (Midtrans, Xendit, DOKU, dll.)
- **Bank/e-wallet/penyedia metode bayar** — pihak yang benar-benar memindahkan dana
- **Sistem toko (backend)** — menerima notifikasi status via webhook, mengubah status order
- **Tim finance toko** — rekonsiliasi dana masuk (lihat [10-finance-accounting.md](10-finance-accounting.md))

## Metode Pembayaran Umum di Indonesia (2026)

Berdasarkan riset pasar payment gateway Indonesia terkini:

- **Virtual Account (VA)** — transfer bank via nomor VA unik per transaksi (BCA, BNI, BRI, Mandiri, Permata, dll.) — metode paling umum untuk transfer bank
- **E-wallet** — GoPay, ShopeePay, OVO, DANA — sangat populer karena kecepatan & kemudahan (deep-link ke aplikasi wallet)
- **QRIS** — QR code universal yang bisa dipindai dari e-wallet/mobile banking apapun; sudah jadi standar nasional dan wajib dipertimbangkan sebagai metode utama
- **Kartu kredit/debit** — Visa/Mastercard, biasanya fee lebih tinggi (±2.9% MDR) dibanding transfer bank (±0.7-1%)
- **Paylater/cicilan** — Akulaku, Kredivo, atau paylater bawaan e-wallet (GoPayLater, ShopeePayLater) — populer untuk pembelian nilai lebih besar
- **COD (Cash on Delivery)** — bayar tunai saat barang diterima kurir; masih diminati terutama di luar kota besar, tapi berisiko tinggi (retur/penolakan) dari sisi bisnis
- **Over-the-counter (OTC)** — bayar via Alfamart/Indomaret dengan kode pembayaran
- **Transfer manual bank** — tanpa payment gateway, verifikasi manual oleh admin (opsi paling murah tapi paling lambat & rawan human error)

### Payment Gateway (penyedia integrasi)
Tiga pemain utama di pasar Indonesia: **Midtrans** (bagian ekosistem GoTo, mendukung 24+ metode pembayaran, kuat di kalangan UKM & enterprise), **Xendit** (kuat di fitur lengkap termasuk disbursement & invoicing otomatis, favorit startup), dan **DOKU** (pemain lama, mendukung banyak metode termasuk kartu & OTC). Biaya MDR bervariasi: transfer bank ±0.7-1%, kartu kredit ±2.9%.

## Alur Step-by-Step

### 1. Payment Initiation
- Setelah order dibuat (status "menunggu pembayaran"), sistem mengirim request ke payment gateway untuk generate instruksi pembayaran (nomor VA, QR code, deep-link e-wallet, dsb.)
- Pembeli diarahkan ke halaman instruksi pembayaran dengan batas waktu (misal 24 jam untuk transfer, beberapa menit untuk QRIS/e-wallet)

### 2. Payment Processing
- Pembeli menyelesaikan pembayaran di kanal masing-masing (transfer, scan QR, buka app e-wallet)
- Payment gateway mendeteksi pembayaran masuk dan mengirim **webhook/callback notifikasi** ke sistem toko

### 3. Payment Verification
- Sistem toko menerima notifikasi status: `settlement`/`success`, `pending`, `failed`, `expired`, `cancelled`
- Update status order sesuai status pembayaran (lihat [06-order-management.md](06-order-management.md) untuk lifecycle order lengkap)
- Kirim konfirmasi ke pembeli (email/WhatsApp/notifikasi in-app)

### 4. Payment Failure/Expiry Handling
- Jika pembeli tidak membayar dalam batas waktu → order otomatis dibatalkan, stok dilepas kembali ([02-catalog-inventory.md](02-catalog-inventory.md))
- Jika pembayaran gagal (kartu ditolak, saldo tidak cukup) → tampilkan pesan error, tawarkan metode lain atau coba lagi

### 5. Reconciliation (rekonsiliasi)
- Tim finance mencocokkan dana yang benar-benar masuk ke rekening/merchant account dengan catatan order di sistem
- Payment gateway biasanya melakukan settlement (pencairan dana ke rekening toko) H+1 atau sesuai jadwal yang disepakati
- Lihat detail di [10-finance-accounting.md](10-finance-accounting.md)

### 6. Refund Processing (jika terjadi retur/pembatalan)
- Refund dapat dilakukan via payment gateway (dikembalikan ke metode asal) — lihat alur lengkap di [07-returns-refunds.md](07-returns-refunds.md)

## Edge Case & Pengecualian

- **Double payment** — pembeli membayar dua kali untuk order yang sama; perlu deteksi & auto-refund kelebihan
- **Webhook gagal terkirim/telat** — sistem toko perlu mekanisme reconciliation manual/polling status ke payment gateway sebagai fallback
- **Pembayaran masuk setelah order expired/dibatalkan** — dana tetap masuk tapi order sudah batal; perlu proses refund atau reaktivasi order (kebijakan bisnis harus jelas)
- **COD ditolak/tidak diambil pembeli** — kerugian ongkir pulang-pergi ditanggung siapa? perlu kebijakan (misal blacklist pembeli yang sering menolak COD)
- **Perbedaan nominal transfer manual** (pembeli transfer kurang/lebih dari total tagihan) — khusus jika masih menyediakan opsi transfer manual tanpa VA otomatis
- **Fraud pembayaran** — kartu curian, chargeback — lihat [13-security-fraud.md](13-security-fraud.md)
- **Perubahan status pembayaran setelah barang sudah dikirim** (misal chargeback setelah barang terkirim) — perlu kebijakan mitigasi risiko

## Keputusan Bisnis yang Perlu Diambil

1. Payment gateway mana yang dipakai (Midtrans/Xendit/DOKU/lainnya)? Pertimbangkan fee MDR, kemudahan integrasi, dan metode yang didukung.
2. Metode pembayaran apa saja yang diaktifkan di MVP — semua (VA, e-wallet, QRIS, kartu, paylater, COD) atau bertahap?
3. Apakah COD didukung? Jika ya, area mana saja dan bagaimana kebijakan terhadap penolakan COD?
4. Berapa lama batas waktu pembayaran sebelum order otomatis dibatalkan?
5. Siapa yang menanggung fee MDR — dibebankan ke pembeli (surcharge) atau ditanggung toko (masuk margin)?
6. Apakah butuh cicilan/paylater sejak awal, mengingat target nilai transaksi produk?

## Konteks Indonesia

- QRIS sudah menjadi standar nasional dan diwajibkan oleh regulator untuk transaksi digital di banyak sektor — sangat disarankan menjadi metode default, bukan opsional.
- E-wallet (GoPay, ShopeePay, OVO, DANA) mendominasi preferensi pembayaran digital di Indonesia karena kecepatan dan integrasi dengan ekosistem ride-hailing/marketplace yang sudah familiar bagi pengguna.
- COD tetap relevan terutama untuk pembeli di luar kota besar yang belum sepenuhnya percaya belanja online — namun risiko operasional (retur, kerugian ongkir) harus dikelola dengan kebijakan jelas.
- Paylater (Kredivo, Akulaku, GoPayLater, ShopeePayLater) semakin populer terutama untuk kategori produk bernilai lebih tinggi (elektronik, furnitur, fashion premium).

## Referensi

- [10 Payment Gateway Terbaik di Indonesia 2026 — DOKU](https://www.doku.com/en-us/blog/payment-gateway-terbaik)
- [Payment Gateway Indonesia 2026: Midtrans vs Xendit vs Doku vs Oy!](https://panduanusaha.id/artikel/payment-gateway-indonesia-midtrans-xendit)
- [Daftar 13 Payment Gateway Terbaik di Indonesia — Exabytes](https://www.exabytes.co.id/blog/payment-gateway-terbaik/)
