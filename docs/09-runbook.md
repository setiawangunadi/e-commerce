# Runbook Operasional

Untuk orang yang sedang jaga saat ada yang rusak. Setiap bagian: gejala → cara
memastikan → cara memperbaiki.

## Pemeriksaan pertama

```bash
curl -s https://api.toko.example.id/api/v1/health/ready
```

```json
{"data":{"status":"ok","database":"terhubung",...},"error":null,"meta":null}
```

`503` berarti API hidup tapi tidak bisa menghubungi database. Tidak ada balasan
sama sekali berarti API-nya yang mati.

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=100 api
```

---

## Pesanan tidak berubah jadi LUNAS padahal pembeli sudah membayar

**Penyebab paling sering di seluruh sistem ini.**

### Memastikan

Buka detail pesanan di panel admin, tekan **"Cek Status ke Midtrans"**. Kalau
setelah itu statusnya berubah jadi lunas, berarti webhook-nya yang tidak sampai.

### Kenapa terjadi

| Sebab | Cara memeriksa |
|---|---|
| Notification URL belum/salah dipasang | dashboard Midtrans → Settings → Configuration |
| API sempat mati saat notifikasi datang | log API di sekitar `dibayarPada` |
| Signature tidak cocok | cari `Signature notifikasi tidak valid` di log |
| Nominal tidak cocok | cari `Nominal ... tidak sama dengan total pesanan` di log |

Signature tidak cocok hampir selalu berarti `MIDTRANS_SERVER_KEY` di API berbeda
dengan merchant yang mengirim notifikasi — biasanya key sandbox tertinggal di
produksi, atau sebaliknya.

### Memperbaiki

Sistem sudah punya tiga jalur cadangan yang berjalan sendiri, jadi pesanan tidak
akan menggantung selamanya:

1. otomatis saat pembeli membuka halaman status pesanannya,
2. otomatis sebelum cron menghanguskan pesanan kedaluwarsa (tiap 10 menit),
3. manual lewat tombol di panel admin.

Yang perlu diperbaiki adalah akar masalahnya:

- Pasang ulang Notification URL, lalu kirim ulang notifikasi dari dashboard
  Midtrans (**Transactions → pilih transaksi → Send notification**).
- Bila banyak pesanan sekaligus, biarkan cron menyelaraskannya; ia memproses
  sampai 100 pesanan menunggu per putaran.

> **Jangan pernah** memindahkan status ke `PAYMENT_SUCCESS` lewat database
> langsung. Selain API menolaknya (dan memang sengaja), jalur itu melewati
> pengurangan stok dan pencatatan `dibayarPada`, sehingga stok jadi salah dan
> pembukuan tidak cocok.

---

## Ongkir jadi aneh atau tiba-tiba lebih murah

### Memastikan

Cari di log API:

```
Biteship gagal, memakai tarif lokal: ...
```

Atau periksa `penyediaOngkir` pada pesanan yang baru masuk — nilainya
`tarif-lokal` padahal seharusnya `biteship`.

### Kenapa terjadi

Ini **perilaku yang disengaja**: kalau Biteship tidak bisa dihubungi, checkout
tetap jalan dengan tarif perkiraan supaya pembeli tidak gagal memesan. Tapi
tarifnya bukan tarif resmi kurir, jadi setiap pesanan yang lewat jalur ini
berpotensi menggerus margin.

### Memperbaiki

1. Periksa saldo dan status akun di dashboard Biteship.
2. Pastikan `BITESHIP_API_KEY` dan `GUDANG_AREA_ID`/`GUDANG_KODE_POS` masih terisi.
3. Kalau Biteship sedang down, pantau berapa lama — kalau berkepanjangan,
   pertimbangkan menaikkan tarif lokal sementara agar tidak rugi tiap kiriman.

---

## Stok terlihat salah

### Memastikan

Ingat aturannya lebih dulu:

- Stok **hanya berkurang saat pembayaran lunas**, bukan saat pesanan dibuat.
  Pesanan `WAITING_PAYMENT` memang belum memotong stok.
- Untuk produk bervarian, **stok produk = total stok varian aktif**. Angka stok di
  tingkat produk diabaikan sepenuhnya.

Bandingkan dengan pesanan yang tercatat:

```sql
SELECT o.nomor, o.status, o."stokSudahDikurangi", oi."namaProduk", oi.jumlah
FROM "Order" o
JOIN "OrderItem" oi ON oi."orderId" = o.id
WHERE oi."productId" = '<id-produk>'
ORDER BY o."createdAt" DESC
LIMIT 20;
```

### Kenapa terjadi

`stokSudahDikurangi` yang menjaga stok hanya berkurang sekali. Kalau pesanan yang
lunas menunjukkan `false`, artinya pelunasannya melewati jalur normal — biasanya
karena ada yang mengubah status langsung di database.

### Memperbaiki

Perbaiki angka stoknya lewat panel admin (Produk → Edit → Stok). Untuk produk
bervarian, ubah stok per varian, bukan stok produk induk.

---

## Admin tidak bisa login

| Gejala | Sebab | Perbaikan |
|---|---|---|
| `401 Email atau password salah` | kredensial salah, atau akun `aktif = false` | periksa kolom `aktif` di tabel `AdminUser` |
| `429 Too Many Requests` | melebihi 10 percobaan/menit/IP | tunggu satu menit |
| Login berhasil lalu langsung terlempar keluar | `JWT_SECRET` berubah sejak token diterbitkan | wajar setelah rotasi rahasia — semua orang harus login ulang |
| Redirect berputar antara `/admin` dan `/admin/login` | cookie tidak tersimpan | pastikan HTTPS aktif; cookie `secure` tidak akan tersimpan lewat HTTP |

Sandi admin tidak bisa direset lewat panel. Untuk mereset:

```bash
docker compose -f docker-compose.prod.yml exec api node -e "
const argon2 = require('argon2');
argon2.hash(process.argv[1], { type: argon2.argon2id }).then(console.log);
" '<sandi-baru>'
```

lalu perbarui `passwordHash` pada baris admin yang bersangkutan.

---

## Semua orang kena 429

### Memastikan

```bash
docker compose -f docker-compose.prod.yml logs api | grep -c ThrottlerException
```

Periksa juga apakah IP yang tercatat di log semuanya sama — itu tanda
`TRUST_PROXY` salah setel.

### Kenapa terjadi

`TRUST_PROXY` menentukan seberapa jauh Fastify mempercayai `X-Forwarded-For`.
Kalau nilainya terlalu kecil, API melihat semua pengunjung sebagai satu IP
(IP load balancer) dan kuotanya habis bersama-sama.

### Memperbaiki

Setel `TRUST_PROXY` sesuai jumlah lapis proxy:

- `1` — hanya satu load balancer
- `2` — CDN di depan load balancer (mis. Cloudflare + LB)

Terlalu besar juga berbahaya: penyerang bisa memalsukan IP-nya dengan menyisipkan
header sendiri.

---

## Gambar produk hilang setelah deploy

**Penyebabnya hampir pasti `UPLOAD_DIR` tidak menunjuk volume persisten.**

Gambar disimpan di disk lokal container. Tanpa volume, setiap `docker compose up
--build` menghapus semuanya, dan **tidak ada cara memulihkannya** — berkasnya
memang sudah tidak ada.

Perbaikan: pastikan `UPLOAD_DIR=/data/uploads` dan volume `uploads` ter-mount
(sudah diatur di `docker-compose.prod.yml`). Gambar yang telanjur hilang harus
diunggah ulang lewat panel admin.

Pencegahan jangka panjang: pindahkan `UploadService` ke Cloudflare R2.

---

## Database penuh atau lambat

Tabel yang tumbuh paling cepat:

| Tabel | Pertumbuhan | Boleh dibersihkan? |
|---|---|---|
| `Cart` / `CartItem` | tiap pengunjung yang menambah barang | **ya** — yang sudah lama tidak tersentuh |
| `Order` / `OrderItem` | tiap pesanan | **tidak pernah** — catatan keuangan |
| `PointLedger` | tiap mutasi poin | **tidak pernah** — buku besar saldo |

Membersihkan keranjang terbengkalai lebih dari 90 hari:

```sql
DELETE FROM "Cart"
WHERE "updatedAt" < NOW() - INTERVAL '90 days'
  AND "checkoutAt" IS NULL;
```

`CartItem` ikut terhapus lewat cascade. Keranjang yang sudah pernah checkout
sebaiknya disimpan untuk analisis konversi.

---

## Menyalakan mode darurat "toko tutup"

Tidak ada saklar bawaan. Yang paling cepat dan paling tidak merusak:

1. Arahkan reverse proxy untuk membalas halaman pemberitahuan di semua rute
   **kecuali** `/api/v1/pembayaran/midtrans/notifikasi` dan `/api/v1/pesanan/*`.

Jangan mematikan webhook — pembeli yang sudah membayar tetap harus tercatat lunas,
kalau tidak pesanannya akan hangus otomatis dan uangnya sudah telanjur masuk.

---

## Pemeriksaan berkala

**Harian**

```sql
-- Pesanan lunas yang belum diproses lebih dari 24 jam
SELECT nomor, "dibayarPada", total FROM "Order"
WHERE status = 'PAYMENT_SUCCESS' AND "dibayarPada" < NOW() - INTERVAL '24 hours'
ORDER BY "dibayarPada";
```

**Mingguan**

```sql
-- Saldo poin harus cocok dengan buku besarnya
SELECT c.id, c.email, c.poin, COALESCE(SUM(p.jumlah), 0) AS menurut_ledger
FROM "Customer" c
LEFT JOIN "PointLedger" p ON p."customerId" = c.id
GROUP BY c.id, c.email, c.poin
HAVING c.poin <> COALESCE(SUM(p.jumlah), 0);
```

Baris apa pun yang muncul di query kedua adalah masalah nyata: saldo poin
menyimpang dari buku besarnya. `PointLedger` yang menjadi rujukan.

```sql
-- Pesanan lunas yang stoknya belum terpotong
SELECT nomor, status, "dibayarPada" FROM "Order"
WHERE "statusPembayaran" = 'LUNAS' AND "stokSudahDikurangi" = false;
```

**Bulanan**

- Uji restore backup ke database terpisah. Backup yang belum pernah diuji restore
  belum bisa disebut backup.
- Periksa peringatan stok menipis di dashboard admin.
- Cocokkan omzet di dashboard dengan settlement di dashboard Midtrans.
