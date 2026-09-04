# 07. Returns, Refunds & Warranty

## Ringkasan

Dokumen ini mencakup proses setelah barang diterima pembeli tapi ada masalah — retur barang, pengembalian dana, atau klaim garansi. Ini adalah cabang dari [06-order-management.md](06-order-management.md) yang dipicu setelah status "Delivered", dan berkaitan erat dengan [08-customer-service.md](08-customer-service.md) (tempat komplain pertama kali masuk) dan [04-payment.md](04-payment.md) (mekanisme pengembalian dana).

## Aktor yang Terlibat

- **Pembeli** — mengajukan retur/klaim
- **Customer service** — memvalidasi & memproses pengajuan
- **Staf gudang** — quality check barang retur
- **Kurir** — menjemput barang retur
- **Payment gateway** — proses refund dana

## Alur Step-by-Step

### 1. Pengajuan Retur (Return Request)
- Pembeli mengajukan retur dalam masa berlaku (misal 7-14 hari sejak diterima) via halaman "Ajukan Retur" di order detail atau via customer service
- Pembeli memilih alasan: barang rusak/cacat, salah kirim, tidak sesuai deskripsi, berubah pikiran (jika toko mengizinkan)
- Upload bukti foto/video kondisi barang

### 2. Validasi Pengajuan
- Customer service/sistem mengecek: apakah dalam masa retur, apakah kategori produk memenuhi syarat retur (beberapa kategori seperti underwear/produk higienis lazim non-retur), apakah bukti foto cukup jelas
- Keputusan: **disetujui**, **ditolak** (dengan alasan), atau **butuh informasi tambahan**

### 3. Pengiriman Barang Retur
- Jika disetujui: pembeli mengirim balik barang (via kurir yang ditunjuk toko atau self-arrange), atau toko menjemput langsung
- Nomor resi retur dicatat untuk tracking

### 4. Quality Check di Gudang
- Staf gudang menerima & memeriksa barang retur: kondisi sesuai klaim, kelengkapan (tag, dus, aksesoris)
- Keputusan akhir: retur **diterima penuh**, **diterima sebagian** (misal potongan biaya karena kondisi tidak 100%), atau **ditolak** (barang tidak sesuai kondisi yang diklaim)

### 5. Refund atau Penggantian (Resolution)
Pilihan resolusi (tergantung kebijakan toko & preferensi pembeli):
- **Refund penuh** ke metode pembayaran asal atau saldo/wallet toko
- **Tukar barang (exchange)** — ganti ukuran/warna/produk lain
- **Kirim ulang** — jika kasus salah kirim/rusak dari toko
- **Store credit** — saldo yang bisa dipakai belanja lagi (alternatif refund tunai)

### 6. Refund Processing
- Refund ke metode asal diproses via payment gateway ([04-payment.md](04-payment.md)), umumnya butuh beberapa hari kerja untuk masuk kembali ke rekening/e-wallet pembeli
- Refund ke saldo toko biasanya instan
- Notifikasi ke pembeli saat refund selesai diproses

### 7. Warranty Claim (klaim garansi, khusus produk bergaransi seperti elektronik)
- Alur mirip retur tapi dengan jangka waktu lebih panjang (sesuai garansi produk, bisa bulanan-tahunan)
- Bisa melibatkan pihak ketiga (service center resmi brand) alih-alih ditangani toko langsung

## Edge Case & Pengecualian

- **Barang retur tidak sesuai kondisi awal** (rusak karena kesalahan pembeli, bukan cacat produksi) — perlu kebijakan tegas & foto bukti sebelum-sesudah
- **Pembeli tidak mengirim balik barang setelah retur disetujui** — batas waktu pengiriman balik, jika lewat pengajuan otomatis dibatalkan
- **Retur untuk produk yang dibeli dengan promo/bundling** — bagaimana kalkulasi refund jika salah satu item dari bundel diretur
- **COD dengan retur** — dana belum pernah diterima toko (karena bayar di tempat), refund berarti tidak ada pengembalian dana, hanya penerimaan barang balik
- **Retur sebagian dari order multi-item** — refund parsial harus dihitung ulang termasuk proporsi ongkir & diskon
- **Dispute** — pembeli tidak puas dengan keputusan retur ditolak, perlu jalur eskalasi (lihat [08-customer-service.md](08-customer-service.md))

## Keputusan Bisnis yang Perlu Diambil

1. Berapa lama masa retur yang diberikan (7 hari, 14 hari, dll.), dan apakah berbeda per kategori produk?
2. Alasan retur apa saja yang diterima — hanya barang cacat/salah kirim, atau juga "berubah pikiran" (no-questions-asked return)?
3. Siapa yang menanggung ongkir retur — pembeli atau toko (tergantung siapa yang salah)?
4. Apakah resolusi refund selalu ke metode asal, atau ditawarkan pilihan store credit dengan insentif (misal store credit + bonus)?
5. Kategori produk apa yang non-retur (misal produk higienis, custom-made, barang diskon final sale)?
6. Berapa lama SLA proses refund setelah barang retur diterima & lolos quality check?

## Konteks Indonesia

- Kebijakan retur yang jelas dan mudah adalah salah satu faktor kepercayaan terbesar bagi pembeli online Indonesia terhadap toko non-marketplace — banyak pembeli membandingkan kebijakan retur toko dengan standar marketplace besar (yang punya buyer protection kuat) sebelum memutuskan beli di website resmi.
- Karena banyak pembeli membayar via COD, penting membedakan alur "refund dana" (hanya relevan untuk yang sudah bayar di muka) dengan "terima balik barang" (relevan untuk semua metode).
- UU Perlindungan Konsumen di Indonesia memberi hak kepada konsumen atas barang yang tidak sesuai — kebijakan retur toko sebaiknya selaras dengan ketentuan ini (lihat [11-legal-compliance.md](11-legal-compliance.md)).

## Referensi

- Praktik umum kebijakan retur & refund e-commerce, dibandingkan dengan standar buyer protection marketplace besar di Indonesia sebagai acuan ekspektasi pembeli.
