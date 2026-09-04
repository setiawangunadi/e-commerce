# 01. Customer Journey — Awareness sampai Purchase Decision

## Ringkasan

Dokumen ini memetakan perjalanan calon pembeli dari titik pertama mereka mengenal toko (awareness) sampai mereka memutuskan untuk membeli (purchase decision), sebelum masuk ke proses cart & checkout (lihat [03-cart-checkout.md](03-cart-checkout.md)). Ini adalah "atas corong" (top-of-funnel) dari seluruh alur bisnis e-commerce.

## Aktor yang Terlibat

- **Calon pembeli (visitor)** — belum tentu punya akun
- **Search engine / iklan / media sosial** — sumber trafik
- **Sistem website** — landing page, katalog, search engine internal, recommendation engine
- **Tim marketing toko** — pengelola campaign, konten, SEO

## Alur Step-by-Step

### 1. Awareness (calon pembeli menemukan toko)
Sumber trafik utama untuk single-store di Indonesia:
- **Organic search (SEO)** — Google Search, Google Shopping
- **Paid ads** — Google Ads, Meta Ads (Facebook/Instagram), TikTok Ads
- **Social commerce** — konten organik di Instagram, TikTok, live shopping
- **Referral/afiliasi** — link dari influencer/affiliate program
- **Direct/branded** — pembeli sudah tahu nama toko, ketik langsung URL
- **Email/WhatsApp marketing** — untuk pembeli yang sudah pernah transaksi (retensi, bukan akuisisi baru)
- **Marketplace listing** — jika toko juga ada di Shopee/Tokopedia sebagai channel akuisisi tambahan (lihat [14-omnichannel.md](14-omnichannel.md))

### 2. Landing & First Impression
- Visitor mendarat di homepage, halaman kategori, atau halaman produk spesifik (tergantung sumber trafik — misal dari iklan produk tertentu, langsung ke PDP/product detail page)
- Elemen kunci yang menentukan bounce/stay: kecepatan loading, kejelasan value proposition, trust signal (rating, jumlah ulasan, badge keamanan pembayaran)

### 3. Discovery / Browsing
- **Navigasi kategori** — struktur menu, breadcrumb
- **Search internal** — pencarian produk by keyword, autocomplete, typo-tolerance
- **Filter & sort** — harga, ukuran, warna, rating, ketersediaan stok, terlaris
- **Rekomendasi produk** — "produk terkait", "sering dibeli bersama", "baru dilihat", personalisasi berdasarkan histori
- **Wishlist/simpan produk** — untuk dibeli nanti, bisa jadi sinyal minat untuk retargeting

### 4. Product Consideration (di Product Detail Page)
Elemen yang memengaruhi keputusan beli, lihat juga [02-catalog-inventory.md](02-catalog-inventory.md) untuk data produk yang mendasarinya:
- Foto/video produk (multi-angle, zoom, video demo)
- Deskripsi produk, spesifikasi, size guide
- Varian (warna, ukuran) dan indikator stok per varian
- Harga, harga coret (diskon), estimasi ongkir
- Rating & ulasan pembeli (termasuk foto ulasan)
- Tanya-jawab produk (Q&A) — publik, dijawab toko atau pembeli lain
- Trust badge — garansi, kebijakan retur, metode pembayaran yang didukung
- Stock urgency signal — "stok tinggal 2", "terjual 50 dalam 24 jam" (opsional, taktik konversi)

### 5. Comparison & Research (di luar website, tapi memengaruhi konversi)
- Pembeli Indonesia lazim membandingkan harga lintas platform (marketplace vs website resmi)
- Cek ulasan/testimoni di media sosial, cek kredibilitas toko (misal cek Instagram, cek apakah toko terdaftar resmi)
- Live chat / WhatsApp business untuk bertanya sebelum beli — sering jadi titik keputusan penting di Indonesia

### 6. Purchase Decision → lanjut ke Cart
- Pembeli menambahkan produk ke keranjang (add to cart) atau langsung "Beli Sekarang" (buy now, skip cart)
- Dari titik ini alur berlanjut ke [03-cart-checkout.md](03-cart-checkout.md)

## Edge Case & Pengecualian

- **Produk habis stok saat browsing** — perlu opsi "notify me" saat restock, atau tampilkan produk alternatif
- **Visitor dari iklan tapi produk sudah tidak ada / halaman 404** — perlu redirect handling agar tidak buang budget iklan
- **Pencarian tanpa hasil (zero search result)** — perlu fallback (saran kategori, produk populer) alih-alih halaman kosong
- **Pembeli baru vs pembeli lama** — homepage/rekomendasi bisa berbeda (guest generik vs personalisasi untuk yang sudah login)
- **Perangkat mobile vs desktop** — mayoritas trafik e-commerce Indonesia dari mobile; UX browsing harus dioptimalkan mobile-first

## Keputusan Bisnis yang Perlu Diambil

1. Kanal akuisisi mana yang jadi prioritas awal (SEO organik vs paid ads vs social commerce)? Ini menentukan kebutuhan teknis (SEO-friendly URL, pixel tracking, dsb.)
2. Apakah menyediakan live chat/WhatsApp business terintegrasi di website, atau cukup kontak terpisah?
3. Apakah butuh recommendation engine (personalisasi) sejak awal, atau cukup "produk terkait" statis di fase awal?
4. Apakah menampilkan rating & ulasan sejak hari pertama (perlu strategi mengumpulkan ulasan awal, misal insentif review) atau bertahap?
5. Apakah wishlist jadi fitur wajib di MVP atau bisa menyusul?

## Konteks Indonesia

- Mayoritas pengguna internet Indonesia mengakses lewat mobile — desain harus mobile-first, bukan desktop-first yang di-responsive-kan belakangan.
- WhatsApp adalah kanal komunikasi pra-pembelian yang sangat dominan di Indonesia — banyak toko online mengintegrasikan tombol "Chat via WhatsApp" langsung di halaman produk.
- Kepercayaan (trust) adalah hambatan besar untuk toko baru non-marketplace — testimoni, foto ulasan asli, dan bukti legalitas (misal SIUP/NIB, PSE Kominfo — lihat [11-legal-compliance.md](11-legal-compliance.md)) berpengaruh besar terhadap konversi.
- Social commerce (Instagram, TikTok Shop, live shopping) adalah kanal discovery yang tumbuh pesat dan sering jadi titik awal funnel sebelum pembeli akhirnya checkout di website resmi.

## Referensi

- Riset internal berdasarkan pola umum customer journey e-commerce (funnel awareness–consideration–decision) dan observasi kebiasaan digital pembeli Indonesia (dominasi mobile, WhatsApp, social commerce).
