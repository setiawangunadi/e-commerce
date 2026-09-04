# 00. Overview — Peta Riset Bisnis E-Commerce End-to-End

## Tentang Riset Ini

Riset ini disusun untuk memetakan seluruh alur bisnis e-commerce **single-store/vendor** (satu brand menjual produk sendiri, bukan marketplace multi-vendor) dengan target pasar **Indonesia**, sebagai dasar sebelum masuk ke tahap desain fitur & teknis. Setiap dokumen membahas satu area bisnis secara mendalam: aktor yang terlibat, alur step-by-step, edge case, keputusan bisnis yang perlu diambil, dan konteks spesifik Indonesia.

## Peta Alur Bisnis End-to-End

```
AWARENESS & DISCOVERY
   └─ 01. Customer Journey (SEO, ads, social, browsing, product decision)
        │
        ▼
KATALOG & DATA PRODUK (fondasi yang dipakai sepanjang funnel)
   └─ 02. Catalog & Inventory (produk, varian, harga, stok)
        │
        ▼
TRANSAKSI
   ├─ 03. Cart & Checkout (keranjang, alamat, ongkir, voucher, order review)
   ├─ 04. Payment (VA, e-wallet, QRIS, kartu, COD, paylater, rekonsiliasi)
        │
        ▼
FULFILLMENT
   ├─ 05. Shipping & Fulfillment (packing, kurir, tracking, delivery)
   ├─ 06. Order Management (lifecycle status order, operasional admin)
        │
        ▼
AFTER-SALES
   ├─ 07. Returns & Refunds (retur, refund, garansi)
   ├─ 08. Customer Service (live chat, WA, komplain, dispute)
        │
        ▼
PERTUMBUHAN & RETENSI
   └─ 09. Marketing & Promotion (promo, loyalty, referral, retensi)

LAPISAN PENDUKUNG (menyilang semua flow di atas)
   ├─ 10. Finance & Accounting (rekonsiliasi, invoice, pajak, laporan)
   ├─ 11. Legal & Compliance (PSE, UU PDP, UU Perlindungan Konsumen, pajak)
   ├─ 12. Analytics & KPI (metrik bisnis lintas seluruh funnel)
   ├─ 13. Security & Fraud Prevention (keamanan akun, payment fraud, abuse)
   └─ 14. Omnichannel (marketplace, social commerce, WhatsApp, offline)
```

## Ringkasan Tiap Dokumen

| # | Dokumen | Inti Pembahasan |
|---|---------|------------------|
| 01 | [Customer Journey](01-customer-journey.md) | Perjalanan calon pembeli dari awareness (SEO/ads/sosial) sampai keputusan beli, sebelum masuk cart |
| 02 | [Catalog & Inventory](02-catalog-inventory.md) | Manajemen produk, varian, harga, dan stok — fondasi data yang dipakai di seluruh funnel |
| 03 | [Cart & Checkout](03-cart-checkout.md) | Alur keranjang, guest checkout, alamat, pemilihan ongkir, voucher, hingga order dibuat |
| 04 | [Payment](04-payment.md) | Metode pembayaran Indonesia (VA, e-wallet, QRIS, kartu, COD, paylater), verifikasi, dan penanganan kegagalan |
| 05 | [Shipping & Fulfillment](05-shipping-fulfillment.md) | Kalkulasi ongkir, packing, integrasi kurir, tracking, sampai barang diterima pembeli |
| 06 | [Order Management](06-order-management.md) | Lifecycle status order lengkap dan tooling operasional admin untuk mengelola pesanan |
| 07 | [Returns & Refunds](07-returns-refunds.md) | Pengajuan retur, quality check, refund/tukar barang, klaim garansi |
| 08 | [Customer Service](08-customer-service.md) | Kanal support (live chat, WhatsApp, email), ticketing, dan penyelesaian dispute |
| 09 | [Marketing & Promotion](09-marketing-promotion.md) | Mekanisme promo/voucher, loyalty program, referral, dan strategi retensi pelanggan |
| 10 | [Finance & Accounting](10-finance-accounting.md) | Settlement pembayaran, rekonsiliasi, invoice, cost tracking, dan pelaporan keuangan |
| 11 | [Legal & Compliance](11-legal-compliance.md) | Kewajiban NIB, PSE Kominfo, UU PDP, UU Perlindungan Konsumen, dan pajak e-commerce |
| 12 | [Analytics & KPI](12-analytics-kpi.md) | Metrik bisnis kunci (GMV, AOV, conversion rate, retention, return rate) dan sumber datanya |
| 13 | [Security & Fraud Prevention](13-security-fraud.md) | Keamanan akun, fraud pembayaran, penyalahgunaan promo/COD, dan insiden data |
| 14 | [Omnichannel](14-omnichannel.md) | Hubungan website dengan marketplace, social commerce, WhatsApp, dan toko fisik |

## Bagaimana Menggunakan Riset Ini

1. **Sebagai checklist requirement** — setiap "Keputusan Bisnis yang Perlu Diambil" di tiap dokumen adalah pertanyaan yang idealnya dijawab pemilik bisnis sebelum tim mulai desain fitur/teknis, agar tidak ada asumsi yang salah di tengah pengembangan.
2. **Sebagai peta ketergantungan** — dokumen-dokumen saling terhubung (linked). Contoh: perubahan status pembayaran di [04-payment.md](04-payment.md) memicu perubahan status order di [06-order-management.md](06-order-management.md), yang lalu memicu proses fulfillment di [05-shipping-fulfillment.md](05-shipping-fulfillment.md). Memahami sambungan ini penting agar sistem yang dibangun nanti tidak memperlakukan tiap flow sebagai pulau terpisah.
3. **Sebagai dasar MVP scoping** — tidak semua yang dibahas perlu ada di versi pertama. Gunakan bagian "Keputusan Bisnis" di tiap dokumen untuk memutuskan mana yang wajib di MVP (misal: payment dasar, checkout, order management) vs yang bisa menyusul (misal: loyalty program, omnichannel, analytics lanjutan).

## Prinsip Konteks Indonesia yang Berulang di Banyak Dokumen

- **Mobile-first & WhatsApp-first** — mayoritas trafik dan komunikasi pelanggan terjadi lewat mobile dan WhatsApp, bukan desktop/email.
- **QRIS & e-wallet sebagai metode pembayaran default**, dengan COD tetap relevan di luar kota besar.
- **Kepercayaan (trust) adalah hambatan utama** bagi toko non-marketplace — legalitas usaha, kebijakan retur yang jelas, dan ulasan asli sangat memengaruhi konversi.
- **Regulasi bergerak dinamis** (PSE Kominfo, pajak e-commerce, UU PDP) — riset ini adalah gambaran per Agustus 2026 dan perlu di-review berkala, bukan referensi statis selamanya.
- **Geografi kepulauan** memengaruhi variasi biaya & waktu kirim secara signifikan antar wilayah.

## Catatan Batasan Riset

- Riset ini fokus pada **alur bisnis di sisi website**, bukan spesifikasi teknis/arsitektur sistem (itu adalah tahap desain berikutnya).
- Dokumen [11-legal-compliance.md](11-legal-compliance.md) bukan pengganti nasihat hukum profesional — disarankan konsultasi lebih lanjut sebelum go-live.
- Beberapa data (payment gateway, kurir, regulasi pajak) diverifikasi lewat pencarian web per Agustus 2026 dan tercantum sumbernya di tiap dokumen terkait; sisanya berdasarkan praktik umum industri e-commerce yang relatif stabil dari waktu ke waktu.
