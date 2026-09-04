# 14. Omnichannel — Marketplace, Social Commerce & Offline

## Ringkasan

Meski fokus utama adalah website resmi milik sendiri (single-store), realitas pasar Indonesia membuat sebagian besar toko tetap hadir di kanal lain (marketplace, media sosial, bahkan toko fisik) sebagai kanal akuisisi/penjualan tambahan. Dokumen ini membahas bagaimana kanal-kanal itu berhubungan dengan sistem inti di [02-catalog-inventory.md](02-catalog-inventory.md) dan [06-order-management.md](06-order-management.md), tanpa mengubah bahwa website tetap kanal utama.

## Aktor yang Terlibat

- **Pembeli** — bisa menemukan/bertransaksi di berbagai kanal
- **Marketplace (Shopee, Tokopedia, TikTok Shop)** — platform pihak ketiga
- **Sistem toko** — perlu sinkronisasi data lintas kanal
- **Admin toko** — mengelola listing & stok di banyak kanal sekaligus

## Kanal Tambahan yang Umum Dipakai Bersamaan dengan Website

### 1. Marketplace (Shopee, Tokopedia, TikTok Shop, Lazada, Blibli)
- Berfungsi sebagai kanal akuisisi tambahan dengan trafik besar bawaan platform
- Trade-off: komisi platform, kompetisi harga langsung dengan seller lain, ketergantungan pada aturan platform pihak ketiga, dan **kewajiban pajak berbeda** (marketplace memotong PPh final otomatis — lihat [11-legal-compliance.md](11-legal-compliance.md) dan [10-finance-accounting.md](10-finance-accounting.md))
- Perlu sinkronisasi stok real-time antara website dan marketplace agar tidak overselling — idealnya lewat satu sumber data stok terpusat ([02-catalog-inventory.md](02-catalog-inventory.md))

### 2. Social Commerce (TikTok Shop, Instagram Shopping, Live Shopping)
- Penjualan langsung dari konten sosial/live streaming
- Bisa mengarahkan trafik ke website (untuk kontrol penuh transaksi & data pelanggan) atau bertransaksi langsung di platform sosial (lebih cepat tapi kehilangan data pelanggan langsung)

### 3. WhatsApp Commerce
- Banyak transaksi di Indonesia terjadi lewat percakapan WhatsApp langsung (terutama untuk custom order/nego), yang idealnya tetap diarahkan untuk checkout resmi lewat website agar tercatat rapi di sistem order

### 4. Offline/Toko Fisik (jika relevan)
- Jika toko punya lokasi fisik, perlu keputusan apakah stok offline & online terpisah atau terintegrasi (unified inventory)
- POS (Point of Sale) system untuk transaksi offline, idealnya terhubung ke sistem stok yang sama dengan website

## Alur Step-by-Step (Sinkronisasi Multi-Kanal)

1. **Single source of truth untuk produk & stok** — data produk (nama, harga, foto, stok) dikelola terpusat, lalu didorong (push) ke tiap kanal
2. **Sinkronisasi stok real-time atau berkala** — mencegah kondisi produk terjual di marketplace padahal stok sudah habis di sistem pusat
3. **Order dari marketplace masuk ke sistem fulfillment yang sama** (idealnya) — agar gudang tidak perlu cek banyak dashboard terpisah untuk proses pengiriman
4. **Pelaporan gabungan** — omzet dari semua kanal direkap untuk gambaran bisnis utuh, meski pencatatan pajak per kanal bisa berbeda (lihat [10-finance-accounting.md](10-finance-accounting.md))

## Edge Case & Pengecualian

- **Overselling lintas kanal** — produk yang sama terjual di website dan marketplace bersamaan melebihi stok riil, karena sinkronisasi tidak real-time
- **Harga tidak konsisten antar kanal** — bisa membingungkan pembeli atau menimbulkan komplain ("kenapa di Shopee lebih murah?")
- **Kebijakan retur berbeda per kanal** — marketplace punya kebijakan buyer protection sendiri yang mungkin berbeda dari kebijakan retur website (lihat [07-returns-refunds.md](07-returns-refunds.md))
- **Ulasan/reputasi terpisah per kanal** — rating di marketplace tidak otomatis terlihat di website, memengaruhi trust pembeli baru di website ([01-customer-journey.md](01-customer-journey.md))

## Keputusan Bisnis yang Perlu Diambil

1. Apakah toko akan berjualan di marketplace sejak awal sebagai kanal tambahan, atau fokus 100% ke website dulu?
2. Jika multi-kanal, apakah investasi dibuat untuk sinkronisasi otomatis (API) sejak awal, atau dikelola manual dulu di skala kecil?
3. Bagaimana kebijakan harga — seragam di semua kanal atau boleh berbeda (misal harga marketplace sedikit lebih tinggi untuk menutup komisi platform)?
4. Apakah live shopping/social commerce jadi bagian strategi go-to-market di awal?

## Konteks Indonesia

- Marketplace (Shopee, Tokopedia, TikTok Shop) masih mendominasi kebiasaan belanja online mayoritas konsumen Indonesia — kehadiran di sana sering membantu discovery awal meski tujuan jangka panjang adalah membangun basis pelanggan loyal di website sendiri (margin lebih baik, kontrol data pelanggan penuh, tidak tergantung aturan platform pihak ketiga).
- Perbedaan perlakuan pajak antara kanal marketplace (dipotong otomatis oleh platform sejak PMK 37/2025) dan kanal website sendiri (dihitung & disetor mandiri) adalah pertimbangan operasional yang perlu dipahami sejak awal jika memilih strategi multi-kanal.

## Referensi

- Observasi pola dominasi marketplace & social commerce di perilaku belanja online Indonesia, serta perbedaan kewajiban pajak lintas kanal berdasarkan riset di [11-legal-compliance.md](11-legal-compliance.md).
