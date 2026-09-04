# 03. Cart & Checkout Flow

## Ringkasan

Dokumen ini mencakup proses dari pembeli menambahkan produk ke keranjang, sampai mereka menyelesaikan pemesanan dan siap membayar. Ini adalah titik kritis dalam funnel — mayoritas cart abandonment (pembeli batal beli) terjadi di tahap ini. Menyambung dari [01-customer-journey.md](01-customer-journey.md) dan menuju [04-payment.md](04-payment.md).

## Aktor yang Terlibat

- **Pembeli** — mengisi data pesanan
- **Sistem cart & checkout** — validasi stok, kalkulasi harga & ongkir
- **Sistem alamat/geolocation** — untuk pengisian alamat pengiriman
- **Sistem kurir (API ongkir)** — kalkulasi biaya kirim real-time (lihat [05-shipping-fulfillment.md](05-shipping-fulfillment.md))
- **Sistem promo/voucher** — validasi kode diskon (lihat [09-marketing-promotion.md](09-marketing-promotion.md))

## Alur Step-by-Step

### 1. Cart Management
- **Add to cart** — dari PDP, pembeli pilih varian & jumlah, ditambahkan ke keranjang
- **View cart** — lihat daftar item, ubah jumlah, hapus item, lihat subtotal
- **Cart persistence** — keranjang tetap tersimpan meski pembeli tutup browser (untuk pembeli login) atau pakai local storage/cookie (untuk guest)
- **Cart validation** — cek ulang harga & stok terkini setiap kali cart dibuka (harga/stok bisa berubah sejak ditambahkan)
- **Cross-sell di cart** — "tambahkan juga produk ini" sebelum checkout (opsional)

### 2. Initiate Checkout
- Pembeli klik "Checkout" dari cart, atau "Beli Sekarang" langsung dari PDP (skip cart)
- **Guest checkout vs login required** — keputusan bisnis penting, lihat bagian Keputusan Bisnis
- Jika belum login: opsi login, daftar akun baru, atau lanjut sebagai guest

### 3. Shipping Information
- Input/pilih alamat pengiriman (nama penerima, no. telepon, alamat lengkap, kota/kecamatan, kode pos)
- Untuk pembeli terdaftar: pilih dari daftar alamat tersimpan atau tambah alamat baru
- Validasi alamat (misal integrasi dengan API wilayah Indonesia — provinsi/kota/kecamatan/kelurahan)

### 4. Shipping Method Selection
- Sistem menghitung ongkos kirim berdasarkan berat/dimensi total, alamat tujuan, dan pilihan kurir (lihat [05-shipping-fulfillment.md](05-shipping-fulfillment.md))
- Pembeli memilih layanan: reguler, express, same-day, instant courier — dengan estimasi waktu tiba & biaya berbeda
- Opsi lain: ambil di toko (pickup/click & collect) jika toko punya lokasi fisik

### 5. Apply Voucher/Promo (opsional)
- Input kode voucher atau pilih promo yang otomatis berlaku
- Sistem validasi: masa berlaku, syarat minimum belanja, kuota penggunaan, kombinasi dengan promo lain
- Update total setelah diskon diterapkan

### 6. Order Review
- Ringkasan akhir: item, subtotal, ongkir, diskon, pajak (jika ditampilkan terpisah), total akhir
- Pembeli mengecek kembali semua detail sebelum lanjut ke pembayaran

### 7. Payment Method Selection
- Pembeli memilih metode pembayaran (lihat detail lengkap di [04-payment.md](04-payment.md))
- Order dibuat dengan status "menunggu pembayaran" (pending payment)

### 8. Order Placed
- Order tercatat di sistem dengan nomor order unik
- Stok direservasi (lihat [02-catalog-inventory.md](02-catalog-inventory.md))
- Pembeli diarahkan ke halaman instruksi pembayaran atau konfirmasi

## Edge Case & Pengecualian

- **Cart abandonment** — pembeli meninggalkan checkout tanpa menyelesaikan; perlu strategi recovery (email/WA reminder) — lihat [09-marketing-promotion.md](09-marketing-promotion.md)
- **Harga/stok berubah antara cart dan checkout** — perlu notifikasi & re-konfirmasi ke pembeli
- **Alamat di luar jangkauan pengiriman** — kurir tertentu tidak melayani area tersebut, perlu fallback opsi kurir lain
- **Voucher tidak valid/sudah kedaluwarsa/kuota habis** — pesan error yang jelas, jangan blok seluruh checkout
- **Produk yang butuh penanganan khusus** (misal barang pecah belah, elektronik) — mungkin punya opsi asuransi pengiriman tambahan
- **Checkout multi-alamat** (kirim ke beberapa alamat dalam satu transaksi) — umumnya di luar scope MVP, perlu keputusan eksplisit
- **Sesi checkout timeout** — jika pembeli terlalu lama tidak menyelesaikan, reservasi stok perlu dilepas otomatis

## Keputusan Bisnis yang Perlu Diambil

1. Apakah guest checkout diizinkan, atau pembeli wajib membuat akun? (Guest checkout menurunkan friksi tapi mempersulit retensi/data pelanggan)
2. Berapa lama batas waktu reservasi stok sebelum otomatis dilepas jika checkout tidak selesai?
3. Apakah ada opsi pickup di toko/gudang selain pengiriman kurir?
4. Apakah pajak (PPN) ditampilkan terpisah di ringkasan order atau sudah termasuk harga produk?
5. Apakah mendukung "Beli Sekarang" (single-item fast checkout) selain flow cart normal?
6. Apakah checkout mendukung catatan tambahan dari pembeli ke penjual (misal "tolong dibungkus kado")?

## Konteks Indonesia

- Guest checkout populer di Indonesia karena banyak pembeli enggan membuat akun untuk pembelian sekali — tapi trade-off terhadap program loyalty ([09-marketing-promotion.md](09-marketing-promotion.md)) perlu dipertimbangkan.
- Format alamat Indonesia memiliki struktur berjenjang (Provinsi → Kota/Kabupaten → Kecamatan → Kelurahan/Desa → RT/RW) yang perlu didukung dropdown/autocomplete agar akurat untuk kalkulasi ongkir.
- Nomor telepon aktif di checkout sangat penting karena kurir & konfirmasi pesanan di Indonesia sering menggunakan WhatsApp/SMS/telepon langsung, bukan hanya email.

## Referensi

- Praktik umum checkout flow e-commerce, disesuaikan konteks kebiasaan belanja online Indonesia (guest checkout, pentingnya nomor telepon aktif).
