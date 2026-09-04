# 06. Order Management — Lifecycle & Operasional Admin

## Ringkasan

Dokumen ini adalah "pusat kendali" yang menghubungkan seluruh flow lain: status order berubah berdasarkan event dari [04-payment.md](04-payment.md) (pembayaran) dan [05-shipping-fulfillment.md](05-shipping-fulfillment.md) (pengiriman), dan menjadi dasar operasional admin toko sehari-hari.

## Aktor yang Terlibat

- **Pembeli** — melihat status pesanannya
- **Admin/staf operasional** — memproses order dari sisi back-office
- **Sistem** — mengubah status otomatis berdasarkan trigger (pembayaran masuk, kurir update status)

## Order Status Lifecycle (Alur Utama)

```
[Cart] → Order Dibuat (Pending Payment)
   → Dibayar (Paid / Payment Confirmed)
      → Diproses (Processing) — gudang mulai packing
         → Dikirim (Shipped) — sudah di tangan kurir, ada nomor resi
            → Diterima (Delivered) — barang sampai ke pembeli
               → Selesai (Completed) — masa retur berakhir tanpa komplain
   → Dibatalkan (Cancelled) — bisa terjadi di hampir semua tahap awal
   → Kedaluwarsa (Expired) — tidak dibayar dalam batas waktu
   → Retur/Refund diajukan — cabang alur terpisah, lihat 07-returns-refunds.md
```

## Alur Step-by-Step (Detail per Status)

### 1. Order Created (Pending Payment)
- Terbentuk setelah pembeli menyelesaikan checkout ([03-cart-checkout.md](03-cart-checkout.md))
- Stok direservasi, menunggu konfirmasi pembayaran

### 2. Payment Confirmed → Processing
- Trigger dari webhook payment gateway ([04-payment.md](04-payment.md))
- Order otomatis masuk antrian pemrosesan gudang
- Admin/staf gudang melihat daftar order baru yang perlu di-pack

### 3. Order Verification (opsional, tergantung kebijakan)
- Untuk order dengan nilai besar atau indikasi mencurigakan, admin bisa melakukan verifikasi manual sebelum diproses (lihat [13-security-fraud.md](13-security-fraud.md))

### 4. Processing → Shipped
- Barang di-pack, diserahkan ke kurir, nomor resi diterbitkan (lihat [05-shipping-fulfillment.md](05-shipping-fulfillment.md))
- Notifikasi otomatis ke pembeli (nomor resi, estimasi tiba)

### 5. Shipped → Delivered
- Update status otomatis dari API tracking kurir, atau konfirmasi manual oleh pembeli ("Pesanan Diterima")
- Beberapa toko memberi opsi pembeli klik "Konfirmasi Diterima" untuk memicu pencairan dana (jika ada sistem escrow) atau mulai hitung masa retur

### 6. Delivered → Completed
- Setelah masa retur berakhir tanpa pengajuan komplain, order otomatis "selesai"
- Trigger untuk: minta ulasan/rating ke pembeli, dana settlement final ke toko

### 7. Cancellation Flow
- **Dibatalkan oleh pembeli** — hanya bisa sebelum status "Processing" (barang belum di-pack), atau dengan approval admin jika sudah diproses
- **Dibatalkan oleh sistem/admin** — stok ternyata tidak tersedia, indikasi fraud, atau pembeli tidak bisa dihubungi
- Stok dilepas kembali, dana (jika sudah dibayar) di-refund — lihat [07-returns-refunds.md](07-returns-refunds.md)

## Admin Operational View (Back-Office)

- **Dashboard order** — daftar order dengan filter status, pencarian by nomor order/nama pembeli
- **Bulk actions** — proses banyak order sekaligus (misal cetak label massal, update status massal)
- **Order detail view** — riwayat lengkap perubahan status (audit trail), data pembeli, item, pembayaran, pengiriman
- **Print invoice/label** — cetak dokumen untuk gudang & pengiriman
- **Manual status override** — admin bisa mengubah status manual untuk kasus khusus (dengan catatan alasan)
- **Notifikasi ke pembeli** — otomatis terkirim di tiap perubahan status penting

## Edge Case & Pengecualian

- **Partial fulfillment** — sebagian item dalam satu order tidak tersedia; apakah kirim sebagian dulu (partial shipment) atau tunda semua?
- **Order stuck di status tertentu** (misal webhook payment gagal masuk, tapi dana sudah diterima) — perlu tooling admin untuk investigasi & override manual
- **Pembeli komplain barang belum sampai padahal status "Delivered"** — perlu proses eskalasi & verifikasi dengan bukti kurir (POD)
- **Duplicate order** — pembeli tidak sengaja checkout dua kali; perlu deteksi & mekanisme merge/cancel salah satu
- **Order dari pembeli yang di-blacklist** (misal riwayat COD sering ditolak) — kebijakan apakah order otomatis ditolak/perlu approval

## Keputusan Bisnis yang Perlu Diambil

1. Apakah pembeli bisa membatalkan order sendiri, dan sampai status apa itu diizinkan?
2. Berapa lama masa "menunggu konfirmasi diterima" sebelum order otomatis dianggap selesai (misal 7 hari setelah status delivered)?
3. Apakah butuh proses verifikasi manual untuk order bernilai besar/mencurigakan sebelum diproses?
4. Apakah partial shipment diizinkan, atau semua item harus tersedia sebelum order diproses?
5. Siapa (role apa) yang punya akses untuk override status order secara manual?

## Konteks Indonesia

- Konfirmasi status order sering dikomunikasikan via WhatsApp selain email/notifikasi in-app, karena tingkat keterbukaan email pembeli Indonesia relatif rendah dibanding WhatsApp.
- Untuk toko yang juga menerima COD, perlu pelacakan riwayat pembeli (berapa kali menolak COD) sebagai bagian dari operasional order management untuk mitigasi kerugian ongkir.

## Referensi

- Praktik umum order management system (OMS) pada platform e-commerce, disesuaikan kebutuhan single-store.
