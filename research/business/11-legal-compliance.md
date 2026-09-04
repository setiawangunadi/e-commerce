# 11. Legal & Regulatory Compliance (Indonesia)

## Ringkasan

Dokumen ini mencakup kewajiban hukum dan regulasi yang harus dipenuhi toko online di Indonesia — pendaftaran platform, perlindungan data pribadi, perlindungan konsumen, dan pajak. Ini adalah lapisan yang menaungi hampir semua flow lain, terutama [04-payment.md](04-payment.md), [10-finance-accounting.md](10-finance-accounting.md), dan [07-returns-refunds.md](07-returns-refunds.md).

## Aktor yang Terlibat

- **Pemilik/pengelola bisnis** — bertanggung jawab kepatuhan
- **Konsultan hukum/pajak** (opsional) — membantu memastikan kepatuhan
- **Kominfo/Komdigi** — regulator pendaftaran platform elektronik
- **Direktorat Jenderal Pajak (DJP)** — regulator pajak
- **Kementerian Perdagangan** — regulator perdagangan elektronik (PMSE)

## Area Regulasi Utama

### 1. Legalitas Usaha
- **NIB (Nomor Induk Berusaha)** — wajib dimiliki pelaku usaha yang berjualan online, termasuk lewat website sendiri, sesuai Permendag No. 19 Tahun 2026 tentang Perdagangan Melalui Sistem Elektronik (PMSE)
- **Bentuk badan usaha** — perorangan (untuk skala kecil) vs PT/CV (untuk skala lebih besar, dibutuhkan untuk kerja sama B2B tertentu atau mengakses pembiayaan)

### 2. PSE (Penyelenggara Sistem Elektronik) — Kominfo/Komdigi
- Website e-commerce yang memproses data pribadi pelanggan (nama, alamat, kontak, riwayat transaksi) termasuk kategori PSE Lingkup Privat yang **wajib mendaftar** ke Kominfo/Komdigi
- Kegagalan mendaftar berisiko sanksi berupa pemblokiran akses situs, denda administratif
- Proses pendaftaran melalui sistem OSS (Online Single Submission)

### 3. UU Pelindungan Data Pribadi (UU PDP)
- Mengatur bagaimana data pribadi pembeli (nama, alamat, nomor telepon, riwayat pembelian) boleh dikumpulkan, disimpan, diproses, dan dibagikan
- Kewajiban: consent eksplisit dari pengguna, kebijakan privasi yang jelas, keamanan penyimpanan data, hak pengguna untuk menghapus/mengakses data mereka
- Relevan untuk seluruh sistem yang menyimpan data pembeli — [02-catalog-inventory.md](02-catalog-inventory.md) (histori pembelian), [03-cart-checkout.md](03-cart-checkout.md) (alamat), [04-payment.md](04-payment.md) (tidak boleh menyimpan data kartu mentah)

### 4. UU Perlindungan Konsumen
- Hak konsumen atas informasi produk yang benar & jelas, hak atas barang sesuai deskripsi, hak mengajukan keluhan/ganti rugi
- Kewajiban pelaku usaha: memberikan info harga & kondisi barang secara transparan, tidak melakukan praktik menyesatkan (misal diskon palsu/harga coret yang tidak pernah jadi harga normal)
- Menjadi dasar kebijakan retur yang wajar — lihat [07-returns-refunds.md](07-returns-refunds.md)
- Jalur penyelesaian sengketa: BPSK (Badan Penyelesaian Sengketa Konsumen) sebagai opsi eskalasi di luar pengadilan — lihat [08-customer-service.md](08-customer-service.md)

### 5. Pajak E-Commerce
- **PPN (Pajak Pertambahan Nilai)** — 11% (tarif berlaku saat ini) untuk barang/jasa kena pajak; berlaku jika toko sudah berstatus PKP
- **PPh (Pajak Penghasilan)** — atas laba usaha, mengikuti skema UMKM (PPh Final 0.5% dari omzet untuk UMKM sesuai PP 23/2018) atau skema umum tergantung skala usaha
- **Ketentuan khusus marketplace (PMK Nomor 37 Tahun 2025, berlaku efektif Juli–Agustus 2026)** — mewajibkan marketplace memungut PPh final 0,5% otomatis dari pedagang dengan omzet Rp500 juta–Rp4,8 miliar/tahun. Ini berlaku untuk transaksi **di marketplace**, bukan di website milik sendiri — jika toko juga berjualan di marketplace sebagai kanal tambahan ([14-omnichannel.md](14-omnichannel.md)), perlu memahami perbedaan perlakuan pajak antar kanal.
- Kewajiban pembukuan/pencatatan transaksi yang rapi menjadi dasar pelaporan pajak — lihat [10-finance-accounting.md](10-finance-accounting.md)

### 6. Kebijakan Wajib di Website
- **Syarat & Ketentuan (Terms of Service)** — aturan penggunaan platform, hak & kewajiban pembeli-penjual
- **Kebijakan Privasi (Privacy Policy)** — sesuai kewajiban UU PDP
- **Kebijakan Retur & Refund** — dipublikasikan jelas (lihat [07-returns-refunds.md](07-returns-refunds.md))
- **Informasi identitas pelaku usaha** — nama badan usaha, alamat, kontak yang bisa dihubungi (wajib untuk transparansi PMSE)

## Edge Case & Pengecualian

- **Data breach/kebocoran data pelanggan** — UU PDP mewajibkan notifikasi ke otoritas & pengguna terdampak dalam waktu tertentu; perlu prosedur insiden keamanan yang jelas (lihat [13-security-fraud.md](13-security-fraud.md))
- **Produk yang butuh izin khusus** (misal kosmetik butuh izin BPOM, makanan butuh izin edar, elektronik butuh SNI) — perlu verifikasi legalitas produk sebelum dijual, di luar legalitas platform itu sendiri
- **Perubahan regulasi pajak/PSE di tengah jalan** — regulasi PMSE & pajak digital Indonesia relatif sering diperbarui; perlu proses monitoring berkala, bukan sekali cek di awal

## Keputusan Bisnis yang Perlu Diambil

1. Bentuk badan usaha apa yang dipakai (perorangan/CV/PT), dan apakah sudah mengurus NIB?
2. Apakah sudah/akan mendaftar sebagai PSE ke Kominfo/Komdigi sebelum website live ke publik?
3. Siapa yang menyusun kebijakan privasi & syarat ketentuan — internal atau konsultasi hukum?
4. Apakah toko akan mendaftar PKP sejak awal untuk bisa menerbitkan faktur pajak resmi (relevan jika menyasar pembeli korporat/B2B)?
5. Apakah produk yang dijual butuh izin edar khusus (BPOM/SNI/lainnya) yang perlu diurus sebelum listing?

## Konteks Indonesia

- Kepatuhan regulasi (NIB, PSE, kebijakan privasi yang jelas) bukan hanya kewajiban hukum tapi juga sinyal kepercayaan bagi pembeli — banyak pembeli Indonesia mengecek legalitas toko sebelum bertransaksi di website non-marketplace.
- Regulasi PMSE dan pajak digital di Indonesia bergerak dinamis (aturan terbaru efektif Juli 2026) — penting membangun proses monitoring regulasi berkelanjutan, bukan riset satu kali.

## Referensi

- [Cara Mendaftarkan Platform Digital sebagai PSE di Komdigi 2026 — IZIN.co.id](https://izin.co.id/blog/apa-itu-pse-kominfo/)
- [Pajak E-commerce Resmi Berlaku Mulai 1 Juli 2026 — Kompas](https://money.kompas.com/read/2026/07/01/104540626/pajak-e-commerce-resmi-berlaku-mulai-1-juli-2026-siapa-yang-kena)
- [Pedagang Online Kini Wajib Punya NIB — Pajakku](https://pajakku.com/artikel/pedagang-online-kini-wajib-punya-nib-ini-aturan-terbarunya)
- [Wajib Tahu! Apa Itu PSE Kominfo — Kontrak Hukum](https://kontrakhukum.com/article/wajib-tahu-apa-itu-pse-kominfo-mengapa-bisnis-digital-anda-harus-terdaftar-sekarang-juga/)

**Catatan penting:** Dokumen ini adalah riset awal untuk pemetaan kebutuhan bisnis, **bukan pengganti nasihat hukum profesional**. Sebelum go-live, sangat disarankan konsultasi dengan konsultan hukum/pajak untuk memastikan kepatuhan penuh dan menangani perubahan regulasi terbaru.
