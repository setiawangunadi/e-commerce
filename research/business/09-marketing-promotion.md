# 09. Marketing, Promosi & Retensi Pelanggan

## Ringkasan

Dokumen ini mencakup bagaimana toko menarik pembeli baru dan membuat pembeli lama kembali belanja — mekanisme promo/diskon di dalam sistem, serta strategi pemasaran di luar sistem yang berhubungan dengan flow [01-customer-journey.md](01-customer-journey.md) (akuisisi) dan mendukung retensi pasca-[06-order-management.md](06-order-management.md).

## Aktor yang Terlibat

- **Tim marketing** — merancang & mengelola campaign
- **Sistem promo engine** — validasi & penerapan diskon/voucher
- **Pembeli** — penerima promo, peserta program loyalty

## Alur Step-by-Step

### 1. Mekanisme Promo di Sistem

- **Voucher/kode diskon** — persentase atau nominal tetap, dengan syarat (minimum belanja, kategori tertentu, khusus pembeli baru, dsb.)
- **Diskon otomatis** — berlaku tanpa kode, langsung terpotong di harga produk atau saat checkout
- **Flash sale** — diskon besar dalam waktu terbatas, biasanya butuh mekanisme khusus untuk stok terbatas & antisipasi lonjakan trafik
- **Bundling** — beli paket beberapa produk dengan harga lebih murah dari beli satuan
- **Gratis ongkir** — dengan syarat minimum belanja atau area tertentu, terintegrasi dengan [05-shipping-fulfillment.md](05-shipping-fulfillment.md)
- **Cashback/poin** — dana/poin kembali setelah transaksi, bisa dipakai belanja berikutnya

### 2. Loyalty & Membership Program
- Sistem poin — dapat poin dari setiap transaksi, ditukar diskon/produk
- Tier membership (misal Silver/Gold/Platinum) — benefit meningkat sesuai total belanja
- Member-exclusive access — akses lebih awal ke flash sale/produk baru

### 3. Referral Program
- Pembeli mengajak teman dengan kode referral, keduanya dapat insentif (diskon/poin)

### 4. Retensi & Reactivation
- **Cart abandonment recovery** — email/WhatsApp reminder ke pembeli yang meninggalkan cart tanpa checkout (lihat [03-cart-checkout.md](03-cart-checkout.md))
- **Win-back campaign** — target pembeli lama yang sudah lama tidak transaksi
- **Post-purchase upsell/cross-sell** — rekomendasi produk terkait setelah pembelian selesai
- **Review request** — insentif kecil (poin/voucher) untuk mendorong pembeli memberi ulasan setelah order selesai ([06-order-management.md](06-order-management.md))

### 5. Kanal Marketing (di luar sistem toko)
- **SEO & content marketing** — blog, artikel, panduan produk
- **Paid ads** — Google Ads, Meta Ads, TikTok Ads
- **Email marketing** — newsletter, campaign promo, automated flow (welcome email, abandoned cart, win-back)
- **Social media organic** — Instagram, TikTok, konten produk & UGC (user-generated content)
- **Influencer/affiliate marketing** — kerja sama dengan konten kreator untuk jangkauan lebih luas
- **Push notification/WhatsApp broadcast** — untuk pembeli yang sudah opt-in

## Edge Case & Pengecualian

- **Kombinasi banyak promo sekaligus** (voucher + poin + gratis ongkir) — perlu aturan jelas urutan penerapan & apakah bisa ditumpuk (stacking)
- **Penyalahgunaan promo** — satu orang buat banyak akun untuk klaim promo "khusus pembeli baru" berulang kali; perlu deteksi (misal cek nomor telepon/device fingerprint)
- **Flash sale menyebabkan lonjakan trafik/overselling** — perlu antisipasi kapasitas sistem & mekanisme antrian/locking stok yang ketat (lihat [02-catalog-inventory.md](02-catalog-inventory.md))
- **Voucher kedaluwarsa saat masih di cart** — perlu validasi ulang saat checkout, bukan hanya saat kode dimasukkan
- **Retur produk yang dibeli dengan promo** — bagaimana menghitung nilai refund (lihat [07-returns-refunds.md](07-returns-refunds.md))

## Keputusan Bisnis yang Perlu Diambil

1. Jenis promo apa yang jadi prioritas MVP — voucher kode manual, diskon otomatis, atau keduanya?
2. Apakah butuh program loyalty/poin sejak awal, atau bisa menyusul setelah basis pelanggan cukup besar?
3. Bagaimana kebijakan anti-abuse untuk promo pembeli baru?
4. Apakah promo bisa digabung (stacking) atau hanya satu jenis promo per transaksi?
5. Budget & kanal marketing mana yang jadi prioritas awal (organik dulu vs langsung paid ads)?

## Konteks Indonesia

- Budaya "cari promo" sangat kuat di kalangan pembeli online Indonesia — kampanye tanggal kembar (misal periode promo besar tahunan) adalah momentum penting yang perlu direncanakan jauh-jauh hari dari sisi stok & kapasitas sistem.
- WhatsApp broadcast/blast masih jadi kanal retensi yang efektif dan murah dibanding push notification app native, terutama untuk basis pelanggan yang lebih terbiasa WhatsApp daripada email.
- Live shopping (TikTok Live, Instagram Live) semakin jadi kanal promosi dan penjualan langsung yang efektif di Indonesia, meski transaksinya bisa terjadi di platform sosial itu sendiri atau diarahkan ke website (lihat [14-omnichannel.md](14-omnichannel.md)).

## Referensi

- Praktik umum marketing & retensi e-commerce, dengan penyesuaian pola kampanye musiman dan kanal retensi (WhatsApp, live shopping) yang relevan di Indonesia.
