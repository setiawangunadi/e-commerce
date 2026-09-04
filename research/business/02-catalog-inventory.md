# 02. Manajemen Katalog Produk & Inventaris

## Ringkasan

Dokumen ini mencakup bagaimana produk dikelola di sisi bisnis (admin toko) — mulai dari produk masuk katalog, penetapan harga, varian, sampai stok tersedia untuk dijual. Ini adalah fondasi data yang dipakai di seluruh flow lain: ditampilkan ke pembeli ([01-customer-journey.md](01-customer-journey.md)), dikunci saat checkout ([03-cart-checkout.md](03-cart-checkout.md)), dan dikurangi saat order diproses ([06-order-management.md](06-order-management.md)).

## Aktor yang Terlibat

- **Admin/staf produk** — input & maintain data produk
- **Staf gudang** — update stok fisik
- **Sistem katalog** — mesin pencarian, indexing, kalkulasi harga
- **Pembeli** — konsumen data ini (read-only di sisi mereka)

## Alur Step-by-Step

### 1. Product Onboarding (produk baru masuk katalog)
- Input data dasar: nama, deskripsi, kategori, brand, SKU
- Upload media: foto (multi-angle), video, ukuran gambar sesuai standar tampilan
- Tentukan varian: warna, ukuran, kombinasi (misal Merah-L, Merah-XL) — tiap kombinasi varian punya SKU sendiri
- Tentukan harga jual, harga coret (jika ada diskon), dan margin/HPP (harga pokok penjualan) untuk kalkulasi profitabilitas
- Tentukan berat & dimensi produk (wajib untuk kalkulasi ongkir, lihat [05-shipping-fulfillment.md](05-shipping-fulfillment.md))
- Tentukan kategori pajak jika relevan (barang kena PPN atau tidak)
- Set status: draft → published (tampil di katalog) → archived/discontinued

### 2. Stock Management (manajemen stok)
- **Stock in** — barang masuk dari supplier/produksi, dicatat sebagai penambahan stok
- **Stock reservation** — saat pembeli checkout, stok "dikunci sementara" agar tidak oversold sebelum pembayaran selesai (lihat interaksi dengan [03-cart-checkout.md](03-cart-checkout.md) dan [04-payment.md](04-payment.md))
- **Stock out** — pengurangan stok setelah order dikonfirmasi/dibayar
- **Stock adjustment** — koreksi manual (barang rusak, hilang, selisih stock opname)
- **Low stock alert** — notifikasi ke admin saat stok mendekati ambang minimum
- **Multi-gudang (jika berlaku)** — jika toko punya lebih dari satu lokasi gudang, perlu logika alokasi stok per lokasi dan pemilihan gudang terdekat/termurah saat fulfillment

### 3. Pricing Management
- Harga dasar per varian
- Harga promo/diskon dengan periode aktif (lihat [09-marketing-promotion.md](09-marketing-promotion.md) untuk mekanisme promo lebih detail)
- Harga grosir/tiered pricing (opsional, jika ada skema beli banyak lebih murah)
- Update harga massal (bulk update) untuk efisiensi operasional

### 4. Katalog & Discoverability
- Kategorisasi & taxonomy produk (struktur kategori/sub-kategori)
- Atribut produk untuk filter (ukuran, warna, material, dsb.)
- SEO metadata per produk (title tag, meta description, URL slug) — menyambung ke [01-customer-journey.md](01-customer-journey.md) soal organic search
- Produk terkait / cross-sell / bundling manual

### 5. Product Lifecycle
- Produk baru → aktif dijual → stok habis (tetap tampil dengan status "habis" atau disembunyikan?) → didiskontinu → dihapus/diarsipkan
- Riwayat perubahan harga & stok untuk audit

## Edge Case & Pengecualian

- **Overselling** — dua pembeli checkout produk terakhir bersamaan; perlu mekanisme locking/reservation stok yang atomik
- **Stok berubah saat pembeli sedang di halaman checkout** — perlu re-validasi stok tepat sebelum pembayaran diproses
- **Produk dengan banyak varian tapi hanya sebagian yang habis** — UI harus menunjukkan varian mana yang tersedia
- **Produk pre-order** — dijual sebelum stok fisik tersedia, dengan estimasi tanggal kirim berbeda dari produk ready stock
- **Produk musiman/limited edition** — perlu status khusus agar tidak restock otomatis
- **Kesalahan input harga oleh admin** — perlu approval/review sebelum harga baru live, terutama untuk perubahan harga drastis

## Keputusan Bisnis yang Perlu Diambil

1. Apakah produk habis stok tetap ditampilkan di katalog (dengan badge "Habis") atau disembunyikan otomatis?
2. Berapa lama durasi stock reservation saat checkout (misal 15-30 menit) sebelum stok dilepas kembali jika pembayaran tidak selesai?
3. Apakah butuh dukungan pre-order sejak awal?
4. Apakah toko punya lebih dari satu gudang/lokasi stok, atau cukup satu sumber stok terpusat?
5. Apakah harga ditampilkan sudah termasuk PPN atau terpisah?
6. Siapa yang punya wewenang mengubah harga (semua admin atau perlu approval untuk perubahan besar)?

## Konteks Indonesia

- Barang kena pajak (BKP) di Indonesia umumnya dikenai PPN 11% (per aturan berlaku saat ini) — perlu keputusan apakah harga listing sudah termasuk PPN (umum untuk B2C) atau ditambahkan terpisah (umum untuk B2B). Detail di [11-legal-compliance.md](11-legal-compliance.md) dan [10-finance-accounting.md](10-finance-accounting.md).
- Preferensi pembeli Indonesia terhadap foto/video produk yang detail dan ulasan visual tinggi — investasi di kualitas media produk berdampak langsung ke konversi (lihat [01-customer-journey.md](01-customer-journey.md)).
- Jika berat/dimensi produk tidak akurat, dapat menyebabkan selisih ongkir yang merugikan toko saat integrasi dengan API kurir (lihat [05-shipping-fulfillment.md](05-shipping-fulfillment.md)).

## Referensi

- Praktik umum manajemen katalog & inventaris e-commerce, disesuaikan dengan kebutuhan single-store di pasar Indonesia.
