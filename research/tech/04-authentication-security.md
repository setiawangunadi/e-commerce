# 04. Authentication & Security

## Ringkasan

Dokumen ini membahas implementasi teknis autentikasi (login pembeli & admin) dan praktik keamanan aplikasi — implementasi teknis dari [research/business/13-security-fraud.md](../business/13-security-fraud.md) dan bagian keamanan data di [research/business/11-legal-compliance.md](../business/11-legal-compliance.md) (UU PDP).

## Autentikasi Pembeli

Rekomendasi: **Auth.js (NextAuth)** terintegrasi dengan backend, mendukung kombinasi:
- **Email/password** dengan hashing **bcrypt/argon2** (jangan pernah simpan password plain text)
- **OTP via WhatsApp/SMS** — relevan karena nomor telepon adalah identitas utama pembeli Indonesia (lihat [research/business/03-cart-checkout.md](../business/03-cart-checkout.md))
- **Social login** (Google) untuk mengurangi friksi pendaftaran
- **Guest checkout** tanpa akun sama sekali, dengan opsi "buat akun" setelah order selesai (lihat keputusan bisnis di [research/business/03-cart-checkout.md](../business/03-cart-checkout.md))

Session disimpan sebagai **JWT** (untuk API stateless) atau session di Redis (untuk kontrol lebih ketat seperti revoke paksa saat logout dari semua device).

## Autentikasi & Otorisasi Admin

Terpisah dari sistem login pembeli:
- Role-based access control (RBAC) — minimal 2 role di awal: `admin` (akses penuh) dan `staff` (akses terbatas, misal hanya order & fulfillment, tidak bisa ubah harga)
- Wajib **2FA (TOTP)** untuk akun admin — akun ini yang paling berisiko jika diretas (bisa ubah harga, akses data pelanggan)
- Audit log setiap aksi sensitif (ubah harga, override status order, refund manual) — siapa melakukan apa dan kapan, relevan untuk investigasi jika ada penyalahgunaan (lihat [research/business/13-security-fraud.md](../business/13-security-fraud.md))

## Keamanan Data Pembayaran

- **Jangan pernah menyimpan data kartu kredit/debit mentah** di server sendiri. Delegasikan sepenuhnya ke payment gateway (Midtrans/Xendit) yang sudah PCI DSS compliant — lihat [05-payment-integration.md](05-payment-integration.md).
- Simpan hanya token/reference ID transaksi dari payment gateway, bukan detail kartu.
- Verifikasi signature pada setiap webhook dari payment gateway untuk memastikan notifikasi memang berasal dari mereka, bukan pihak yang menyamar.

## Keamanan Aplikasi Umum (OWASP-aligned)

- **Input validation** di setiap endpoint (Zod di backend, sinkron dengan validasi di frontend) — cegah injection dan data tidak valid masuk database.
- **Rate limiting** pada endpoint sensitif: login, forgot password, apply voucher (cegah brute force & abuse, lihat [research/business/13-security-fraud.md](../business/13-security-fraud.md)).
- **HTTPS wajib** di semua environment, termasuk staging.
- **CORS** dikonfigurasi ketat — hanya domain frontend resmi yang boleh mengakses API.
- **Security headers** (Content-Security-Policy, X-Frame-Options, dll.) dipasang di level Next.js middleware atau reverse proxy.
- **Dependency scanning** — audit rutin (`npm audit`, atau tools seperti Snyk/Dependabot) untuk kerentanan di package pihak ketiga.
- **Secrets management** — API key payment gateway, database credential, dll. disimpan di environment variable/secret manager platform hosting, tidak pernah di-commit ke repository.

## Perlindungan Data Pribadi (UU PDP)

Terkait langsung dengan [research/business/11-legal-compliance.md](../business/11-legal-compliance.md):
- Enkripsi data sensitif saat disimpan (nomor telepon, alamat) jika platform database mendukung (encryption at rest), dan **enkripsi in-transit** (HTTPS/TLS) untuk semua komunikasi.
- Mekanisme teknis bagi pengguna untuk **mengakses dan menghapus data mereka** (hak yang diamanatkan UU PDP) — perlu endpoint/fitur admin untuk memenuhi permintaan ini.
- **Consent tracking** — catat kapan & untuk apa pengguna memberi persetujuan (misal untuk menerima marketing email/WA), bukan asumsi default opt-in.
- Rencana respons insiden (incident response plan) jika terjadi kebocoran data — siapa yang harus dihubungi, dalam waktu berapa lama harus notifikasi ke pengguna & otoritas.

## Fraud Detection (Sisi Teknis)

Mendukung kebutuhan bisnis di [research/business/13-security-fraud.md](../business/13-security-fraud.md):
- Payment gateway (Midtrans/Xendit) sudah punya fraud detection bawaan untuk transaksi kartu — manfaatkan skor risiko yang mereka berikan di response API.
- Bangun aturan sederhana di level aplikasi: flag order untuk review manual jika nilai order jauh di atas rata-rata, alamat pengiriman beda negara/pulau drastis dari histori, atau banyak akun terdaftar dari IP/device yang sama dalam waktu singkat.
- Log & lacak riwayat penolakan COD per nomor telepon (lihat [research/business/04-payment.md](../business/04-payment.md)) untuk mendukung keputusan blokir/soft-warning.

## Keputusan Teknis yang Perlu Diambil

1. JWT stateless atau session di Redis untuk autentikasi pembeli?
2. Apakah 2FA admin wajib sejak hari pertama, atau ditambahkan setelah ada lebih dari satu admin?
3. Berapa lama retention audit log, dan siapa yang bisa mengaksesnya?
4. Apakah butuh WAF (Web Application Firewall) tambahan di depan aplikasi (banyak provider hosting/CDN sudah menyediakan ini secara built-in)?

## Referensi

- Praktik keamanan aplikasi web umum (OWASP Top 10) dan pola penanganan data pembayaran PCI-compliant via delegasi ke payment gateway pihak ketiga.
