# 08. Customer Service & Support

## Ringkasan

Dokumen ini mencakup bagaimana pembeli mendapat bantuan di setiap tahap — sebelum beli (pertanyaan produk), saat transaksi (masalah pembayaran/checkout), dan setelah beli (komplain, retur, retur ditolak). Customer service adalah lapisan yang menyentuh hampir semua flow lain, terutama [07-returns-refunds.md](07-returns-refunds.md).

## Aktor yang Terlibat

- **Pembeli** — mengajukan pertanyaan/komplain
- **Tim customer service (CS)** — menjawab & menyelesaikan
- **Sistem ticketing/live chat** — mencatat & mengorganisir permintaan
- **Chatbot (opsional)** — otomasi untuk pertanyaan umum

## Kanal Support

- **Live chat di website** — real-time, terintegrasi widget chat
- **WhatsApp Business** — sangat dominan sebagai kanal utama di Indonesia, sering jadi kanal pra-pembelian juga (lihat [01-customer-journey.md](01-customer-journey.md))
- **Email support** — untuk kasus formal/butuh dokumentasi (retur, komplain tertulis)
- **Media sosial (Instagram DM, dll.)** — kanal informal tapi sering dipakai pembeli Indonesia
- **FAQ/Help Center** — self-service untuk pertanyaan umum (kebijakan retur, cara bayar, cara lacak pesanan)
- **Telepon/call center** — untuk kasus urgent atau segmen pembeli yang kurang nyaman chat

## Alur Step-by-Step

### 1. Pre-Purchase Inquiry
- Pertanyaan seputar produk (stok, ukuran, kompatibilitas), estimasi pengiriman, cara pembayaran
- Idealnya dijawab cepat (SLA singkat) karena berpengaruh langsung ke konversi

### 2. Order & Payment Issue
- Pembeli kesulitan checkout, pembayaran tidak terverifikasi padahal sudah bayar, salah pilih alamat/varian setelah order dibuat
- CS perlu akses ke data order & status pembayaran untuk verifikasi cepat (lihat [06-order-management.md](06-order-management.md))

### 3. Post-Purchase Complaint
- Barang belum sampai padahal estimasi terlewati, barang rusak/tidak sesuai, salah kirim
- CS memverifikasi status pengiriman ([05-shipping-fulfillment.md](05-shipping-fulfillment.md)) dan mengarahkan ke proses retur jika perlu ([07-returns-refunds.md](07-returns-refunds.md))

### 4. Ticket/Case Management
- Setiap komplain dicatat sebagai tiket dengan status: baru → sedang ditangani → menunggu respon pembeli → selesai
- Eskalasi ke level lebih tinggi (supervisor) untuk kasus kompleks/sensitif

### 5. Dispute Resolution
- Jika pembeli tidak puas dengan keputusan awal (misal retur ditolak), tersedia jalur eskalasi/banding
- Untuk kasus ekstrem, bisa melibatkan mediasi eksternal (misal BPSK - Badan Penyelesaian Sengketa Konsumen, atau pengaduan ke platform review publik)

### 6. Feedback Loop
- Setelah kasus selesai, kumpulkan feedback kepuasan (CSAT survey singkat)
- Data komplain berulang jadi input untuk perbaikan produk/proses (lihat [12-analytics-kpi.md](12-analytics-kpi.md))

## Edge Case & Pengecualian

- **Komplain di luar jam operasional** — perlu auto-reply/chatbot untuk menahan ekspektasi respon
- **Komplain publik di media sosial** (bukan kanal resmi) — perlu proses monitoring & respons cepat untuk reputasi
- **Pembeli abusive/kasus penipuan klaim palsu** (misal klaim barang tidak sampai padahal sudah diterima) — perlu verifikasi silang dengan data pengiriman
- **Volume tiket tinggi saat flash sale/promo besar** — perlu kapasitas CS ekstra atau chatbot untuk menyaring pertanyaan umum
- **Bahasa/dialek regional** — untuk basis pembeli luas, CS mungkin perlu menangani variasi bahasa informal Indonesia

## Keputusan Bisnis yang Perlu Diambil

1. Kanal support mana yang jadi utama (live chat, WhatsApp, email) dan berapa target SLA respon per kanal?
2. Apakah menggunakan chatbot untuk pertanyaan umum (FAQ otomatis) sebelum eskalasi ke CS manusia?
3. Jam operasional CS — 24/7 atau jam kerja tertentu?
4. Bagaimana struktur tim CS di awal (in-house vs outsource, berapa orang)?
5. Apakah butuh sistem ticketing formal (helpdesk software) sejak awal atau cukup dikelola manual di tahap awal bisnis?

## Konteks Indonesia

- WhatsApp Business adalah kanal support paling diharapkan pembeli Indonesia — respons cepat di WhatsApp sering jadi faktor penentu kepercayaan lebih dari email.
- Pembeli Indonesia cenderung ekspresif di media sosial saat komplain (termasuk membuat konten publik) — pentingnya monitoring reputasi & respons proaktif di luar kanal resmi.
- Ada mekanisme penyelesaian sengketa konsumen resmi di Indonesia (BPSK) yang bisa jadi eskalasi terakhir jika dispute tidak terselesaikan secara langsung — baik diketahui sebagai bagian dari compliance (lihat [11-legal-compliance.md](11-legal-compliance.md)).

## Referensi

- Praktik umum customer service e-commerce, dengan penyesuaian preferensi kanal komunikasi pembeli Indonesia (WhatsApp-first).
