# 12. Analytics & KPI (Metrik Bisnis)

## Ringkasan

Dokumen ini mencakup metrik yang perlu dipantau untuk mengukur kesehatan bisnis e-commerce dan sumber datanya di masing-masing flow. Analytics bukan flow transaksional tersendiri, tapi lapisan pengukuran yang menyilang semua dokumen lain.

## Aktor yang Terlibat

- **Pemilik bisnis/manajemen** — pengambil keputusan strategis
- **Tim marketing** — memantau performa akuisisi
- **Tim operasional** — memantau efisiensi fulfillment & CS

## Kategori Metrik & Sumber Data

### 1. Metrik Akuisisi & Trafik (sumber: [01-customer-journey.md](01-customer-journey.md))
- **Traffic** — jumlah pengunjung, sumber trafik (organik, paid, sosial, direct)
- **Conversion rate** — persentase visitor yang jadi pembeli
- **CAC (Customer Acquisition Cost)** — biaya marketing dibagi jumlah pembeli baru
- **Bounce rate** — persentase visitor yang keluar tanpa interaksi lanjut

### 2. Metrik Funnel & Checkout (sumber: [03-cart-checkout.md](03-cart-checkout.md))
- **Cart abandonment rate** — persentase yang menambah cart tapi tidak checkout
- **Checkout completion rate** — persentase yang mulai checkout sampai selesai bayar

### 3. Metrik Penjualan (sumber: [06-order-management.md](06-order-management.md), [10-finance-accounting.md](10-finance-accounting.md))
- **GMV (Gross Merchandise Value)** — total nilai transaksi
- **Revenue (net)** — pendapatan setelah dikurangi diskon/refund
- **AOV (Average Order Value)** — rata-rata nilai per order
- **Jumlah order & unit terjual**
- **Gross margin** — revenue dikurangi COGS

### 4. Metrik Produk & Katalog (sumber: [02-catalog-inventory.md](02-catalog-inventory.md))
- **Best seller / produk terlaris**
- **Sell-through rate** — persentase stok yang terjual dalam periode tertentu
- **Stockout rate** — seberapa sering produk kehabisan stok

### 5. Metrik Fulfillment (sumber: [05-shipping-fulfillment.md](05-shipping-fulfillment.md))
- **Waktu proses order** (dari paid sampai shipped)
- **SLA pengiriman terpenuhi** — persentase order yang sampai sesuai estimasi
- **Biaya ongkir rata-rata per order**

### 6. Metrik Retensi & Loyalty (sumber: [09-marketing-promotion.md](09-marketing-promotion.md))
- **Repeat purchase rate** — persentase pembeli yang belanja lebih dari sekali
- **Customer Lifetime Value (CLV)**
- **Churn rate** — pembeli yang berhenti transaksi
- **Retention rate per kohort**

### 7. Metrik Retur & Kepuasan (sumber: [07-returns-refunds.md](07-returns-refunds.md), [08-customer-service.md](08-customer-service.md))
- **Return rate** — persentase order yang diretur
- **CSAT (Customer Satisfaction Score)**
- **NPS (Net Promoter Score)**
- **Waktu resolusi tiket CS rata-rata**

### 8. Metrik Keuangan (sumber: [10-finance-accounting.md](10-finance-accounting.md))
- **Cash flow**
- **Fee payment gateway sebagai persentase revenue**
- **Profitabilitas per kategori produk**

## Alur Step-by-Step (Bagaimana Metrik Dipakai)

1. **Pengumpulan data** — setiap event penting (visit, add to cart, checkout, order paid, shipped, delivered, retur) dicatat dengan timestamp & konteks
2. **Agregasi & dashboard** — data diringkas jadi dashboard harian/mingguan/bulanan untuk masing-masing peran (marketing lihat CAC/conversion, operasional lihat SLA fulfillment, manajemen lihat revenue/margin)
3. **Analisis tren** — bandingkan periode (week-over-week, bulan-ke-bulan, musiman)
4. **Actionable insight** — misal cart abandonment tinggi → trigger campaign reminder ([09-marketing-promotion.md](09-marketing-promotion.md)); return rate tinggi di produk tertentu → investigasi kualitas produk ([02-catalog-inventory.md](02-catalog-inventory.md))

## Edge Case & Pengecualian

- **Data tidak konsisten antar sistem** (misal jumlah order di dashboard beda dengan payment gateway) — perlu single source of truth yang jelas
- **Metrik yang menyesatkan tanpa konteks** — misal revenue naik tapi margin turun karena diskon berlebihan; perlu selalu melihat metrik berpasangan (revenue + margin, bukan revenue saja)
- **Event tracking hilang** (misal karena ad blocker, cookie consent ditolak) — perlu strategi tracking yang tidak sepenuhnya bergantung pada client-side script

## Keputusan Bisnis yang Perlu Diambil

1. Metrik mana yang jadi prioritas utama untuk dipantau di dashboard awal (biasanya: revenue, order, conversion rate, return rate)?
2. Apakah butuh tools analytics pihak ketiga (Google Analytics, Meta Pixel, Mixpanel) sejak awal, atau cukup laporan internal dari sistem toko?
3. Siapa yang bertanggung jawab me-review metrik secara rutin dan mengambil tindakan dari insight yang muncul?

## Konteks Indonesia

- Perlu memperhitungkan cookie consent & regulasi privasi (UU PDP, lihat [11-legal-compliance.md](11-legal-compliance.md)) dalam desain tracking analytics — consent pengguna harus diminta secara eksplisit.
- Pola belanja musiman Indonesia (gajian awal/tanggal muda, periode promo besar tahunan, Ramadan/Lebaran) menciptakan fluktuasi metrik yang perlu dianalisis dengan konteks musiman, bukan dibandingkan linear antar bulan.

## Referensi

- Praktik umum e-commerce analytics & KPI framework (funnel metrics, retention metrics, financial metrics), disesuaikan konteks pola belanja musiman Indonesia.
