# 05. Shipping & Fulfillment

## Ringkasan

Dokumen ini mencakup proses fisik memindahkan barang dari gudang toko ke tangan pembeli — mulai dari kalkulasi ongkir saat checkout, proses packing, penyerahan ke kurir, sampai tracking pengiriman. Menyambung dari [03-cart-checkout.md](03-cart-checkout.md) (pemilihan metode kirim) dan [06-order-management.md](06-order-management.md) (status order berbasis status kirim).

## Aktor yang Terlibat

- **Staf gudang/fulfillment** — packing barang
- **Kurir/ekspedisi (3PL)** — JNE, J&T, SiCepat, AnterAja, Ninja Xpress, dll.
- **Instant courier** — Gojek/Grab untuk same-day/instant delivery jarak dekat
- **Pembeli** — penerima barang
- **API agregator ongkir** (opsional) — layanan seperti Biteship, RajaOngkir, Shipper yang mengintegrasikan banyak kurir sekaligus

## Alur Step-by-Step

### 1. Shipping Cost Calculation (saat checkout)
- Berdasarkan berat/dimensi total item, alamat asal (gudang) dan tujuan (pembeli), dihitung ongkos kirim real-time
- Umumnya via integrasi API kurir langsung atau agregator ongkir (misal Biteship, RajaOngkir) yang menyatukan tarif banyak ekspedisi sekaligus
- Tampilkan pilihan: reguler (2-4 hari), express/next-day, same-day (kota besar), instant (1-3 jam, radius dekat via Gojek/Grab)

### 2. Order Fulfillment Trigger
- Setelah pembayaran terkonfirmasi ([04-payment.md](04-payment.md)), order masuk ke antrian fulfillment gudang
- Staf gudang menerima notifikasi pesanan baru yang siap diproses

### 3. Picking & Packing
- Ambil barang sesuai SKU dari rak/gudang
- Quality check (pastikan barang sesuai pesanan, tidak cacat)
- Kemas dengan packaging sesuai jenis barang (bubble wrap untuk barang pecah belah, dus untuk barang besar)
- Cetak label pengiriman (nama, alamat, nomor resi) — biasanya generate otomatis dari sistem setelah pemilihan kurir terkonfirmasi

### 4. Handover to Courier
- Barang diserahkan ke kurir (dijemput/drop-off ke agen kurir terdekat)
- Nomor resi (tracking number) dicatat di sistem dan dikirim ke pembeli

### 5. In-Transit Tracking
- Status pengiriman diperbarui otomatis dari API kurir: picked up → in transit → out for delivery → delivered
- Pembeli bisa cek status via halaman order/tracking di website, atau notifikasi otomatis (WhatsApp/email/SMS)

### 6. Delivery Confirmation
- Barang diterima pembeli, status berubah "delivered"
- Beberapa kurir menyediakan bukti terima (POD - proof of delivery), foto, atau tanda tangan digital
- Menyambung ke [07-returns-refunds.md](07-returns-refunds.md) (masa retur mulai dihitung sejak delivered) dan [08-customer-service.md](08-customer-service.md) (jika ada komplain barang tidak sampai/rusak)

## Edge Case & Pengecualian

- **Alamat tidak ditemukan / pembeli tidak bisa dihubungi** — kurir biasanya retry beberapa kali sebelum barang dikembalikan ke pengirim (retur ke gudang)
- **Barang hilang/rusak dalam pengiriman** — perlu proses klaim ke kurir dan kebijakan kompensasi ke pembeli (siapa yang menanggung kerugian)
- **Area tidak terjangkau kurir tertentu** — perlu fallback ke kurir lain atau opsi pengiriman kombinasi (misal kurir utama + POS Indonesia untuk area terpencil)
- **Keterlambatan pengiriman (SLA tidak terpenuhi)** — perlu kebijakan komunikasi proaktif ke pembeli & kompensasi jika relevan
- **COD ditolak saat pengantaran** — barang kembali ke gudang, ongkir pulang-pergi jadi kerugian (lihat [04-payment.md](04-payment.md))
- **Pesanan dengan multi-item dari lokasi stok berbeda** — perlu keputusan: kirim terpisah (multiple shipment) atau tunggu semua item siap (single shipment)
- **Perubahan alamat setelah order diproses** — kebijakan apakah masih bisa diubah sebelum barang di-pickup kurir

## Keputusan Bisnis yang Perlu Diambil

1. Kurir mana saja yang akan diintegrasikan (JNE, J&T, SiCepat, AnterAja, Ninja Xpress, dll.) — semua sekaligus via agregator, atau pilih 2-3 utama dulu?
2. Apakah menyediakan opsi same-day/instant delivery (via Gojek/Grab) untuk area tertentu?
3. Siapa yang menanggung ongkir — dibebankan penuh ke pembeli, gratis ongkir dengan syarat minimum belanja, atau disubsidi sebagian?
4. Bagaimana kebijakan jika barang hilang/rusak di perjalanan — klaim asuransi kurir atau toko menanggung penuh?
5. Berapa target SLA pengiriman yang dijanjikan ke pembeli, dan bagaimana proses eskalasi jika SLA tidak terpenuhi?
6. Apakah gudang tunggal atau multi-lokasi sejak awal?

## Konteks Indonesia

- Ekspedisi utama di pasar Indonesia: **JNE, J&T Express, SiCepat, AnterAja, Ninja Xpress, POS Indonesia, dan Tiki** — masing-masing punya kekuatan berbeda (JNE kuat di jangkauan area terluas termasuk pelosok, J&T dan SiCepat kuat di kecepatan & harga kompetitif kota besar).
- Untuk kalkulasi ongkir otomatis lintas banyak kurir, umum digunakan layanan agregator seperti **Biteship** atau **RajaOngkir** yang menyediakan API terpadu tanpa perlu integrasi satu-satu ke tiap ekspedisi.
- Geografi Indonesia yang berupa kepulauan membuat waktu & biaya kirim sangat bervariasi antar wilayah (Jawa vs luar Jawa/Indonesia Timur) — penting dipertimbangkan dalam kebijakan gratis ongkir maupun estimasi SLA.
- Instant courier (Gojek/Grab) populer untuk pengiriman same-day di kota besar dengan radius terbatas, cocok untuk kategori produk yang butuh kecepatan (makanan, produk mendesak).

## Referensi

- [Cek Ongkir Semua Ekspedisi (JNE, J&T, SiCepat, Tiki, Ninja) — Biteship](https://biteship.com/id/cek-ongkir)
- Observasi pasar ekspedisi Indonesia (JNE, J&T, SiCepat, AnterAja, Ninja Xpress) sebagai pemain utama logistik e-commerce nasional.
