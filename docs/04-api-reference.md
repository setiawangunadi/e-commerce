# Referensi API

Base URL: `{PUBLIC_BASE_URL}/api/v1`

Semua response memakai envelope yang sama:

```json
{ "data": ..., "error": null, "meta": null }
```

Galat memakai bentuk yang sama dengan `data: null` dan `error` terisi:

```json
{ "data": null, "error": { "code": "NOT_FOUND", "message": "Produk tidak ditemukan" }, "meta": null }
```

`error.details` hanya muncul untuk galat validasi, berisi array pesan per kolom.

## Autentikasi

| Jenis | Header | Diperoleh dari |
|---|---|---|
| Admin | `Authorization: Bearer <token>` | `POST /auth/login` |
| Pelanggan | `Authorization: Bearer <token>` | `POST /pelanggan/masuk` atau `/pelanggan/daftar` |
| Keranjang tamu | `X-Cart-Token: <token>` | dibuat frontend, disimpan di cookie httpOnly |

Token admin dan pelanggan tidak bisa saling menggantikan — dipisahkan klaim
`aud`. Lihat [arsitektur](01-arsitektur.md#autentikasi-dua-jenis-token-satu-rahasia).

## Pembatasan laju

| Kelompok | Batas bawaan | Diatur oleh |
|---|---|---|
| Endpoint umum | 300/menit/IP | `RATE_LIMIT_UMUM` |
| Login & pendaftaran | 10/menit/IP | `RATE_LIMIT_LOGIN` |
| `/health/*` | tanpa batas | — |

Melebihi batas menghasilkan `429` dengan `error.code: "TOO_MANY_REQUESTS"`.

---

## Kesehatan

| Method | Path | Kegunaan |
|---|---|---|
| GET | `/health/live` | proses hidup — **tidak** menyentuh database |
| GET | `/health/ready` | siap menerima trafik — menyentuh database |
| GET | `/health` | alias `/health/ready` |

Pisahkan penggunaannya: `live` untuk keputusan restart, `ready` untuk rotasi load
balancer. Memakai `ready` sebagai liveness membuat database yang lambat memicu
restart beruntun yang justru memperparah keadaan.

---

## Publik — katalog

| Method | Path | Query |
|---|---|---|
| GET | `/catalog/beranda` | — |
| GET | `/catalog/banner` | — |
| GET | `/catalog/kategori` | — |
| GET | `/catalog/produk` | `page`, `limit`, `kategori`, `q` |
| GET | `/catalog/produk/:slug` | — |
| GET | `/landing/:slug` | — |

`/catalog/beranda` mengembalikan seluruh data halaman home dalam satu panggilan
(banner, kategori, produk unggulan, produk terbaru, total produk) supaya Server
Component Next.js cukup sekali fetch.

**`hpp` tidak pernah muncul di endpoint publik mana pun.** Hanya produk berstatus
`PUBLISHED` yang terlihat — membuka slug produk draft menghasilkan 404.

Endpoint berpaginasi mengisi `meta`:

```json
"meta": { "page": 1, "limit": 12, "total": 47, "totalHalaman": 4 }
```

---

## Publik — keranjang

Semuanya menuntut header `X-Cart-Token`.

| Method | Path | Body |
|---|---|---|
| GET | `/keranjang` | — |
| POST | `/keranjang/item` | `{ produkId, varianId?, jumlah }` |
| PATCH | `/keranjang/item/:id` | `{ jumlah }` |
| DELETE | `/keranjang/item/:id` | — |
| DELETE | `/keranjang` | — |
| POST | `/keranjang/voucher` | `{ kode }` — pratinjau potongan |

`/keranjang/voucher` hanya menghitung; vouchernya baru benar-benar terpakai saat
pesanan dibuat.

Response keranjang menyertakan penanda per baris (`tidakTersedia`, `melebihiStok`,
`stokTersedia`) dan `adaMasalah` di tingkat keranjang. Selama `adaMasalah` bernilai
true, pembuatan pesanan ditolak dengan `409`.

---

## Publik — pengiriman

| Method | Path | Query / Body |
|---|---|---|
| GET | `/pengiriman/provinsi` | — |
| GET | `/pengiriman/kota` | `provinsi` |
| GET | `/pengiriman/kecamatan` | `provinsi`, `kota` |
| POST | `/pengiriman/ongkir` | `{ provinsi, kota, kecamatan?, kodePos, berat, nilaiBarang }` |

Response ongkir:

```json
{
  "opsi": [
    { "kode": "jne:REG", "kurir": "JNE", "layanan": "REG", "nama": "Reguler",
      "deskripsi": "Estimasi 2-3 hari kerja", "estimasi": "2-3 hari", "ongkir": 20000 }
  ],
  "penyedia": "tarif-lokal",
  "catatan": "Tarif perkiraan. Isi BITESHIP_API_KEY untuk memakai tarif kurir sungguhan."
}
```

`catatan` hanya ada bila tarifnya perkiraan. Client menyimpan **`kode`**, bukan
nominalnya — ongkir dihitung ulang saat pesanan dibuat.

---

## Publik — pesanan & pembayaran

| Method | Path | Catatan |
|---|---|---|
| POST | `/pesanan` | butuh `X-Cart-Token`; token pelanggan opsional |
| GET | `/pesanan/:nomor?token=` | token wajib cocok |
| POST | `/pesanan/:nomor/bayar` | mengembalikan token Snap |
| GET | `/pembayaran/status-konfigurasi` | `{ midtransSiap: boolean }` |
| POST | `/pembayaran/midtrans/notifikasi` | webhook Midtrans |

### `POST /pesanan`

```json
{
  "nama": "Budi Santoso",
  "email": "budi@contoh.id",
  "telepon": "081234567890",
  "alamatLengkap": "Jl. Merdeka No. 1, RT 01 RW 02",
  "provinsi": "Jawa Barat",
  "kota": "Kota Bandung",
  "kecamatan": "Coblong",
  "kodePos": "40111",
  "catatan": "Titip di pos satpam",
  "kodeOngkir": "jne:REG",
  "kodeVoucher": "HEMAT10",
  "poinDipakai": 500,
  "utmSource": "facebook",
  "landingSlug": "promo-agustus"
}
```

**Yang tidak boleh dikirim:** `diskon`, `total`, `ongkir`, atau nominal apa pun.
DTO memakai `forbidNonWhitelisted` — kolom asing menghasilkan `400`, bukan
diabaikan diam-diam.

`poinDipakai` diabaikan bila tidak ada token pelanggan.

Galat yang mungkin:

| Kode | Sebab |
|---|---|
| `400` | keranjang kosong, voucher tidak berlaku, poin melebihi batas, kode ongkir tidak sah |
| `409` | ada item bermasalah di keranjang, atau stok berubah saat checkout |

### `POST /pembayaran/midtrans/notifikasi`

Tanpa autentikasi biasa. Keasliannya dijamin signature dan pencocokan nominal —
lihat [alur bisnis](05-alur-bisnis.md#keamanan-webhook).

Selalu membalas `200` untuk pesan yang sah tapi tidak relevan (pesanan tidak
dikenal), supaya Midtrans berhenti mencoba ulang. Signature tidak valid → `403`.

---

## Pelanggan

Tanpa autentikasi:

| Method | Path | Catatan |
|---|---|---|
| POST | `/pelanggan/daftar` | dibatasi laju |
| POST | `/pelanggan/masuk` | dibatasi laju |
| GET | `/pelanggan/tier` | aturan program loyalty |

Butuh token pelanggan:

| Method | Path |
|---|---|
| GET / PATCH | `/pelanggan/saya` |
| POST | `/pelanggan/saya/sandi` |
| GET / POST | `/pelanggan/alamat` |
| PATCH / DELETE | `/pelanggan/alamat/:id` |
| GET | `/pelanggan/pesanan` |
| GET | `/pelanggan/loyalty` |
| GET | `/pelanggan/loyalty/mutasi` |
| POST | `/pelanggan/loyalty/tukar-voucher` |

Ganti sandi tetap menuntut sandi lama walau sesinya sudah terverifikasi — itu
yang menghalangi orang yang menemukan perangkat tak terkunci untuk mengunci
pemiliknya keluar dari akunnya sendiri.

---

## Admin

Semuanya butuh `Authorization: Bearer <token>` admin. Yang bertanda **ADMIN**
ditolak untuk peran STAFF.

### Auth

| Method | Path |
|---|---|
| POST | `/auth/login` |
| GET | `/auth/me` |

### Dashboard & pesanan

| Method | Path | Kegunaan |
|---|---|---|
| GET | `/admin/ringkasan` | statistik katalog & penjualan |
| GET | `/admin/pesanan` | `status`, `q`, `page`, `limit` |
| GET | `/admin/pesanan/:id` | termasuk `statusBerikutnya` yang sah |
| PATCH | `/admin/pesanan/:id/status` | `{ status, nomorResi? }` |
| PATCH | `/admin/pesanan/:id/resi` | `{ nomorResi }` |
| POST | `/admin/pesanan/:id/sinkron` | tarik status dari Midtrans |

`statusBerikutnya` adalah satu-satunya sumber tombol perpindahan status di panel.
API tetap menolak transisi tidak sah walau tombolnya dipaksa muncul.

### Katalog

| Method | Path | Peran |
|---|---|---|
| GET / POST | `/admin/produk` | STAFF |
| GET / PATCH | `/admin/produk/:id` | STAFF |
| DELETE | `/admin/produk/:id` | **ADMIN** |
| GET | `/admin/kategori` | STAFF |
| POST / PATCH / DELETE | `/admin/kategori`, `/admin/kategori/:id` | **ADMIN** |
| GET / POST | `/admin/label` | STAFF |
| PATCH | `/admin/label/:id` | STAFF |
| DELETE | `/admin/label/:id` | **ADMIN** |
| POST | `/admin/upload` | STAFF — multipart, maks 5 MB |

Daftar produk admin menampilkan draft dan arsip juga, lengkap dengan `hpp`,
`stokProduk`, dan `stokMenipis`.

### Banner & landing page

| Method | Path | Peran |
|---|---|---|
| GET / POST | `/admin/banner` | STAFF |
| GET / PATCH | `/admin/banner/:id` | STAFF |
| DELETE | `/admin/banner/:id` | **ADMIN** |
| GET / POST | `/admin/landing` | STAFF |
| GET / PATCH | `/admin/landing/:id` | STAFF |
| DELETE | `/admin/landing/:id` | **ADMIN** |

### Voucher & pelanggan

| Method | Path | Peran |
|---|---|---|
| GET / POST | `/admin/voucher` | STAFF |
| GET / PATCH | `/admin/voucher/:id` | STAFF |
| DELETE | `/admin/voucher/:id` | **ADMIN** |
| GET | `/admin/pelanggan` | `q`, `tier`, `aktif`, `page` |
| GET | `/admin/pelanggan/:id` | termasuk riwayat & mutasi poin |
| PATCH | `/admin/pelanggan/:id` | **ADMIN** — aktif/nonaktif |
| POST | `/admin/pelanggan/:id/poin` | **ADMIN** — `{ jumlah, alasan }` |

Penyesuaian poin manual **mewajibkan alasan**, dan alasan beserta email admin
pelakunya tercatat di `PointLedger`.

Pelanggan dinonaktifkan, **tidak pernah dihapus** — penghapusan permanen memutus
riwayat pesanan yang dibutuhkan untuk pembukuan.

---

## Kode galat

| `error.code` | HTTP | Arti |
|---|---|---|
| `BAD_REQUEST` | 400 | validasi gagal atau aturan bisnis dilanggar |
| `UNAUTHORIZED` | 401 | token tidak ada, tidak valid, atau kedaluwarsa |
| `FORBIDDEN` | 403 | peran tidak cukup, atau signature webhook tidak valid |
| `NOT_FOUND` | 404 | tidak ada, atau token akses tidak cocok |
| `CONFLICT` | 409 | stok berubah, atau keranjang bermasalah |
| `TOO_MANY_REQUESTS` | 429 | melebihi batas laju |
| `SERVICE_UNAVAILABLE` | 503 | Midtrans belum dikonfigurasi atau tidak bisa dihubungi |
| `INTERNAL_ERROR` | 500 | galat tak terduga — detailnya hanya ada di log server |

`404` juga dipakai untuk sumber daya yang ada tapi bukan milik pemanggil (alamat
orang lain, item keranjang orang lain, pesanan dengan token salah). Membedakannya
dari "tidak ada" akan mengonfirmasi keberadaan data milik orang lain.
