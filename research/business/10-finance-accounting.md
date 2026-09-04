# 10. Finance & Accounting Operations

## Ringkasan

Dokumen ini mencakup operasional keuangan di balik layar — bagaimana dana dari transaksi pembeli direkonsiliasi, dicatat, dan dilaporkan. Menyambung dari [04-payment.md](04-payment.md) (dana masuk) dan [07-returns-refunds.md](07-returns-refunds.md) (dana keluar/refund), serta menjadi dasar kewajiban pajak di [11-legal-compliance.md](11-legal-compliance.md).

## Aktor yang Terlibat

- **Tim finance/akuntansi toko**
- **Payment gateway** — pihak yang melakukan settlement dana
- **Bank** — penerima akhir dana settlement
- **Kantor pajak (DJP)** — pelaporan & pembayaran pajak

## Alur Step-by-Step

### 1. Payment Settlement
- Payment gateway mengumpulkan dana dari berbagai metode pembayaran (VA, e-wallet, QRIS, kartu) dan mencairkannya (settle) ke rekening toko sesuai jadwal (umumnya H+1 hari kerja, bervariasi per metode & per PG)
- Fee MDR (merchant discount rate) dipotong otomatis oleh PG sebelum settlement

### 2. Reconciliation (Rekonsiliasi)
- Mencocokkan tiga sumber data: (a) catatan order di sistem toko, (b) laporan transaksi dari payment gateway, (c) mutasi rekening bank
- Tujuan: memastikan tidak ada selisih — semua order yang berstatus "paid" benar-benar punya dana yang settle, dan tidak ada dana masuk tanpa order terkait

### 3. Invoice & Bukti Transaksi
- Invoice/struk otomatis dikirim ke pembeli setelah order dikonfirmasi
- Untuk pembeli B2B/yang butuh, kemungkinan perlu faktur pajak resmi jika toko sudah PKP (Pengusaha Kena Pajak)

### 4. Cost Tracking
- **COGS (Cost of Goods Sold / HPP)** — harga pokok produk yang terjual, untuk kalkulasi margin kotor
- **Biaya operasional** — ongkir yang disubsidi toko, fee payment gateway, biaya marketing, biaya gudang/staf
- **Biaya retur** — ongkir retur, kerugian dari barang rusak/tidak terjual kembali

### 5. Refund & Cash Outflow
- Refund ke pembeli ([07-returns-refunds.md](07-returns-refunds.md)) dicatat sebagai pengurang pendapatan, diproses via PG (kembali ke metode asal) atau transfer manual

### 6. Financial Reporting
- Laporan penjualan harian/mingguan/bulanan (revenue, jumlah order, AOV — lihat [12-analytics-kpi.md](12-analytics-kpi.md))
- Laporan laba rugi sederhana (revenue - COGS - biaya operasional)
- Arus kas (cash flow) — penting terutama karena ada jeda waktu antara settlement PG dan kebutuhan bayar supplier/operasional

### 7. Tax Compliance
- Perhitungan & pelaporan pajak sesuai kewajiban toko (PPN, PPh) — detail lengkap di [11-legal-compliance.md](11-legal-compliance.md)

## Edge Case & Pengecualian

- **Selisih rekonsiliasi** — dana settle tidak sesuai catatan order (bisa karena fee tidak tercatat, refund ganda, dsb.) — perlu proses investigasi rutin
- **Refund lintas periode settlement** — order dibayar bulan ini, diretur bulan depan setelah dana sudah masuk laporan — perlu pencatatan penyesuaian (adjustment)
- **Perbedaan fee antar metode pembayaran** — margin produk bisa berbeda efektifnya tergantung metode bayar yang dipakai pembeli (kartu kredit dengan fee 2.9% vs transfer bank 0.7%)
- **Dana COD yang dikumpulkan kurir** — perlu proses penyetoran dari kurir ke toko yang terpisah dari alur payment gateway digital, dengan risiko keterlambatan/selisih setoran

## Keputusan Bisnis yang Perlu Diambil

1. Apakah toko akan menjadi PKP (Pengusaha Kena Pajak) sejak awal atau menunggu omzet mencapai ambang batas wajib PKP?
2. Software akuntansi apa yang dipakai (Accurate, Jurnal, Xero, atau custom terintegrasi dengan sistem toko)?
3. Siapa yang bertanggung jawab melakukan rekonsiliasi harian/mingguan?
4. Bagaimana kebijakan mengelola arus kas mengingat jeda settlement PG (H+1 atau lebih) sementara biaya operasional (supplier, gaji) berjalan terus?

## Konteks Indonesia

- Fee MDR bervariasi signifikan antar metode pembayaran (transfer bank/VA ±0.7-1%, kartu kredit ±2.9%) — perlu dipertimbangkan dalam kalkulasi margin produk.
- Jika toko juga berjualan di marketplace (Shopee/Tokopedia/TikTok Shop) sebagai kanal tambahan, sejak Juli-Agustus 2026 marketplace tersebut wajib memotong PPh final 0.5% secara otomatis untuk pedagang online dengan omzet tahunan Rp500 juta–Rp4,8 miliar (PMK Nomor 37 Tahun 2025) — ini berbeda dengan kewajiban pajak toko di website sendiri yang harus dihitung & disetor mandiri (lihat [11-legal-compliance.md](11-legal-compliance.md) dan [14-omnichannel.md](14-omnichannel.md)).
- Pedagang online (termasuk yang jualan lewat website sendiri) kini diwajibkan memiliki NIB (Nomor Induk Berusaha) sesuai Permendag No. 19 Tahun 2026 — legalitas usaha ini juga berdampak pada kewajiban pencatatan keuangan formal.

## Referensi

- [Pajak E-commerce Resmi Berlaku Mulai 1 Juli 2026 — Kompas](https://money.kompas.com/read/2026/07/01/104540626/pajak-e-commerce-resmi-berlaku-mulai-1-juli-2026-siapa-yang-kena)
- [Pedagang Online Kini Wajib Punya NIB — Pajakku](https://pajakku.com/artikel/pedagang-online-kini-wajib-punya-nib-ini-aturan-terbarunya)
- [Pajak E-Commerce Terbaru 2026 — Pegadaian](https://pegadaian.co.id/artikel/keuangan/pajak-e-commerce-terbaru-2026)
