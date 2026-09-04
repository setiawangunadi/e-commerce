# Deploy Produksi

## Bentuk yang dituju

```
              Internet
                 │
                 ▼
    ┌────────────────────────┐
    │  Reverse proxy + TLS   │   Caddy / nginx / Traefik / Cloudflare
    └───┬────────────────┬───┘
        │                │
  toko.example.id   api.toko.example.id
        │                │
        ▼                ▼
   ┌─────────┐      ┌─────────┐
   │  web    │─────▶│  api    │──▶ PostgreSQL 17
   │  :3000  │      │  :4000  │──▶ volume /data/uploads
   └─────────┘      └─────────┘
```

Reverse proxy dengan TLS **wajib**. Cookie sesi diberi flag `secure` di produksi,
jadi tanpa HTTPS tidak ada seorang pun yang bisa login.

## Yang harus disiapkan

| | Kenapa |
|---|---|
| PostgreSQL 17 dengan backup terjadwal | satu-satunya tempat data pesanan |
| Volume persisten untuk `/data/uploads` | tanpa ini, gambar produk hilang setiap deploy |
| Dua nama domain (atau subdomain) | etalase dan API dipisah demi CORS dan cache |
| Sertifikat TLS | cookie `secure` |
| Akun Midtrans **produksi** | key produksi tidak berawalan `SB-Mid-` |
| Akun Biteship + area gudang | opsional, tapi tanpanya ongkir hanya perkiraan |

---

## Deploy dengan Docker Compose

Cocok untuk satu VPS. Untuk skala lebih besar, lihat
[Sebelum menambah instance API](#sebelum-menambah-instance-api).

**1. Siapkan `.env.prod`** di mesin target (jangan di-commit):

```bash
POSTGRES_USER=ecommerce
POSTGRES_PASSWORD=<acak-dan-panjang>
POSTGRES_DB=ecommerce

JWT_SECRET=<hasil perintah di bawah>
WEB_ORIGIN=https://toko.example.id
PUBLIC_BASE_URL=https://api.toko.example.id

MIDTRANS_SERVER_KEY=Mid-server-xxxxx
MIDTRANS_CLIENT_KEY=Mid-client-xxxxx
MIDTRANS_PRODUKSI=true

NEXT_PUBLIC_API_URL=https://api.toko.example.id
NEXT_PUBLIC_SITE_URL=https://toko.example.id
NEXT_PUBLIC_MIDTRANS_PRODUKSI=true

TRUST_PROXY=1
```

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Daftar lengkap beserta penjelasan tiap variabel ada di
[`apps/api/.env.production.example`](../apps/api/.env.production.example) dan
[`apps/web/.env.production.example`](../apps/web/.env.production.example).

**2. Bangun dan jalankan:**

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

**3. Jalankan migrasi:**

```bash
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
```

Perintah Prisma yang menyentuh database **harus dijalankan dari `apps/api`**
(di container, itulah working directory-nya). Prisma 7 memindahkan konfigurasi
datasource ke `prisma.config.ts`, dan berkas itu dicari dari direktori kerja —
menjalankannya dari akar repo dengan `--schema` saja gagal dengan
`datasource.url property is required in your Prisma config file`.

**4. Seed akun admin pertama** (sekali saja, di instalasi baru):

```bash
docker compose -f docker-compose.prod.yml exec -e SEED_ADMIN_PASSWORD='<sandi-kuat>' api npx tsx prisma/seed.ts
```

Ganti sandinya lagi lewat panel admin setelah login pertama.

**5. Pasang Payment Notification URL** di dashboard Midtrans →
**Settings → Configuration**:

```
https://api.toko.example.id/api/v1/pembayaran/midtrans/notifikasi
```

## Deploy tanpa Docker

Yang penting dijalankan dengan benar:

```bash
npm ci
npx prisma generate --schema apps/api/prisma/schema.prisma
(cd apps/api && npx prisma migrate deploy)
npm run build
```

`generate` boleh dijalankan dari akar repo karena tidak menyentuh database;
`migrate deploy` tidak — lihat catatan di atas.

Lalu jalankan keduanya di bawah process manager (systemd, PM2):

| | Perintah | Working directory |
|---|---|---|
| API | `node dist/main` | `apps/api` |
| Web | `node apps/web/server.js` | `apps/web/.next/standalone` |

Build web menuntut variabel `NEXT_PUBLIC_*` **tersedia saat build**, bukan saat
run — nilainya ter-inline ke bundel browser.

---

## Yang gagal saat boot, dengan sengaja

API memvalidasi seluruh environment sebelum menerima satu pun request. Server
yang mati saat deploy jauh lebih mudah diperbaiki daripada server yang hidup tapi
diam-diam salah. Yang ditolak di produksi:

- `JWT_SECRET` masih nilai contoh dari `.env.example`, atau kurang dari 32 karakter
- `SEED_ADMIN_PASSWORD` masih `admin12345`
- `WEB_ORIGIN` atau `PUBLIC_BASE_URL` bukan `https://`
- `DATABASE_URL` bukan URL PostgreSQL
- **Key Midtrans sandbox padahal `MIDTRANS_PRODUKSI="true"`** — gejalanya
  `401 Unknown Merchant server_key` yang baru ketahuan saat pembeli pertama membayar
- **Key Midtrans produksi padahal `MIDTRANS_PRODUKSI` belum `"true"`** — jauh
  lebih merugikan: transaksi masuk ke sandbox, uang pembeli tidak pernah tertagih
- Kunci Midtrans kosong sama sekali
- `BITESHIP_API_KEY` terisi tapi `GUDANG_AREA_ID`/`GUDANG_KODE_POS` kosong —
  ongkir akan diam-diam memakai tarif perkiraan

Seluruh masalah dilaporkan sekaligus dalam satu pesan, bukan satu per deploy.
Aturannya ada di [`env.skema.ts`](../apps/api/src/config/env.skema.ts) dan diuji
di `test/config/env.skema.test.ts`.

---

## Checklist sebelum menerima pembeli sungguhan

### Keamanan

- [ ] `JWT_SECRET` acak, unik per environment, tidak pernah masuk repo
- [ ] Sandi admin seed sudah diganti lewat panel setelah login pertama
- [ ] `WEB_ORIGIN` menyebut domain yang benar (bukan `*`, bukan localhost)
- [ ] TLS aktif, HTTP dialihkan ke HTTPS
- [ ] `TRUST_PROXY` sesuai jumlah proxy di depan API — salah setel membuat
      pembatasan laju memakai IP yang bisa dipalsukan lewat `X-Forwarded-For`
- [ ] Port PostgreSQL tidak terbuka ke internet
- [ ] `RATE_LIMIT_LOGIN` masuk akal (bawaan 10/menit/IP)

### Pembayaran

- [ ] Key Midtrans **produksi** terpasang (tanpa awalan `SB-Mid-`)
- [ ] `MIDTRANS_PRODUKSI="true"` di API **dan** `NEXT_PUBLIC_MIDTRANS_PRODUKSI="true"` di web
- [ ] Payment Notification URL terpasang di dashboard dan bisa dijangkau dari internet
- [ ] Satu transaksi uji nyata bernilai kecil berhasil sampai `PAYMENT_SUCCESS`
- [ ] `BATAS_BAYAR_MENIT` sesuai kebijakan toko

### Pengiriman

- [ ] `BITESHIP_API_KEY` dan titik asal gudang terisi — atau sadar penuh bahwa
      ongkir yang ditagih adalah perkiraan
- [ ] Alamat gudang di Biteship benar (ongkir salah = margin hilang tiap pesanan)

### Data

- [ ] `npx prisma migrate deploy` berjalan bersih di database produksi
- [ ] **Backup otomatis PostgreSQL aktif dan sudah pernah diuji restore-nya**
- [ ] `UPLOAD_DIR` menunjuk volume persisten, bukan filesystem container
- [ ] Sudah dicoba: restart container tidak menghilangkan gambar produk

### Aplikasi

- [ ] `/api/v1/health/ready` menjawab `200`
- [ ] Halaman home terbuka dan menampilkan produk
- [ ] Login admin berhasil
- [ ] Alur lengkap sekali jalan: katalog → keranjang → checkout → bayar → status
- [ ] `robots.txt` sesuai keinginan
- [ ] `NEXT_PUBLIC_SITE_URL` benar (memengaruhi canonical dan structured data)

### Pemantauan

- [ ] Health check terpasang di load balancer: `live` untuk restart, `ready` untuk rotasi
- [ ] Log terkumpul di suatu tempat yang bisa dicari
- [ ] Ada peringatan bila jumlah pesanan tersangkut di `WAITING_PAYMENT` melonjak
      — gejala pertama webhook mati

---

## Sebelum menambah instance API

Dua hal berjalan **per proses** dan akan berperilaku salah kalau ada lebih dari
satu instance:

**1. Cron penutup pesanan kedaluwarsa** ([`pembersih-pesanan.ts`](../apps/api/src/payment/pembersih-pesanan.ts))
berjalan in-process, jadi setiap instance akan menjalankannya. Pindahkan ke
BullMQ, atau jalankan hanya di satu instance yang ditandai lewat environment.

**2. Penyimpanan pembatasan laju** in-memory, jadi batas 10 percobaan login per
menit menjadi 10 × jumlah instance. Ganti ke storage Redis
(`@nest-lab/throttler-storage-redis`).

Selain itu, `UPLOAD_DIR` di filesystem lokal tidak bisa dibagi antar instance —
inilah titik di mana `UploadService` harus diganti ke Cloudflare R2. Antarmuka
`simpan()` sengaja dibuat sempit supaya penggantiannya cukup di satu kelas; lihat
`research/tech/09-storage-cdn-media.md`.

## Rollback

Kode bisa dikembalikan dengan men-deploy image versi sebelumnya. **Migrasi
database tidak.** Prisma tidak punya `migrate down`.

Karena itu: untuk perubahan skema yang merusak (menghapus kolom, mengganti nama),
lakukan dalam dua deploy terpisah — deploy pertama menambahkan yang baru dan
membuat kode bisa hidup dengan keduanya, deploy kedua membuang yang lama setelah
versi sebelumnya benar-benar tidak dipakai lagi.

## CI

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) menjalankan tiga job di
setiap PR:

| Job | Isinya |
|---|---|
| `periksa` | typecheck + seluruh unit test |
| `build` | build produksi API dan web |
| `migrasi` | menjalankan migrasi di Postgres kosong, lalu memastikan tidak ada perubahan `schema.prisma` yang belum dibuatkan migrasinya |

Job `migrasi` menutup penyebab paling umum dari "jalan di lokal, gagal saat
deploy": `schema.prisma` yang sudah diubah tapi migrasinya lupa dibuat.
