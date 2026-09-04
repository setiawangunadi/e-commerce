# Arsitektur

## Peta besar

```
                    ┌──────────────────────────────────┐
   Pembeli ────────▶│  apps/web — Next.js 16           │
   (browser)        │  • etalase (ISR, statis, cepat)  │
                    │  • panel admin (dinamis)         │
                    │  • Server Action & Server Comp.  │
                    └───────────────┬──────────────────┘
                                    │ REST /api/v1, envelope { data, error, meta }
                                    │ token dibawa dari cookie httpOnly di server
                                    ▼
                    ┌──────────────────────────────────┐
                    │  apps/api — NestJS 11 + Fastify  │
                    │  • semua aturan bisnis & uang    │
                    │  • JWT admin & pelanggan         │
                    │  • cron pesanan kedaluwarsa      │
                    └───┬──────────────┬────────────┬──┘
                        │              │            │
                  Prisma 7        Midtrans      Biteship
                        │          (Snap +       (ongkir,
                        ▼          webhook)      opsional)
                 PostgreSQL 17
```

## Kenapa dua aplikasi, bukan satu

Next.js sendiri bisa menangani API lewat Route Handler, dan untuk toko sekecil
ini itu jalan pintas yang masuk akal. Pemisahan tetap dipilih karena tiga hal
yang sudah terlihat sejak sekarang:

1. **Aturan uang tidak boleh ikut siklus hidup UI.** Perhitungan ongkir, voucher,
   dan poin harus tetap sama walau nanti ada aplikasi kasir, aplikasi mobile,
   atau integrasi marketplace yang memanggilnya. Menaruhnya di Route Handler
   membuat aturan itu melekat pada satu frontend.
2. **Webhook Midtrans dan cron butuh proses yang hidup terus.** Keduanya tidak
   cocok dengan model serverless yang jadi cara paling umum men-deploy Next.js.
3. **Skalanya berbeda.** Etalase butuh banyak instance yang murah dan bisa
   di-cache di CDN; API butuh koneksi database yang stabil dan sedikit instance.

Konsekuensinya: ada satu batas jaringan tambahan dan dua deployment yang harus
diurus. Itu harga yang dibayar, dan bagian [deploy](08-deploy-produksi.md)
mengurusnya secara eksplisit.

## Apa yang tinggal di mana

Batas antara kedua aplikasi sederhana:

> **API memutuskan. Web menampilkan.**

Kalau sebuah aturan menentukan berapa yang dibayar pembeli, apa yang boleh
dilihatnya, atau status apa yang sah — tempatnya di API. Web boleh menyalin
aturan itu untuk pengalaman yang lebih baik (mis. menyembunyikan tombol yang
pasti ditolak), tapi **tidak boleh menjadi satu-satunya yang menegakkannya**.

Contoh nyata dari kode ini:

| Aturan | Ditegakkan di | Web ikut menampilkan? |
|---|---|---|
| Status pesanan berikutnya yang sah | `admin-orders.service.ts` | Ya — tombolnya dari daftar yang dikirim API |
| Potongan voucher | `voucher.service.ts` | Ya — pratinjau di checkout, dihitung ulang saat pesanan dibuat |
| Ongkir per layanan | `shipping.service.ts` | Ya — client hanya mengirim kode layanan |
| Batas poin per transaksi | `loyalty.config.ts` | Ya — slider di UI dibatasi angka dari API |
| Produk bervarian tidak bisa dibeli langsung | `cart.service.ts` | Ya — tombol grid jadi "Pilih Varian" |

Panel admin tidak punya kewenangan tambahan hanya karena ia panel admin: kalau
tombolnya dipaksa muncul lewat devtools, API tetap menolak.

## Bentuk response

Semua endpoint memakai envelope yang sama:

```json
{ "data": ..., "error": null, "meta": null }
```

Disusun oleh [`ResponseInterceptor`](../apps/api/src/common/response.interceptor.ts)
untuk jalur sukses dan [`AllExceptionsFilter`](../apps/api/src/common/http-exception.filter.ts)
untuk jalur galat, sehingga klien tidak perlu punya dua cara membaca balasan.
`meta` diisi hanya untuk endpoint berpaginasi.

Galat tak terduga **tidak pernah** dibocorkan isinya — pesan aslinya masuk log
server, klien menerima `"Terjadi kesalahan pada server"`. Galat yang memang
ditujukan ke pengguna (validasi, stok habis, voucher kedaluwarsa) dikirim apa
adanya karena memang perlu dibaca.

## Autentikasi: dua jenis token, satu rahasia

Admin dan pelanggan sama-sama memakai JWT yang ditandatangani `JWT_SECRET` yang
sama, dipisahkan oleh klaim **`aud`**:

| | `aud` | Guard | Masa berlaku |
|---|---|---|---|
| Admin | `admin` | `JwtAuthGuard` | 8 jam |
| Pelanggan | `pelanggan` | `CustomerJwtGuard` | 30 hari |

Pemisahan ini bukan kosmetik. Tanpa `aud`, token pelanggan yang sah akan lolos
`JwtAuthGuard` dan membuka seluruh endpoint `/admin` yang tidak menuntut peran
tertentu. Guard-nya menuntut audience secara eksplisit, dan ada test yang
menjaganya tetap begitu.

Ada guard ketiga, `CustomerOpsionalGuard`, untuk endpoint yang melayani tamu
maupun pelanggan (checkout). Token rusak diperlakukan sama dengan tanpa token —
kegagalan sesi tidak boleh menghalangi orang menyelesaikan belanjanya.

**Token tidak pernah menyentuh JavaScript browser.** Keduanya disimpan di cookie
httpOnly dan dibaca Server Action/Server Component di Next.js, lalu diteruskan ke
API lewat header `Authorization`.

## Peran admin (RBAC)

Dua peran saja, sesuai `research/tech/04-authentication-security.md`:

- **ADMIN** — akses penuh
- **STAFF** — semua kecuali penghapusan permanen dan pengelolaan kategori/label

Ditegakkan `RolesGuard` lewat dekorator `@Roles('ADMIN')` di
[`admin.controller.ts`](../apps/api/src/admin/admin.controller.ts). Aksi yang
dibatasi ADMIN saja: hapus produk, hapus banner, hapus landing page, hapus
voucher, hapus label, seluruh CRUD kategori, nonaktifkan pelanggan, dan
penyesuaian poin manual.

## Identitas tanpa akun

Dua hal berjalan tanpa login sama sekali:

- **Keranjang** dikenali token acak di cookie httpOnly (`keranjang`), dibuat saat
  item pertama masuk.
- **Halaman status pesanan** dibuka lewat `token` acak 24 byte yang tersimpan di
  baris pesanan. Nomor pesanan saja tidak cukup — nomornya berurutan dan mudah
  ditebak, sedangkan halamannya berisi alamat rumah pembeli.

Saat pembeli mendaftar atau masuk, pesanan tamu dengan email yang sama otomatis
ditarik ke akunnya — tapi **hanya pesanan yang belum punya pemilik**, supaya
mendaftar dengan email orang lain tidak bisa merebut riwayat mereka.

## Integrasi luar

| Layanan | Dipakai untuk | Bila tidak tersedia |
|---|---|---|
| Midtrans Snap | pembayaran | Pesanan tetap terbuat; halaman status menyatakan pembayaran belum aktif |
| Midtrans webhook | pelunasan otomatis | Ada tiga jalur cadangan — lihat [alur bisnis](05-alur-bisnis.md#kalau-webhook-tidak-sampai) |
| Biteship | ongkir kurir sungguhan | Otomatis jatuh ke tabel tarif per zona provinsi |

Pola yang dipakai untuk keduanya sama: **kegagalan pihak ketiga tidak boleh
menghentikan pembeli.** Biteship down → tarif perkiraan, checkout jalan terus.
Webhook tidak datang → status ditarik langsung dari Midtrans saat halaman dibuka.

## Pekerjaan terjadwal

Satu saja: [`PembersihPesanan`](../apps/api/src/payment/pembersih-pesanan.ts),
tiap 10 menit, menutup pesanan yang lewat batas bayar. Sebelum menghanguskan, ia
menyelaraskan status ke Midtrans lebih dulu — menghanguskan pesanan yang
sebenarnya sudah dibayar jauh lebih merugikan daripada menutupnya terlambat.

Cron ini berjalan **in-process**. Kalau API dijalankan lebih dari satu instance,
ia akan berjalan ganda; lihat [deploy](08-deploy-produksi.md#sebelum-menambah-instance-api).
