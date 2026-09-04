# Alur Bisnis

Dokumen terpenting di folder ini. Isinya aturan yang menentukan berapa uang yang
berpindah dan barang apa yang keluar dari gudang. Sebagian besar dijaga unit test
— nama testnya disebutkan supaya mudah dicari saat mengubah sesuatu.

## Alur belanja

```
Katalog → Keranjang → Checkout (alamat + ongkir + voucher/poin)
       → Midtrans Snap → Status pesanan
```

Belanja **tidak butuh akun**. Guest checkout adalah jalur utama, sesuai praktik
umum e-commerce Indonesia di `research/business/03-cart-checkout.md`. Akun
menambah riwayat pesanan, alamat tersimpan, dan poin — bukan syarat membeli.

---

## Aturan uang

> **Tidak ada satu pun nilai uang yang dipercaya dari browser.**

Ini aturan tunggal yang paling penting di seluruh sistem. Client hanya mengirim
*pengenal*: kode layanan kurir, kode voucher, jumlah poin. Setiap nominal
dihitung ulang di server saat pesanan dibuat.

| Nilai | Sumber kebenarannya |
|---|---|
| Harga barang | dibaca ulang dari katalog, bukan dari keranjang |
| Ongkir | divalidasi ulang ke penyedia lewat `pastikanOpsiValid()` |
| Diskon voucher | dihitung ulang dari kodenya oleh `VoucherService` |
| Potongan poin | dihitung ulang dari jumlah poin oleh `LoyaltyService` |

`BuatOrderDto` memakai `forbidNonWhitelisted`, jadi request yang menyelipkan
kolom `diskon` atau `total` **ditolak**, bukan diabaikan diam-diam. Dijaga test
`"MENOLAK client yang mencoba mengirim nominal diskon atau total sendiri"`.

### Rumus total

```
total = max(0, subtotal − diskonVoucher − potonganPoin) + ongkir
```

Perhatikan `max(0, ...)` mengurung **hanya nilai barang**. Ongkir ditambahkan di
luar kurungan, jadi **potongan tidak pernah bisa menutup ongkir** — pengiriman
adalah biaya nyata yang tetap ditagih kurir apa pun promonya. Dijaga test
`"tidak pernah membiarkan potongan menutup ongkir"`.

### Nomor pesanan

Berurutan per hari: `INV-20260817-0001`. Dihasilkan di dalam transaksi pembuatan
pesanan dengan membaca nomor terakhir hari itu.

Pesanan juga mendapat `token` acak 24 byte. Halaman status hanya bisa dibuka bila
nomor **dan** token cocok — nomornya berurutan dan mudah ditebak, sedangkan
halamannya berisi alamat rumah pembeli.

---

## Stok

Stok dicek **tiga kali** dan dikurangi **sekali**:

| Kapan | Di mana | Kenapa |
|---|---|---|
| Saat masuk keranjang | `CartService.tambah` | umpan balik langsung ke pembeli |
| Saat keranjang dibaca | `CartService.rangkum` | menandai baris yang stoknya berubah |
| Di dalam transaksi pesanan | `OrderService.buatDariKeranjang` | antara buka checkout dan tekan bayar, stok bisa diambil orang lain |

**Pengurangannya baru terjadi saat pembayaran benar-benar lunas**, bukan saat
pesanan dibuat. Alasannya: pesanan yang tidak dibayar jauh lebih banyak daripada
yang dibayar, dan menahan stok untuk semuanya membuat barang terlihat habis
padahal tersedia.

Penjaganya kolom `stokSudahDikurangi` di tabel `Order`. Webhook Midtrans
dirancang *at-least-once* — notifikasi ganda itu normal, dan tanpa penanda ini
stok akan berkurang dua kali. Dijaga test
`"tidak mengurangi stok dua kali walau Midtrans mengirim notifikasi berulang"`.

**Membatalkan pesanan yang sudah lunas mengembalikan stoknya**, dan penandanya
diturunkan lagi supaya tidak dikembalikan berulang.

Untuk produk bervarian, stok melekat pada **varian**, bukan produk induk. Stok
produk = total stok varian aktif; isian stok di tingkat produk diabaikan.

---

## Status pesanan

| Status | Artinya | Siapa yang memindahkan |
|---|---|---|
| `WAITING_PAYMENT` | Menunggu pembayaran | — |
| `PAYMENT_SUCCESS` | Sudah dibayar, siap dikemas | **Webhook Midtrans saja** |
| `PROCESS_ORDER` | Sedang dikemas di gudang | Admin |
| `ORDER_SEND` | Sudah diserahkan ke kurir | Admin (wajib isi resi) |
| `ORDER_RECEIPT` | Diterima pembeli, selesai | Admin |
| `ORDER_CANCELLED` | Dibatalkan | Admin, atau pembayaran ditolak |
| `PAYMENT_EXPIRED` | Lewat batas bayar | Cron / dibaca saat halaman dibuka |

### Transisi yang diizinkan

```
WAITING_PAYMENT ──────────────────────────▶ ORDER_CANCELLED
       │
       │ (hanya lewat Midtrans)
       ▼
PAYMENT_SUCCESS ──▶ PROCESS_ORDER ──▶ ORDER_SEND ──▶ ORDER_RECEIPT
       │                   │                              (final)
       └───────────────────┴──────────────▶ ORDER_CANCELLED
                                                  (final)
```

Aturannya ada di satu tempat — konstanta `TRANSISI` di
[`admin-orders.service.ts`](../apps/api/src/order/admin-orders.service.ts).
Panel admin hanya menampilkan pilihan yang dikirim API lewat `statusBerikutnya`,
dan API tetap menolak transisi tidak sah walau tombolnya dipaksa muncul dari
browser.

Dua aturan yang melekat:

**1. Pelunasan tidak bisa dilakukan manual.**
`WAITING_PAYMENT → PAYMENT_SUCCESS` tidak ada di tabel transisi. Satu-satunya
jalan adalah notifikasi Midtrans, supaya catatan uang tidak pernah menyimpang
dari kenyataan. Dijaga test `"MENOLAK admin melunasi pesanan secara manual"`.

**2. Nomor resi wajib saat pesanan dikirim.**
Tanpa resi pembeli tidak punya cara melacak, dan itu pertanyaan nomor satu ke
customer service.

Pesanan yang sudah `ORDER_RECEIPT`, `ORDER_CANCELLED`, atau `PAYMENT_EXPIRED`
bersifat **final** dan tidak bisa diubah lagi.

---

## Pembayaran

### Keamanan webhook

`POST /api/v1/pembayaran/midtrans/notifikasi` terbuka ke internet tanpa
autentikasi. Keasliannya dijamin dua pemeriksaan berlapis:

1. **Signature** — SHA512(`order_id` + `status_code` + `gross_amount` + server key).
   Tanpa ini siapa pun bisa mengirim POST palsu dan menandai pesanan sebagai lunas.
2. **Nominal** — `gross_amount` harus sama persis dengan total pesanan. Ini
   menutup *replay*: notifikasi yang sah dari transaksi Rp10.000 tidak bisa
   dipakai ulang untuk melunasi pesanan Rp2.000.000.

Pemeriksaan signature dilakukan **sebelum menyentuh database sama sekali** —
dijaga test `"memeriksa signature sebelum menyentuh database sama sekali"`.

Aturan tambahan: **pesanan yang sudah lunas tidak pernah diturunkan statusnya**
oleh notifikasi susulan. Notifikasi `expire` yang datang terlambat tidak boleh
membatalkan pesanan yang uangnya sudah masuk.

### Pemetaan status Midtrans

| `transaction_status` | `fraud_status` | Hasil internal |
|---|---|---|
| `settlement` | — | LUNAS |
| `capture` | — / `accept` | LUNAS |
| `capture` | `challenge` | DITANTANG |
| `capture` | `deny` | GAGAL |
| `pending` | — | MENUNGGU |
| `deny` / `cancel` / `failure` | — | GAGAL |
| `expire` | — | KEDALUWARSA |
| *tidak dikenal* | — | MENUNGGU |

Status asing sengaja jatuh ke MENUNGGU, bukan LUNAS: menebak "lunas" akan
melepas barang tanpa uang, sedangkan menunggu paling buruk hanya menunda.

### Kalau webhook tidak sampai

Webhook bisa gagal sampai — Notification URL belum dipasang, server sempat mati,
jaringan putus. Karena itu status juga bisa **ditarik langsung dari Midtrans**,
memakai logika yang persis sama (termasuk pencocokan nominal dan pengurangan stok
sekali saja). Ada tiga pemicunya:

1. **Otomatis** saat pembeli membuka halaman status dan pembayarannya masih menunggu.
2. **Otomatis** sebelum cron menghanguskan pesanan kedaluwarsa.
3. **Manual** lewat tombol "Cek Status ke Midtrans" di detail pesanan admin.

Kegagalan menghubungi Midtrans tidak menjatuhkan halaman — pembeli tetap melihat
pesanannya dengan status terakhir yang tercatat.

### Batas waktu bayar

Diatur `BATAS_BAYAR_MENIT` (bawaan 1440 = 24 jam). Dievaluasi di dua tempat:
cron tiap 10 menit, dan **saat halaman status dibaca** — sehingga status yang
dilihat pembeli selalu benar walau cron belum sempat jalan.

---

## Voucher

`VoucherService.hitungPotongan()` dipanggil dua kali: sekali untuk pratinjau di
checkout, sekali lagi saat pesanan dibuat. Urutan pemeriksaannya:

1. Kode ada dan aktif → kalau tidak: **"Kode voucher tidak berlaku"**
2. Sudah masuk jadwal `mulai`/`selesai`
3. Kuota belum habis
4. Ada isi keranjang yang tercakup
5. Subtotal yang tercakup ≥ `minBelanja`

**Pesan untuk kode tidak ada dan kode nonaktif sengaja sama persis.** Membedakannya
memberi tahu orang mana kode yang benar tapi sedang dimatikan — cukup untuk
menebak-nebak kode kampanye berikutnya.

### Cakupan

Voucher tanpa cakupan berlaku untuk seluruh keranjang. Bila dibatasi ke produk
atau kategori tertentu, hanya item yang cocok yang dihitung.

**Kategori induk ikut mencakup sub-kategorinya.** Voucher yang dipasang ke
"Fashion" berlaku juga untuk produk di "Pakaian Pria" — tanpa ini, admin yang
memilih induk akan mengira vouchernya aktif padahal tidak pernah kena satu produk
pun.

**Minimal belanja diukur dari subtotal yang tercakup**, bukan seluruh keranjang.
Kalau tidak, voucher khusus satu produk bisa "dibuka" hanya dengan menambah
barang lain yang sebenarnya tidak termasuk cakupannya.

### Perhitungan

| Tipe | Rumus | Batas |
|---|---|---|
| `PERSEN` | `floor(subtotalBerlaku × nilai / 100)` | `maksPotongan` bila diisi |
| `NOMINAL` | `nilai` | — |

Keduanya lalu dibatasi lagi ke `subtotalBerlaku` — pembeli tidak pernah "ditagih
minus", dan ongkir tetap harus dibayar.

### Kuota

Dinaikkan **di dalam transaksi yang sama** dengan pembuatan pesanan, dengan
pengecekan kuota sekali lagi. Tanpa itu, dua pembeli yang menekan bayar bersamaan
sama-sama lolos pada kuota terakhir.

---

## Program loyalty

Aturannya terkumpul di [`loyalty.config.ts`](../apps/api/src/customer/loyalty.config.ts).
Angka-angka ini langsung menentukan biaya program, jadi sengaja tidak tersebar.

### Perolehan poin

- **Rp10.000 belanja = 1 poin**, dikalikan pengali tier.
- Dihitung dari **nilai barang setelah seluruh potongan**, bukan subtotal kotor.
  Kalau tidak, pesanan yang dibayar sebagian besar dengan poin akan menghasilkan
  poin baru hampir sebanyak yang barusan dipakai.
- **Dikreditkan saat status jadi `ORDER_RECEIPT`**, bukan saat pembayaran
  berhasil. Menunggu sampai barang sampai membuat pembatalan dan refund tidak
  pernah perlu menarik poin yang mungkin sudah dibelanjakan.
- Aman dipanggil berulang: penjaganya kunci unik `(orderId, tipe)` di
  `PointLedger`, bukan pengecekan di aplikasi yang bisa kalah balapan.

### Tier

Berdasarkan belanja **12 bulan terakhir** (jendela bergulir, bukan seumur hidup),
supaya tier mencerminkan pelanggan yang masih aktif.

| Tier | Ambang belanja 12 bulan | Pengali poin |
|---|---|---|
| Bronze | Rp0 | 1× |
| Silver | Rp2.000.000 | 1,25× |
| Gold | Rp6.000.000 | 1,5× |
| Platinum | Rp15.000.000 | 2× |

**Pengali poin sengaja satu-satunya manfaat tier.** Menambah diskon otomatis per
tier akan bertabrakan dengan voucher dan potongan poin, dan riset menandai
penumpukan promo sebagai risiko yang perlu aturan jelas lebih dulu
(`research/business/09-marketing-promotion.md`).

### Penukaran poin

- **1 poin = Rp100** saat ditukar (tingkat balik modal 1%).
- **Maksimal 50% dari subtotal** per transaksi. Tanpa batas ini, pelanggan lama
  bisa membayar nyaris nol sementara toko tetap menanggung ongkir dan biaya
  payment gateway.
- Batasnya dihitung dari subtotal **setelah voucher** — voucher dipakai dulu,
  poin hanya menutupi separuh sisanya.
- Pengurangan saldonya bersyarat (`poin: { gte: ... }`), jadi dua checkout
  bersamaan tidak bisa memakai poin yang sama.
- **Poin dikembalikan bila pesanan dibatalkan** — pembeli tidak boleh kehilangan
  poin untuk barang yang tidak pernah diterima.

### Tukar poin jadi voucher

Minimal 100 poin, berlaku 90 hari, kuota 1. Kodenya `POIN` + 8 karakter acak
dari `randomInt` (bukan `Math.random` — kode ini bernilai uang dan tidak boleh
bisa ditebak dari kode lain), tanpa karakter yang mudah tertukar saat dibacakan
(`0`/`O`, `1`/`I`).

`minBelanja` voucher di-set sama dengan nilainya sendiri, supaya voucher Rp50.000
tidak bisa dipakai untuk belanja Rp10.000.

---

## Ongkir

Dua penyedia dengan satu antarmuka (`PenyediaOngkir`):

| Penyedia | Kapan dipakai |
|---|---|
| `biteship` | `BITESHIP_API_KEY` **dan** titik asal gudang terisi |
| `tarif-lokal` | selain itu, atau saat Biteship gagal dihubungi |

**Checkout tidak boleh gagal total hanya karena API kurir down.** Bila Biteship
error atau tidak mengembalikan opsi apa pun, sistem otomatis jatuh ke tarif lokal
dengan catatan yang jujur ke pembeli.

### Tarif lokal

Tabel per zona provinsi, dihitung sepenuhnya di dalam aplikasi:

| Zona | Wilayah | Tarif reguler/kg |
|---|---|---|
| 1 | Jakarta, Jawa Barat, Banten | Rp10.000 |
| 2 | Jawa Tengah, DIY, Jawa Timur | Rp14.000 |
| 3 | Sumatera, Bali, NTB | Rp22.000 |
| 4 | Kalimantan, Sulawesi, NTT | Rp32.000 |
| 5 | Maluku, Papua | Rp55.000 |

Pemetaannya lewat **kode provinsi**, bukan namanya — "DKI Jakarta" dan "Daerah
Khusus Ibukota Jakarta" harus menghasilkan tarif yang sama. Provinsi tak dikenal
jatuh ke zona 3 sebagai default aman.

Berat ditagih per kilogram dibulatkan ke atas, minimal 1 kg, dan ongkirnya
dibulatkan ke kelipatan Rp500.

### Validasi alamat

Kota diperiksa **terhadap provinsinya**, bukan sekadar "tidak kosong". Kombinasi
mustahil (Denpasar di Aceh) berarti alamatnya salah dan ongkirnya pasti meleset.
Kecamatan opsional, tapi bila diisi harus cocok dengan kotanya. Batas berat
50 kg; di atas itu masuk layanan kargo.

---

## Keranjang

Dikenali token acak di cookie httpOnly. Baris yang bermasalah **tidak dihapus
otomatis** — pembeli berhak tahu apa yang berubah sejak terakhir kali ia
menambahkannya (`research/business/03-cart-checkout.md`).

Dua jenis masalah yang ditandai:

- `tidakTersedia` — produk sudah tidak terbit atau variannya dinonaktifkan
- `melebihiStok` — jumlah di keranjang melebihi stok sekarang

Selama `adaMasalah` bernilai true, **checkout diblokir**. Item bermasalah tidak
ikut dihitung dalam subtotal maupun berat.

Batas 99 buah per produk. Kepemilikan item diperiksa terhadap token keranjang —
tanpa itu, menebak id item sudah cukup untuk mengubah keranjang orang lain.

---

## Atribusi iklan

Parameter `utm_*` direkam saat pengunjung mendarat, disimpan di `sessionStorage`,
dan **ikut tersimpan di baris pesanan**. Dengan begitu belanja iklan bisa dinilai
dari penjualan nyata, bukan dari klik saja.

**Kunjungan pertama yang menang**: pembeli yang datang dari iklan lalu berkeliling
situs tidak kehilangan kampanye asalnya.

Atribusi disimpan **tanpa menunggu persetujuan cookie** karena ini bukan
pelacakan lintas situs — hanya catatan internal asal pesanan, setara nomor
referensi. Yang menunggu persetujuan adalah skrip Meta Pixel dan Google gtag;
lihat [frontend](06-frontend.md#persetujuan-cookie-dan-tracking).
