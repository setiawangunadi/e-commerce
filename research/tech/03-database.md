# 03. Database

## Ringkasan

Dokumen ini membahas pilihan database dan pendekatan pengelolaan data untuk menyimpan seluruh entitas bisnis: produk, stok, order, pembayaran, pelanggan, dll. — implementasi teknis dari [research/business/02-catalog-inventory.md](../business/02-catalog-inventory.md) dan [research/business/06-order-management.md](../business/06-order-management.md).

## Rekomendasi Utama

**PostgreSQL** sebagai database utama, dengan **Prisma ORM**.

Alasan PostgreSQL:
- Relasional dan ACID-compliant — penting untuk data transaksional seperti order, pembayaran, dan stok yang butuh konsistensi kuat (tidak boleh ada dua order yang sama-sama "berhasil" mengambil unit stok terakhir, lihat edge case overselling di [research/business/02-catalog-inventory.md](../business/02-catalog-inventory.md)).
- Mendukung tipe data lanjutan (JSONB untuk atribut produk yang fleksibel per kategori, array, full-text search dasar) tanpa perlu database terpisah untuk kasus sederhana.
- Ekosistem hosting managed luas (Railway, Supabase, Neon, RDS) dengan harga bersaing.

Alasan Prisma ORM:
- Skema deklaratif (`schema.prisma`) yang mudah dibaca, berfungsi sebagai dokumentasi struktur data yang selalu up to date.
- Migration otomatis menghasilkan file SQL yang bisa direview sebelum dijalankan — penting untuk perubahan skema yang aman di data produksi.
- Prisma Client memberi autocomplete & type-safety penuh di TypeScript, mengurangi bug runtime akibat typo nama kolom.
- Prisma versi terbaru (v7) sudah lepas dari dependency Rust binary, query lebih cepat dan bundle lebih kecil — cocok untuk deployment serverless/edge jika dibutuhkan nanti.

## Area Skema Data Inti (mengikuti domain bisnis)

| Domain | Entitas Utama | Referensi Bisnis |
|---|---|---|
| Katalog | Product, ProductVariant, Category, Inventory | [02-catalog-inventory.md](../business/02-catalog-inventory.md) |
| Pelanggan | Customer, Address | [03-cart-checkout.md](../business/03-cart-checkout.md) |
| Transaksi | Cart, CartItem, Order, OrderItem, OrderStatusHistory | [06-order-management.md](../business/06-order-management.md) |
| Pembayaran | Payment, PaymentMethod, RefundRequest | [04-payment.md](../business/04-payment.md) |
| Pengiriman | Shipment, ShippingRate, TrackingEvent | [05-shipping-fulfillment.md](../business/05-shipping-fulfillment.md) |
| Promosi | Voucher, Promotion, LoyaltyPoint | [09-marketing-promotion.md](../business/09-marketing-promotion.md) |
| Retur | ReturnRequest, ReturnItem | [07-returns-refunds.md](../business/07-returns-refunds.md) |

## Prinsip Desain Skema

- **Audit trail wajib** untuk entitas kritis (Order, Payment) — jangan hanya menyimpan status terkini, tapi juga riwayat perubahan (`OrderStatusHistory`) agar bisa menjawab dispute/komplain (lihat [research/business/08-customer-service.md](../business/08-customer-service.md)).
- **Soft delete** untuk Product & Customer (kolom `deletedAt`), bukan hard delete — data historis order tetap harus merujuk ke produk yang sudah didiskontinu.
- **Stock reservation** dimodelkan eksplisit (tabel `StockReservation` dengan `expiresAt`), bukan hanya mengurangi angka stok langsung — memudahkan pelepasan reservasi otomatis saat checkout timeout (lihat [research/business/03-cart-checkout.md](../business/03-cart-checkout.md)).
- Gunakan **database transaction** (Prisma `$transaction`) untuk operasi yang harus atomik, misalnya: kurangi stok + buat order item + catat riwayat status dalam satu transaksi.
- Index pada kolom yang sering difilter: `Order.status`, `Order.customerId`, `Product.categoryId`, `Product.sku`.

## Caching Layer: Redis

**Redis** digunakan sebagai lapisan cache untuk mengurangi beban query berulang ke PostgreSQL:
- **Cache-aside** untuk data yang jarang berubah: halaman produk, kategori (TTL 5–10 menit).
- **Write-through** untuk data yang harus selalu konsisten: stok & harga — begitu diupdate di database, cache langsung diperbarui juga agar tidak terjadi "Stale Price Incident" (kasus nyata: pembeli melihat harga lama karena cache tidak ter-invalidate setelah update manual).
- Session storage untuk pembeli yang login (lebih cepat dibanding query database tiap request).
- Rate limiting (misal batasi percobaan login) memakai Redis counter dengan TTL.
- Redis juga dipakai sebagai backend untuk job queue (lihat [02-backend-api.md](02-backend-api.md)).

## Kapan Butuh Search Engine Terpisah

PostgreSQL punya full-text search bawaan yang cukup untuk skala kecil, tapi untuk pengalaman pencarian produk yang baik (typo-tolerance, filter facet, ranking relevansi) sebaiknya pakai search engine khusus — lihat [07-search-catalog.md](07-search-catalog.md).

## Keputusan Teknis yang Perlu Diambil

1. Managed PostgreSQL mana yang dipakai (lihat [08-infrastructure-hosting.md](08-infrastructure-hosting.md) untuk perbandingan)?
2. Apakah butuh read replica sejak awal, atau cukup satu instance sampai traffic bertumbuh?
3. Strategi backup & disaster recovery — seberapa sering snapshot, berapa lama retention?
4. Apakah data sensitif (misal nomor telepon, alamat) perlu enkripsi tambahan di level kolom untuk kepatuhan UU PDP (lihat [research/business/11-legal-compliance.md](../business/11-legal-compliance.md))?

## Referensi

- [How to Setup Prisma v7 with PostgreSQL in Node.js (2026)](https://medium.com/@manendrav/how-to-setup-prisma-v7-with-postgresql-in-node-js-2026-a187f749dac4)
- [Mastering Redis Cache: From Basic to Advanced (2026 Guide)](https://www.dragonflydb.io/guides/mastering-redis-cache-from-basic-to-advanced)
- Praktik cache-aside + write-through untuk data katalog vs data stok/harga pada sistem e-commerce.
