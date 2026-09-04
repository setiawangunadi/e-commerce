# Model Data

Sumber kebenarannya [`apps/api/prisma/schema.prisma`](../apps/api/prisma/schema.prisma).
Dokumen ini menjelaskan yang tidak terbaca dari skema: kenapa kolomnya ada dan
apa yang akan rusak kalau diubah.

## Peta relasi

```
Category ──┐ (induk/anak, maks 2 tingkat)
           ├──▶ Product ──┬──▶ ProductVariant ──┐
           │              ├──▶ ProductImage     │
           │              └──▶ ProductLabel ──▶ Label
           │
Voucher ──┬──▶ VoucherProduct ──▶ Product
          └──▶ VoucherCategory ──▶ Category

Cart ──▶ CartItem ──▶ Product / ProductVariant

Customer ──┬──▶ CustomerAddress
           ├──▶ Order ──▶ OrderItem  (salinan data produk)
           └──▶ PointLedger

LandingPage ──▶ LandingBlock (konten: Json, divalidasi Zod)

AdminUser, Banner   (berdiri sendiri)
```

## Aturan yang melekat pada skema

### Uang disimpan sebagai `Int` Rupiah utuh

Semua kolom uang (`harga`, `ongkir`, `diskon`, `total`, `hpp`, `nilai`) bertipe
`Int`, bukan `Decimal` atau `Float`. Rupiah tidak dipakai dalam pecahan sen, jadi
tidak ada yang hilang — dan tidak ada risiko galat pembulatan float pada angka
yang menentukan berapa yang ditagih ke pembeli.

**Jangan mengubahnya ke Float.** Seluruh perhitungan di
[alur bisnis](05-alur-bisnis.md) mengandalkan aritmetika bilangan bulat.

### Berat dalam gram, dimensi dalam cm

`berat` bertipe `Int` dan wajib minimal 1 — ongkir tidak bisa dihitung tanpanya.
`panjang`/`lebar`/`tinggi` opsional, disiapkan untuk perhitungan berat volumetrik
bila nanti dibutuhkan.

---

## Katalog

### `Product`

| Kolom | Catatan |
|---|---|
| `sku` | unik seluruh tabel |
| `slug` | unik; dibuat dari nama, diberi sufiks angka bila bentrok |
| `hpp` | harga pokok penjualan — **tidak pernah** ikut ke endpoint publik |
| `stok` | **diabaikan** bila produk punya varian aktif |
| `stokMinimum` | ambang peringatan stok menipis di dashboard |
| `status` | `DRAFT` / `PUBLISHED` / `ARCHIVED` — hanya PUBLISHED yang terlihat publik |
| `publishedAt` | di-set sekali saat pertama terbit, lalu dipertahankan |
| `linkShopee` / `linkTiktok` | host-nya dibatasi ke domain resmi masing-masing |

`publishedAt` dipertahankan karena urutan katalog memakainya. Kalau di-set ulang
setiap kali produk diterbitkan lagi, produk lama akan melompat ke bagian
"terbaru" hanya karena disunting.

### `ProductVariant`

Ketika sebuah produk punya varian aktif, **stok dan SKU melekat pada varian** dan
kolom `stok` di produk induk tidak dipakai. Konsekuensinya di UI: produk bervarian
tidak bisa dimasukkan keranjang dari grid katalog — tombolnya menjadi "Pilih
Varian" yang mengarah ke halaman detail.

`harga` boleh `null`, artinya ikut harga produk induk.

### `Category`

Hanya **dua tingkat**: induk tidak boleh punya induk lagi. Dibatasi di
`AdminCategoriesService.pastikanIndukValid()`, bukan di skema, karena relasi
self-reference-nya sendiri tidak punya batas kedalaman. Rantai kategori lebih
dalam tidak bisa dirender rapi di navigasi maupun remah roti.

Kategori induk **mewakili isi anaknya** di dua tempat: penyaringan katalog
(membuka "Fashion" menampilkan produk sub-kategorinya) dan cakupan voucher.

Menghapus kategori tidak menghapus produknya — relasinya `SetNull`, jadi produknya
tetap ada tapi jadi tanpa kategori.

### `Label`

Lencana promosi ("Flash Sale", "Terlaris") dengan jadwal opsional. Penyaringan
jadwalnya dilakukan **di `product.mapper.ts`, bukan di query**, supaya satu produk
yang dimuat bersama produk lain tidak butuh query terpisah — dan lencananya
hilang sendiri begitu periodenya lewat, tanpa admin perlu mematikannya manual.

---

## Keranjang & pesanan

### `Cart` / `CartItem`

Dikenali `token` unik, bukan `customerId` — keranjang harus jalan untuk tamu.
`checkoutAt` diisi saat isinya berhasil jadi pesanan.

`CartItem` tidak menyimpan harga. Harga selalu dibaca dari produk/varian saat
keranjang ditampilkan, sehingga perubahan harga langsung terlihat pembeli sebelum
ia membayar.

### `Order`

Tabel paling banyak kolomnya, dan setiap kelompoknya punya alasan:

| Kelompok | Kolom | Kenapa |
|---|---|---|
| Identitas | `nomor`, `token` | nomor untuk manusia, token untuk akses tanpa login |
| Pembeli | `namaPembeli`, `emailPembeli`, `teleponPembeli` | **disalin**, bukan direferensikan — pesanan tamu tidak punya akun |
| Akun | `customerId` (nullable) | diisi bila pembeli sedang masuk, atau saat pesanan diklaim |
| Alamat | `alamatLengkap`, `provinsi`, … | disalin; alamat tersimpan bisa berubah setelahnya |
| Kurir | `kurir`, `layananKurir`, `namaLayanan`, `estimasiTiba`, `penyediaOngkir` | disalin untuk audit — tarif berubah, pesanan tidak |
| Uang | `subtotal`, `ongkir`, `diskon`, `potonganPoin`, `total` | rinciannya disimpan, bukan hanya totalnya |
| Pembayaran | `midtransOrderId`, `snapToken`, `metodePembayaran`, `dibayarPada` | `midtransOrderId` unik; dipakai webhook mencari pesanan |
| Penjaga | `stokSudahDikurangi` | memastikan stok hanya berkurang sekali |
| Atribusi | `utm*`, `landingSlug` | menghubungkan belanja iklan ke penjualan nyata |

`midtransOrderId` berbeda dari `nomor`: formatnya `{nomor}-{waktu-base36}`, karena
`order_id` Midtrans harus unik seumur akun sementara percobaan bayar ulang untuk
pesanan yang sama tetap harus bisa dibuat.

### `OrderItem`

**Menyimpan salinan data produk** — `namaProduk`, `namaVarian`, `sku`, `gambarUrl`,
`harga`, `berat`. Relasi ke `Product`/`ProductVariant` bersifat `SetNull` dan hanya
untuk penelusuran.

Ini disengaja: perubahan katalog setelahnya tidak boleh mengubah isi pesanan yang
sudah jadi. Produk yang harganya naik, namanya diganti, atau dihapus permanen
tidak boleh mengubah invoice yang sudah dikirim ke pembeli.

---

## Pelanggan & loyalty

### `Customer`

| Kolom | Catatan |
|---|---|
| `email` | unik, disimpan dalam huruf kecil |
| `passwordHash` | argon2id |
| `poin` | saldo berjalan — **selalu** diubah bersama satu baris `PointLedger` |
| `tier` | turunan dari `belanja12Bulan`, dihitung ulang oleh `segarkanTier()` |
| `belanja12Bulan` | jendela bergulir, bukan total seumur hidup |
| `aktif` | dinonaktifkan, tidak dihapus — riwayat pesanan harus tetap terbaca |

`poin` dan `belanja12Bulan` adalah nilai turunan yang disimpan. Kalau keduanya
pernah menyimpang dari kenyataan, `PointLedger` yang jadi rujukan:
`SUM(jumlah)` per pelanggan harus sama dengan saldonya.

### `PointLedger`

Buku besar poin. Setiap mutasi tercatat beserta `saldoSesudah`, sehingga riwayat
bisa diaudit tanpa menghitung ulang dari awal.

| `tipe` | Kapan |
|---|---|
| `EARN` | pesanan sampai di tangan pembeli (`ORDER_RECEIPT`) |
| `REDEEM` | dipakai sebagai potongan di checkout |
| `TO_VOUCHER` | ditukar jadi kode voucher |
| `REFUND` | dikembalikan karena pesanan batal |
| `ADJUST` | penyesuaian manual admin — alasan dan pelakunya wajib tercatat |

Kunci unik `(orderId, tipe)` yang membuat pengkreditan poin **idempoten**. Ini
penting: sinkronisasi status Midtrans bisa berjalan berkali-kali untuk pesanan
yang sama, dan pengecekan di level aplikasi bisa kalah balapan.

### `CustomerAddress`

Maksimal 20 per akun. Tepat satu boleh `utama` — dijaga di service, bukan di
skema, karena constraint parsial unik akan menyulitkan proses pemindahan
penanda utama. Saat alamat utama dihapus, penggantinya ditunjuk otomatis:
checkout mengandalkan adanya alamat utama.

---

## Landing page

### `LandingBlock.konten` bertipe `Json`

Kolom Json bisa berarti "apa saja", dan itu berbahaya untuk data yang nanti
dirender ke halaman publik. Karena itu **skema Zod di
[`blok.skema.ts`](../apps/api/src/landing/blok.skema.ts) adalah satu-satunya yang
menentukan apa yang boleh masuk**, divalidasi sebelum menyentuh database.

Dua pembatasan yang penting:

- **Tautan tombol hanya boleh path internal** (`/produk`, bukan `https://...`).
  Landing page adalah tujuan iklan berbayar; tautan keluar sembarang di sana
  adalah jalan pintas phishing bila akun admin dibajak.
- **URL gambar hanya `http(s)` atau path internal**, menutup `javascript:` dan
  `data:`.

Isi blok dirender sebagai **teks, tidak pernah sebagai markup**, jadi tidak ada
jalur XSS lewat kolom ini.

---

## Migrasi

Berada di [`apps/api/prisma/migrations/`](../apps/api/prisma/migrations/) dan
**wajib ikut di-commit**.

```bash
npm run db:migrate                          # development — membuat migrasi baru + menerapkannya
(cd apps/api && npx prisma migrate deploy)  # produksi — hanya menerapkan yang sudah ada
```

Perintah Prisma yang menyentuh database **harus dijalankan dari `apps/api`**.
Prisma 7 memindahkan konfigurasi datasource ke `prisma.config.ts`, dan berkas itu
dicari dari direktori kerja — dari akar repo, `--schema` saja tidak cukup.

CI menjalankan migrasi di database kosong pada setiap PR, lalu memeriksa dengan
`prisma migrate diff` bahwa tidak ada perubahan `schema.prisma` yang belum
dibuatkan migrasinya. Itu penyebab paling umum dari "jalan di lokal, gagal saat
deploy".

`src/generated/` **tidak** di-commit — di-generate ulang lewat `prisma generate`.
