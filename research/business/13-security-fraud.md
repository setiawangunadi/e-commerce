# 13. Security & Fraud Prevention

## Ringkasan

Dokumen ini mencakup risiko keamanan dan kecurangan yang perlu diantisipasi dalam operasional e-commerce, dari sisi akun pelanggan, transaksi pembayaran, hingga penyalahgunaan promo. Bersinggungan dengan [04-payment.md](04-payment.md), [06-order-management.md](06-order-management.md), dan [09-marketing-promotion.md](09-marketing-promotion.md).

## Aktor yang Terlibat

- **Pembeli sah** — pengguna normal
- **Pelaku fraud** — pihak yang mencoba mengeksploitasi sistem
- **Payment gateway** — memiliki sistem deteksi fraud bawaan
- **Tim operasional/keamanan toko**

## Area Risiko & Alur Mitigasi

### 1. Account Security (Keamanan Akun Pelanggan)
- **Autentikasi** — password yang aman (hashing, bukan plain text), opsi login via OTP/social login
- **Perlindungan dari brute force** — rate limiting percobaan login
- **Session management** — logout otomatis, deteksi login dari device/lokasi tidak biasa
- **Data pribadi tersimpan aman** — enkripsi data sensitif, kepatuhan UU PDP (lihat [11-legal-compliance.md](11-legal-compliance.md))

### 2. Payment Fraud
- **Kartu curian (stolen card)** — transaksi pakai data kartu kredit curian; umumnya sudah difilter oleh sistem fraud detection payment gateway, tapi toko perlu tetap waspada pada pola transaksi mencurigakan (misal alamat kirim beda jauh dari alamat kartu, order bernilai tinggi mendadak dari akun baru)
- **Chargeback** — pembeli membantah transaksi ke bank setelah barang diterima; perlu dokumentasi bukti pengiriman (POD) yang rapi sebagai pembelaan
- **Triangulation fraud** — pola penipuan di mana pelaku "menjual" barang di platform lain memakai kartu curian untuk membeli dari toko asli dan kirim ke pembeli korban

### 3. Order/Promo Abuse
- **Promo abuse** — satu orang membuat banyak akun untuk klaim promo pengguna baru berulang (lihat [09-marketing-promotion.md](09-marketing-promotion.md))
- **COD abuse** — order fiktif berulang dengan COD yang selalu ditolak, merugikan ongkir toko (lihat [04-payment.md](04-payment.md), [05-shipping-fulfillment.md](05-shipping-fulfillment.md))
- **Refund/retur abuse** — klaim retur palsu (barang diklaim rusak padahal tidak, atau barang diganti sebelum dikirim balik)

### 4. Website/Infrastructure Security (level bisnis, bukan teknis mendalam)
- Perlindungan dari serangan umum (di luar detail implementasi teknis) — perlu kebijakan bisnis soal siapa yang bertanggung jawab atas monitoring keamanan platform
- Kepatuhan standar keamanan pembayaran (PCI DSS) jika toko menyimpan/memproses data kartu langsung — umumnya dihindari dengan mendelegasikan penuh ke payment gateway (tokenisasi) alih-alih toko menyimpan data kartu sendiri

## Alur Step-by-Step (Deteksi & Respons)

1. **Deteksi** — sistem/tim mengidentifikasi pola mencurigakan (order bernilai besar mendadak, banyak akun dari device sama, tingkat penolakan COD tinggi dari satu nomor telepon)
2. **Verifikasi manual** — untuk order mencurigakan, admin melakukan pengecekan tambahan sebelum diproses (lihat [06-order-management.md](06-order-management.md))
3. **Tindakan** — tahan/batalkan order, blokir akun/nomor telepon, minta verifikasi tambahan dari pembeli
4. **Dokumentasi** — catat kasus untuk pembelaan chargeback atau pembelajaran pola fraud ke depan
5. **Insiden data breach** (jika terjadi) — prosedur notifikasi ke pengguna & otoritas sesuai UU PDP dalam batas waktu yang ditentukan

## Edge Case & Pengecualian

- **False positive** — pembeli sah ditandai sebagai fraud karena pola tidak biasa (misal beli dalam jumlah besar untuk kado/reseller) — perlu jalur banding/verifikasi cepat agar tidak kehilangan pembeli sah
- **Fraud yang lolos deteksi otomatis payment gateway** — toko tetap perlu lapisan verifikasi tambahan untuk order bernilai tinggi
- **Akun pembeli diretas (account takeover)** — pesanan dibuat dari akun yang bukan pemiliknya; perlu prosedur pemulihan akun yang aman

## Keputusan Bisnis yang Perlu Diambil

1. Apakah butuh aturan verifikasi manual untuk order di atas nilai tertentu?
2. Bagaimana kebijakan terhadap nomor telepon/akun dengan riwayat penolakan COD tinggi — blokir otomatis atau soft warning?
3. Siapa yang bertanggung jawab menangani insiden keamanan (internal dedicated, atau outsource ke penyedia jasa keamanan)?
4. Apakah toko akan menyimpan data kartu pembeli sendiri, atau sepenuhnya mendelegasikan ke payment gateway (direkomendasikan untuk menghindari beban kepatuhan PCI DSS)?

## Konteks Indonesia

- COD abuse adalah risiko operasional yang cukup umum di Indonesia karena tingginya adopsi COD; toko perlu strategi mitigasi yang seimbang antara mengurangi risiko dan tidak menghalangi pembeli sah yang lebih nyaman bayar tunai.
- Kewajiban UU PDP membuat penanganan insiden kebocoran data bukan sekadar praktik baik tapi kewajiban hukum dengan tenggat waktu notifikasi (lihat [11-legal-compliance.md](11-legal-compliance.md)).

## Referensi

- Praktik umum fraud prevention e-commerce, dengan perhatian khusus pada risiko COD abuse yang relevan di pasar Indonesia.
