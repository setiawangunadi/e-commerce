# 09. Object Storage, CDN & Media

## Ringkasan

Dokumen ini membahas penyimpanan & pengiriman aset media (foto/video produk) — komponen teknis krusial karena kualitas media produk berdampak langsung ke konversi (lihat [research/business/01-customer-journey.md](../business/01-customer-journey.md) dan [research/business/02-catalog-inventory.md](../business/02-catalog-inventory.md)).

## Rekomendasi Utama

**Cloudflare R2** untuk object storage, dikombinasikan dengan **Cloudflare Images** atau optimasi bawaan `next/image` untuk transformasi gambar.

## Perbandingan Object Storage

| | Cloudflare R2 | AWS S3 |
|---|---|---|
| Biaya storage | $0.015/GB/bulan | $0.023/GB/bulan |
| Biaya egress (transfer keluar ke pengguna) | **$0 (gratis)** | $0.09/GB setelah 100GB gratis pertama |
| Free tier | 10GB storage + 1jt/10jt operasi | 5GB (12 bulan pertama saja) |
| Kompatibilitas | S3-compatible API — mudah migrasi dari/ke S3 | Standar industri |

**Kenapa R2 jadi pilihan tepat untuk e-commerce:** biaya egress adalah faktor dominan untuk situs yang menyajikan banyak gambar produk ke pengunjung — S3 mengenakan biaya tiap gambar yang di-load pengguna, sementara R2 gratis. Untuk workload yang menyajikan 2TB gambar/bulan ke browser, biaya bisa berbeda drastis (estimasi ~$30 di R2 vs ~$175 di S3 untuk volume setara).

## Strategi Pengelolaan Media

1. **Upload** — admin upload foto produk melalui dashboard admin ([research/business/02-catalog-inventory.md](../business/02-catalog-inventory.md)), file dikirim langsung ke R2 (via presigned URL agar tidak membebani server backend dengan traffic upload file besar).
2. **Optimasi otomatis** — resize ke beberapa ukuran (thumbnail, medium, full) dan convert ke format modern (WebP/AVIF) saat upload atau on-the-fly via `next/image`.
3. **Delivery via CDN** — Cloudflare sebagai layer di depan R2 memberi caching edge global, mempercepat load gambar untuk pengguna di berbagai wilayah Indonesia.
4. **Lazy loading** — gambar di bawah fold (misal grid produk yang panjang) dimuat saat akan terlihat, bukan sekaligus di awal — mengurangi beban halaman awal dan mempercepat Core Web Vitals (lihat [01-frontend.md](01-frontend.md)).

## Struktur Penyimpanan

- Organisasi folder per entitas: `products/{productId}/{variantId}/`, `reviews/{orderId}/` (untuk foto ulasan pembeli, lihat [research/business/01-customer-journey.md](../business/01-customer-journey.md)), `returns/{returnId}/` (untuk bukti foto retur, lihat [research/business/07-returns-refunds.md](../business/07-returns-refunds.md)).
- Simpan metadata file (URL, ukuran, dimensi, alt text untuk SEO/aksesibilitas) di database, bukan hanya mengandalkan struktur folder storage.

## Video Produk (Opsional)

Untuk video demo produk (relevan di [research/business/01-customer-journey.md](../business/01-customer-journey.md) sebagai elemen yang memengaruhi keputusan beli):
- Video umumnya lebih baik dihosting di layanan khusus streaming (misal Cloudflare Stream, atau embed dari YouTube/TikTok jika konten sudah ada di sana) dibanding disajikan langsung dari object storage — mengurangi beban bandwidth dan memberi adaptive bitrate streaming otomatis.

## Keputusan Teknis yang Perlu Diambil

1. Cloudflare R2 dipakai murni untuk storage, atau juga pakai Cloudflare Images untuk transformasi otomatis (biaya tambahan tapi lebih praktis)?
2. Berapa banyak ukuran/varian gambar yang di-generate per foto produk?
3. Apakah video produk didukung sejak MVP, atau menyusul?

## Referensi

- [Cloudflare R2 Pricing vs S3 vs B2: $0 Egress (2026)](https://tech-insider.org/cloudflare-r2-vs-s3-vs-backblaze-b2-2026/)
- [Cloudflare R2 vs Amazon S3: Which Object Storage Is Better for Cost, Performance, and Scalability in 2026?](https://www.jasminshukla.com/blog/cloudflare-r2-vs-amazon-s3-object-storage-comparison)
