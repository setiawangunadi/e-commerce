# Setup Lokal

Dari repo kosong sampai toko terbuka di browser. Perkiraan waktu: 10 menit,
sebagian besarnya menunggu `npm install`.

## Prasyarat

| | Versi | Catatan |
|---|---|---|
| Node.js | 20.9+ | dites di 22 dan 25 |
| Docker | apa saja yang mutakhir | hanya untuk PostgreSQL |
| npm | 10+ | ikut Node |

Tidak perlu memasang PostgreSQL di mesin sendiri — Docker yang menyediakannya.

## Langkah

**1. Dependency**

```bash
npm install
```

**2. Environment**

```bash
cp apps/api/.env.example apps/api/.env && cp apps/web/.env.example apps/web/.env.local
```

Isi `JWT_SECRET` di `apps/api/.env` dengan nilai acak:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

API menolak menyala bila `JWT_SECRET` kurang dari 32 karakter — pemeriksaannya
ada di [`env.skema.ts`](../apps/api/src/config/env.skema.ts) dan sengaja
menghentikan proses, bukan sekadar memperingatkan.

**3. Database**

```bash
npm run db:up
```

PostgreSQL berjalan di port **5433**, bukan 5432, supaya tidak bentrok dengan
Postgres yang mungkin sudah terpasang di mesin.

**4. Migrasi & data contoh**

```bash
npm run db:migrate && npm run db:seed
```

Seed membuat 3 banner, 5 kategori, 15 produk (beberapa dengan tautan Shopee/TikTok
contoh), gambar placeholder, dan dua akun admin.

**5. Jalankan keduanya**

Terminal 1 — API:

```bash
npm run dev:api
```

Terminal 2 — web:

```bash
npm run dev:web
```

## Akun seed

| Email | Password | Peran |
|---|---|---|
| `admin@toko.local` | `admin12345` | ADMIN — akses penuh |
| `staff@toko.local` | `staff12345` | STAFF — tidak bisa menghapus permanen |

## Halaman untuk dicoba

| Halaman | URL |
|---|---|
| Home | http://localhost:3000 |
| Katalog | http://localhost:3000/produk |
| Detail produk | http://localhost:3000/produk/kemeja-flanel-lengan-panjang |
| Keranjang | http://localhost:3000/keranjang |
| Checkout | http://localhost:3000/checkout |
| Akun pembeli | http://localhost:3000/akun |
| Panel admin | http://localhost:3000/admin |
| Kelola pesanan | http://localhost:3000/admin/pesanan |
| Landing page iklan | http://localhost:3000/admin/landing |

## Mengaktifkan pembayaran (opsional)

Tanpa key Midtrans, seluruh alur tetap berjalan sampai pesanan terbuat; halaman
status menyatakan pembayaran belum aktif dan pesanannya tetap tersimpan. Itu
cukup untuk mengerjakan sebagian besar hal.

Untuk mengetes pembayaran sungguhan:

1. Daftar di [dashboard.midtrans.com](https://dashboard.midtrans.com), pilih
   environment **Sandbox**.
2. **Settings → Access Keys**, salin *Server Key* dan *Client Key*.
3. Isi di `apps/api/.env`:

   ```
   MIDTRANS_SERVER_KEY="SB-Mid-server-xxxxx"
   MIDTRANS_CLIENT_KEY="SB-Mid-client-xxxxx"
   ```

4. **Restart API.** `.env` tidak diawasi `nest --watch`, jadi key baru hanya
   terbaca setelah proses dijalankan ulang.

Memastikan key diterima tanpa membuat transaksi apa pun:

```bash
curl -s -u "SERVER_KEY_ANDA:" https://api.sandbox.midtrans.com/v2/cek-auth/status
```

`404 Transaction doesn't exist` berarti key diterima di sandbox. `401` berarti
key-nya bukan key sandbox.

### Webhook saat development

Midtrans mengirim notifikasi **ke server**, bukan ke browser pembeli. Tanpa URL
yang bisa dijangkau dari internet, pesanan tidak akan pernah berubah jadi LUNAS
dengan sendirinya.

```bash
npm run tunnel
```

Skrip mencetak URL siap tempel, mis.
`https://xxxx.ngrok-free.app/api/v1/pembayaran/midtrans/notifikasi`. Salin ke
**Settings → Configuration → Payment Notification URL** di dashboard Midtrans,
lalu biarkan terminalnya terbuka. URL-nya berubah tiap kali tunnel dijalankan ulang.

Kalau tidak mau repot dengan tunnel: buka halaman status pesanan, dan status akan
ditarik langsung dari Midtrans. Lihat
[alur bisnis](05-alur-bisnis.md#kalau-webhook-tidak-sampai).

### Kartu uji sandbox

| Skenario | Nomor kartu | CVV / Kedaluwarsa |
|---|---|---|
| Berhasil | `4811 1111 1111 1114` | `123` / bulan-tahun mana pun di masa depan |
| Ditolak | `4911 1111 1111 1113` | sama |

OTP/3DS sandbox: `112233`. Untuk QRIS dan VA, dashboard sandbox menyediakan
tombol simulasi pembayaran di **Transactions**.

## Mengaktifkan ongkir sungguhan (opsional)

Tanpa API key, ongkir dihitung dari tabel tarif per zona provinsi yang tertanam
di aplikasi. Cukup untuk development dan demo, tapi angkanya perkiraan pasaran,
**bukan tarif resmi kurir** — halaman checkout menyatakan ini secara terbuka ke
pembeli.

Untuk tarif sungguhan, isi di `apps/api/.env`:

```
BITESHIP_API_KEY="..."
GUDANG_AREA_ID="..."      # atau GUDANG_KODE_POS
```

Keduanya wajib. API key tanpa titik asal membuat Biteship tidak bisa menghitung
apa pun, dan sistem diam-diam jatuh ke tarif perkiraan — di produksi kombinasi
itu ditolak saat boot.

Mencari `GUDANG_AREA_ID` untuk alamat gudang:

```bash
npm run cari-area
```

## Perintah yang sering dipakai

```bash
npm test
```

```bash
npm run typecheck
```

```bash
npm run db:studio
```

```bash
npm run db:down
```

## Kalau ada yang tidak beres

**`P1001: Can't reach database server`**
Container Postgres belum jalan atau belum siap. `npm run db:up`, tunggu beberapa
detik, coba lagi. Periksa dengan `docker compose ps`.

**`Konfigurasi environment tidak valid`**
Pesannya menyebutkan kolom mana yang bermasalah. Paling sering: `JWT_SECRET`
belum diisi atau kurang dari 32 karakter.

**`Cannot find module '../generated/prisma/client'`**
Prisma Client belum di-generate. Folder `src/generated/` sengaja tidak ikut
di-commit:

```bash
npm run db:generate --workspace apps/api
```

**Gambar produk tidak muncul di development**
Next.js 16 memblokir optimasi gambar dari IP lokal sebagai proteksi SSRF.
`images.dangerouslyAllowLocalIP` hanya aktif saat `NODE_ENV=development`;
pastikan API benar-benar berjalan di `localhost:4000` sesuai
`NEXT_PUBLIC_API_URL`.

**Perubahan `.env` tidak terbaca**
`nest --watch` tidak mengawasi `.env`. Restart proses API.
