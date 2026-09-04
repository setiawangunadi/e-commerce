# Keputusan Teknis

Catatan keputusan beserta alasan dan harga yang dibayar. Ditujukan untuk orang
yang menemukan sesuatu yang terlihat aneh dan ingin tahu apakah itu disengaja
sebelum mengubahnya.

Format tiap butir: **keputusan → alasan → konsekuensi**.

---

## Susunan sistem

### Next.js dan NestJS terpisah, bukan satu aplikasi full-stack

Route Handler Next.js bisa menangani API untuk toko sekecil ini. Pemisahan
dipilih karena aturan uang harus tetap sama walau nanti dipanggil aplikasi kasir
atau mobile, dan karena webhook Midtrans serta cron butuh proses yang hidup
terus — keduanya tidak cocok dengan model serverless yang jadi cara paling umum
men-deploy Next.js.

**Harganya:** satu batas jaringan tambahan, dua deployment, dan tipe yang harus
dijaga tetap selaras secara manual antara `apps/web/src/lib/types.ts` dan bentuk
response API.

### PostgreSQL sejak awal, bukan SQLite

Skema ini memakai enum, kolom `Json`, indeks parsial, dan `mode: 'insensitive'`
pada pencarian. Memulai dengan SQLite berarti menulis ulang sebagian query saat
pindah, dan pindahnya pasti terjadi.

**Harganya:** development butuh Docker.

### Harga sebagai `Int` Rupiah utuh

Rupiah tidak dipakai dalam pecahan sen, jadi tidak ada yang hilang — dan tidak ada
risiko galat pembulatan float pada angka yang menentukan tagihan pembeli.

**Harganya:** kalau nanti menjual dalam mata uang lain, seluruh perhitungan harus
ditinjau ulang.

---

## Uang dan stok

### Tidak ada nilai uang yang dipercaya dari browser

Client hanya mengirim pengenal — kode kurir, kode voucher, jumlah poin. Setiap
nominal dihitung ulang di server saat pesanan dibuat, dan DTO menolak kolom asing
lewat `forbidNonWhitelisted`.

**Harganya:** perhitungan yang sama berjalan dua kali (pratinjau di checkout dan
saat pesanan dibuat), sehingga ada satu round-trip tambahan sebelum pesanan jadi.

### Stok berkurang saat lunas, bukan saat pesanan dibuat

Pesanan yang tidak dibayar jauh lebih banyak daripada yang dibayar. Menahan stok
untuk semuanya membuat barang terlihat habis padahal tersedia.

**Harganya:** ada jendela antara pesanan dibuat dan pembayaran selesai di mana
stok bisa diambil pembeli lain. Karena itu stok dicek lagi di dalam transaksi
pembuatan pesanan, dan pesanan bisa gagal di detik terakhir dengan `409`.

### `stokSudahDikurangi` sebagai penanda, bukan penghitungan ulang

Webhook Midtrans dirancang *at-least-once*; notifikasi ganda itu normal. Satu
kolom boolean jauh lebih murah dan lebih mudah dipahami daripada menghitung ulang
stok dari riwayat pesanan setiap kali.

**Harganya:** kolomnya harus dipelihara di dua tempat — di-set saat pelunasan,
diturunkan saat pembatalan.

### Potongan tidak pernah menutup ongkir

`total = max(0, subtotal − diskon − poin) + ongkir`. Kurungan hanya melingkupi
nilai barang. Pengiriman adalah biaya nyata yang tetap ditagih kurir apa pun
promonya.

### Potongan poin dibatasi 50% subtotal

Tanpa batas, pelanggan lama bisa membayar nyaris nol sementara toko tetap
menanggung ongkir dan biaya payment gateway.

### Poin dikreditkan saat barang diterima, bukan saat dibayar

Menunggu sampai `ORDER_RECEIPT` membuat pembatalan dan refund tidak pernah perlu
menarik poin dari saldo yang mungkin sudah dibelanjakan.

**Harganya:** pelanggan menunggu lebih lama untuk poinnya. Halaman akun
menampilkan "poin tertunda" supaya penundaannya terlihat, bukan terasa hilang.

### Pengali tier adalah satu-satunya manfaat tier

Menambah diskon otomatis per tier akan bertabrakan dengan voucher dan potongan
poin. Riset menandai penumpukan promo sebagai risiko yang perlu aturan jelas
lebih dulu (`research/business/09-marketing-promotion.md`).

### Idempotensi poin lewat kunci unik database, bukan pengecekan aplikasi

Kunci unik `(orderId, tipe)` di `PointLedger` yang menjaganya. Pengecekan
"sudah pernah?" di level aplikasi bisa kalah balapan bila sinkronisasi Midtrans
berjalan bersamaan.

**Harganya:** kode harus menangkap galat `P2002` dan memperlakukannya sebagai
keberhasilan, yang terlihat aneh sampai alasannya diketahui.

---

## Status pesanan

### Matriks transisi di satu tempat

Konstanta `TRANSISI` di `admin-orders.service.ts`. Panel admin hanya menampilkan
pilihan yang dikirim API lewat `statusBerikutnya`.

**Harganya:** menambah status baru menuntut perubahan di API dan di
`lib/status-pesanan.ts` pada web.

### Pelunasan tidak bisa dilakukan admin

`WAITING_PAYMENT → PAYMENT_SUCCESS` tidak ada di tabel transisi. Satu-satunya
jalan adalah notifikasi Midtrans, supaya catatan uang tidak pernah menyimpang
dari kenyataan.

**Harganya:** kalau pembeli membayar lewat transfer manual di luar sistem, tidak
ada jalur untuk mencatatnya. Itu memang belum didukung.

### Nomor resi wajib saat pesanan dikirim

Tanpa resi pembeli tidak punya cara melacak, dan itu pertanyaan nomor satu ke
customer service.

---

## Keamanan

### Token admin dan pelanggan berbagi rahasia, dipisah klaim `aud`

Satu `JWT_SECRET` untuk dikelola, satu tempat untuk dirotasi. Guard menuntut
audience secara eksplisit.

**Harganya:** kalau pemisahan ini pernah dilepas, token pelanggan akan lolos
`JwtAuthGuard` dan membuka endpoint admin. Ada test khusus yang menjaganya.

### Token di cookie httpOnly, bukan localStorage

Tidak bisa dibaca JavaScript bila ada celah XSS
(`research/tech/04-authentication-security.md`).

**Harganya:** semua panggilan berautentikasi harus lewat Server Action atau
Server Component; Client Component tidak bisa memanggil API langsung.

### Pesan galat login seragam, dengan verifikasi hash tiruan

Membedakan "email tidak ada" dari "sandi salah" membocorkan email mana yang punya
akun. Verifikasi tetap dijalankan terhadap hash tiruan supaya waktu responsnya
sama juga.

**Harganya:** satu operasi argon2 terbuang pada setiap login yang emailnya tidak
ada. Itu memang harganya.

### Halaman status pesanan pakai token, bukan nomor saja

Nomor pesanan berurutan dan mudah ditebak, sedangkan halamannya berisi alamat
rumah pembeli.

### `404`, bukan `403`, untuk data milik orang lain

Alamat, item keranjang, dan pesanan milik orang lain dijawab "tidak ditemukan".
Membedakannya dari "tidak ada" akan mengonfirmasi keberadaan datanya.

### Tautan marketplace dibatasi ke host resmi

Divalidasi dua lapis: Server Action memastikan skemanya `http`/`https` (menutup
`javascript:`), lalu API membatasi host-nya ke domain Shopee dan TikTok termasuk
pemendeknya.

**Harganya:** domain marketplace baru menuntut perubahan kode di
`apps/api/src/admin/dto/product.dto.ts`.

### Tautan tombol banner dan landing page hanya boleh path internal

Keduanya adalah konten paling menonjol dan tujuan iklan berbayar. Membiarkannya
menerima URL eksternal sembarang membuka jalan phishing bila akun admin dibajak.

### Nama berkas unggahan dibuat ulang dari UUID

Nama asli dari client tidak pernah dipakai untuk membentuk path — itu jalan masuk
path traversal. Ekstensinya diambil dari tipe MIME, bukan dari nama berkas.

### SVG tidak diterima sebagai gambar produk

SVG bisa memuat `<script>`. Yang diterima hanya JPEG, PNG, WebP, dan AVIF.

---

## Landing page

### Blok berskema, bukan editor HTML bebas

Hasilnya selalu rapi di mobile, tidak bisa merusak layout, dan tidak membuka
jalan XSS — semua isi blok dirender sebagai teks, tidak pernah sebagai markup.

**Harganya:** admin tidak bisa membuat tata letak di luar delapan blok yang
tersedia. Menambah blok baru menuntut perubahan kode di tiga tempat: skema Zod,
komponen render, dan form editor.

### Kolom `konten` bertipe `Json`, dijaga skema Zod

Delapan jenis blok dengan bentuk yang sangat berbeda; membuat tabel terpisah
untuk masing-masing akan berlebihan pada tahap ini. Kolom Json berarti "apa saja"
kalau tidak dijaga, jadi skema Zod adalah satu-satunya penentu apa yang boleh
masuk.

### ID pelacakan per kampanye, bukan global

Tiap landing page bisa punya pixel sendiri. Formatnya divalidasi saat disimpan —
salah tempel ID membuat kampanye berjalan tanpa data konversi, dan itu baru
ketahuan setelah anggaran iklan terpakai.

### Event `Purchase` dijaga hanya sekali per pesanan

Halaman status bisa dibuka berkali-kali. Konversi ganda membuat ROAS tampak lebih
baik dari kenyataan — kesalahan yang mengarah ke keputusan belanja iklan yang salah.

**Harganya:** penandanya di `localStorage`, jadi pembeli yang membuka halaman
yang sama di perangkat lain akan menghasilkan satu konversi tambahan.

### Atribusi UTM tidak menunggu persetujuan cookie

Ini bukan pelacakan lintas situs — hanya catatan internal asal pesanan, setara
nomor referensi. Yang menunggu persetujuan adalah skrip Meta dan Google.

---

## Frontend

### Badge keranjang dibaca dari client

Memanggil `cookies()` di layout etalase akan memaksa seluruh etalase jadi dinamis
dan mematikan ISR di home dan katalog — halaman yang justru paling butuh cepat
dan SEO-friendly.

### Landing page memakai `updateTag`, bukan `revalidateTag`

Admin yang menekan Simpan lalu membuka "Lihat halaman" harus melihat perubahannya
saat itu juga, bukan versi lama yang menyegar di belakang layar.

### Form produk memanggil Server Action lewat transition

React mereset form setelah form-action selesai. Pada form sepanjang form produk,
satu kesalahan validasi akan menghapus seluruh isian admin.

### `proxy.ts` hanya mengecek keberadaan cookie

Proxy berjalan di setiap navigasi dan tidak boleh memanggil API. Validasi
sesungguhnya ada di layout admin dan guard API.

**Harganya:** cookie basi lolos proxy lalu ditolak layout — satu redirect
tambahan yang terlihat oleh pengguna.

### Gambar dan varian dikirim sebagai daftar utuh, diganti seluruhnya

Menghindari state setengah jadi bila sebagian operasi gagal.

**Harganya:** id gambar dan varian berubah setiap kali produk disimpan, jadi
tidak bisa dipakai sebagai referensi stabil dari luar.

---

## Testing

### Vitest, bukan Jest bawaan Nest

Lebih cepat, konfigurasinya lebih sedikit, dan cakupan v8 tanpa instrumentasi
tambahan.

**Harganya:** transformasinya harus memakai SWC (`unplugin-swc`) karena esbuild
bawaan Vite tidak memancarkan `emitDecoratorMetadata` yang dibutuhkan
class-validator.

### Prisma tiruan berbasis Proxy, bukan database sungguhan

Seluruh suite berjalan di bawah 5 detik, sehingga benar-benar dijalankan saat
mengubah kode — bukan hanya di CI.

**Harganya:** yang diuji adalah *bahwa query yang benar disusun*, bukan bahwa
databasenya berperilaku seperti yang diharapkan. Transaksi, cascade, dan constraint
tidak tersentuh. Itu celah yang disadari, dan pengisinya adalah test integrasi
yang belum ditulis.

### Nama test berbahasa Indonesia sebagai kalimat aturan

Daftar test terbaca seperti spesifikasi, dan kegagalannya langsung menyebutkan
aturan mana yang dilanggar.

---

## Operasional

### Validasi environment menghentikan proses saat boot

Kesalahan konfigurasi tidak menimbulkan galat sampai ada yang benar-benar
memakainya — biasanya pembeli pertama. Server yang mati saat deploy jauh lebih
mudah diperbaiki daripada server yang hidup tapi diam-diam salah.

**Harganya:** environment yang setengah terisi tidak bisa dinyalakan sama sekali,
bahkan untuk sekadar memeriksa sesuatu.

### Cron in-process, bukan BullMQ

Untuk satu instance, `@nestjs/schedule` sudah memadai dan tidak menambah Redis
sebagai dependensi.

**Harganya:** menambah instance API kedua akan menjalankan cron-nya ganda. Ini
dicatat sebagai syarat di [deploy](08-deploy-produksi.md#sebelum-menambah-instance-api).

### Pembatasan laju in-memory

Alasan dan konsekuensinya sama dengan cron: memadai untuk satu instance, harus
pindah ke Redis sebelum ada yang kedua.

### Unggahan di disk lokal

Cukup untuk satu instance, dan `UploadService.simpan()` sengaja dibuat sempit
supaya penggantian ke Cloudflare R2 cukup di satu kelas
(`research/tech/09-storage-cdn-media.md`).

**Harganya:** butuh volume persisten, dan tidak bisa dibagi antar instance.

### Dua endpoint health yang terpisah

`live` tidak menyentuh database supaya database yang lambat tidak memicu restart
beruntun yang justru memperparah keadaan. `ready` menyentuhnya, dan load balancer
memakainya untuk mengeluarkan instance dari rotasi tanpa membunuhnya.

---

## Yang belum dibangun

Sesuai urutan prioritas MVP di riset:

- Cetak label pengiriman & pembuatan order kurir otomatis lewat Biteship
- Notifikasi otomatis ke pembeli (WhatsApp & email) saat pesanan dibayar dan dikirim
- Meta Conversions API dari webhook pembayaran, agar konversi tetap terhitung
  walau pengunjung memakai pemblokir iklan
- Laporan performa kampanye di admin (pesanan & omzet per UTM/landing page)
- Retur & refund
- Redis + BullMQ untuk job asinkron, Meilisearch untuk pencarian
- Test integrasi dan end-to-end
