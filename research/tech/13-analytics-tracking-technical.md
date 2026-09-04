# 13. Analytics & Tracking (Teknis)

## Ringkasan

Dokumen ini membahas implementasi teknis pelacakan data untuk mendukung metrik bisnis di [research/business/12-analytics-kpi.md](../business/12-analytics-kpi.md) — bagaimana event ditangkap, disimpan, dan disajikan sebagai dashboard.

## Web Analytics: Google Analytics 4 + Server-Side Tracking

- **GA4** untuk analytics dasar (trafik, sumber akuisisi, conversion funnel) — gratis, standar industri, terintegrasi baik dengan Google Ads untuk mengukur ROI campaign.
- **Meta Pixel** untuk mengukur performa iklan Facebook/Instagram (relevan sebagai kanal akuisisi di [research/business/01-customer-journey.md](../business/01-customer-journey.md)).
- Pertimbangkan **server-side tracking** (via Google Tag Manager Server-Side atau event API langsung dari backend) untuk event kritis seperti `purchase` — lebih akurat dibanding client-side tracking yang bisa terblokir ad blocker, dan lebih tahan terhadap perubahan kebijakan cookie pihak ketiga browser.

## Event Tracking Plan

Definisikan event standar yang dikirim di titik-titik kunci funnel (selaras dengan [research/business/01-customer-journey.md](../business/01-customer-journey.md) s.d. [research/business/06-order-management.md](../business/06-order-management.md)):

| Event | Trigger | Data Terkait |
|---|---|---|
| `view_item` | Pembeli membuka halaman produk | product_id, price, category |
| `add_to_cart` | Tambah produk ke keranjang | product_id, variant, quantity |
| `begin_checkout` | Mulai proses checkout | cart_value, item_count |
| `add_shipping_info` | Pilih metode pengiriman | shipping_method, cost |
| `add_payment_info` | Pilih metode pembayaran | payment_method |
| `purchase` | Order berhasil dibayar | order_id, total, items |
| `refund` | Refund diproses | order_id, refund_amount |

## Internal Analytics (Data Bisnis, Bukan Hanya Marketing)

GA4 baik untuk analytics marketing, tapi metrik operasional bisnis (lihat tabel lengkap di [research/business/12-analytics-kpi.md](../business/12-analytics-kpi.md)) sebaiknya dihitung langsung dari **database transaksional sendiri** (PostgreSQL), bukan bergantung pada tool pihak ketiga:
- GMV, AOV, return rate, sell-through rate — dihitung via query/scheduled job dari data order/produk yang sudah akurat 100% (bukan estimasi dari sampling tracking pihak ketiga).
- Dashboard internal (misal dibangun dengan **Metabase** atau **Retool**, open-source/self-hosted, mudah dikoneksikan langsung ke PostgreSQL) untuk visualisasi metrik operasional harian tanpa perlu development custom dashboard dari nol.

## Cookie Consent & Kepatuhan UU PDP

Terkait [research/business/11-legal-compliance.md](../business/11-legal-compliance.md):
- Cookie consent banner yang meminta persetujuan eksplisit sebelum tracking pihak ketiga (GA4, Meta Pixel) aktif — bukan default opt-in diam-diam.
- Pisahkan cookie yang **esensial** (session, cart) yang tidak butuh consent, dari cookie **analytics/marketing** yang butuh consent eksplisit.
- Simpan catatan (log) kapan & bagaimana consent diberikan, sebagai bukti kepatuhan jika suatu saat diaudit.

## Search & Behavior Analytics

- Data pencarian internal (query yang dicari, yang tidak menemukan hasil) dari Meilisearch ([07-search-catalog.md](07-search-catalog.md)) — pantau sebagai sumber insight katalog yang perlu diperbaiki (lihat [research/business/12-analytics-kpi.md](../business/12-analytics-kpi.md)).
- Untuk analisis perilaku lebih dalam (heatmap, session recording), pertimbangkan tool seperti Microsoft Clarity (gratis) di fase awal sebelum berinvestasi ke tool berbayar.

## Keputusan Teknis yang Perlu Diambil

1. Apakah server-side tracking dibangun sejak awal, atau client-side tracking (GTM) dulu untuk kecepatan implementasi?
2. Metabase/Retool untuk dashboard internal, atau dashboard admin custom dibangun sendiri di aplikasi?
3. Bagaimana desain cookie consent banner agar tetap sederhana tapi patuh UU PDP?

## Referensi

- Praktik umum event tracking plan e-commerce dan pertimbangan server-side tracking untuk akurasi data purchase, dikombinasikan dengan kebutuhan kepatuhan UU PDP dari riset bisnis legal & compliance.
