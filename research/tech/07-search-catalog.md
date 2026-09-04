# 07. Search Engine untuk Katalog Produk

## Ringkasan

Dokumen ini membahas teknologi pencarian produk (search & filter) — implementasi teknis dari kebutuhan discovery di [research/business/01-customer-journey.md](../business/01-customer-journey.md) (search internal, filter & sort).

## Rekomendasi Utama

**Meilisearch**, dengan **Typesense** sebagai alternatif kuat.

| | Meilisearch | Typesense | Algolia |
|---|---|---|---|
| Model harga | Self-hosted gratis; Cloud mulai ~$59/bulan (250rb records) | Self-hosted gratis; Cloud mulai $29.99/bulan | Free tier 10rb search/1jt records; berbayar $0.50/1000 search, Grow plan mulai $550/bulan |
| Kecocokan e-commerce | Instant search, typo-tolerance, ranking yang bisa dikustomisasi | Sangat cepat, fitur serupa Algolia dengan setup lebih sederhana | Fitur paling lengkap termasuk personalisasi AI, tapi biaya naik cepat seiring skala |
| Kesulitan setup | Mudah, dokumentasi baik | Mudah, dev experience mirip Algolia | Mudah tapi terkunci ke platform mereka |

**Kenapa Meilisearch untuk single-store MVP:** fitur inti yang dibutuhkan (instant search, typo-tolerance, filter facet, custom ranking) sudah cukup untuk skala satu toko, bisa di-self-host gratis di server yang sama dengan aplikasi (mengurangi biaya operasional dibanding Algolia yang bisa jadi mahal saat traffic bertumbuh).

## Data yang Diindeks

Mengikuti struktur produk di [research/business/02-catalog-inventory.md](../business/02-catalog-inventory.md):
- Nama produk, deskripsi, brand, kategori
- Atribut varian (warna, ukuran, material) sebagai filterable attributes
- Harga (untuk filter rentang harga & sorting)
- Status stok (untuk filter "hanya tampilkan yang ready stock")
- Rating & jumlah ulasan (untuk sorting "paling laris"/"rating tertinggi")

## Sinkronisasi Data: Database → Search Index

Search engine bukan sumber data utama (source of truth tetap PostgreSQL) — perlu strategi sinkronisasi:
- **Event-driven** — setiap kali produk dibuat/diupdate/stok berubah di database, trigger job (via BullMQ, lihat [02-backend-api.md](02-backend-api.md)) yang mengupdate dokumen terkait di index Meilisearch.
- Hindari re-index seluruh katalog di setiap perubahan kecil — cukup update dokumen spesifik yang berubah.
- Untuk perubahan skema besar (misal restrukturisasi kategori), sediakan script re-index penuh yang bisa dijalankan manual saat dibutuhkan.

## Fitur Pencarian yang Didukung

- **Instant search** dengan debounce di frontend — hasil muncul saat mengetik tanpa perlu klik "cari"
- **Typo tolerance** — penting karena pengguna mobile Indonesia sering mengetik cepat/typo
- **Filter facet** — kategori, rentang harga, ukuran, warna, rating (checkbox filter di sidebar/bottom sheet mobile)
- **Sorting** — relevansi (default), harga terendah/tertinggi, terbaru, terlaris
- **Zero-result fallback** — saat pencarian tidak ada hasil, tampilkan saran kategori/produk populer (lihat edge case di [research/business/01-customer-journey.md](../business/01-customer-journey.md))
- **Search analytics** — catat query yang sering dicari & yang sering tidak menemukan hasil, sebagai input perbaikan katalog (lihat [research/business/12-analytics-kpi.md](../business/12-analytics-kpi.md))

## Keputusan Teknis yang Perlu Diambil

1. Self-hosted Meilisearch (lebih murah, perlu maintain sendiri) atau Meilisearch Cloud (managed, ada biaya bulanan)?
2. Apakah butuh personalisasi hasil pencarian berbasis histori pembeli sejak awal, atau relevansi standar dulu?
3. Berapa sering sinkronisasi index dijalankan — real-time per perubahan, atau batch berkala?

## Referensi

- [Algolia vs Typesense vs Meilisearch: Which Search Engine? — Meilisearch](https://www.meilisearch.com/blog/algolia-vs-typesense)
- [Search Pricing Comparison (2026) — BuildMVPFast](https://www.buildmvpfast.com/api-costs/search)
- [Typesense vs Algolia vs Elasticsearch vs Meilisearch](https://typesense.org/typesense-vs-algolia-vs-elasticsearch-vs-meilisearch/)
