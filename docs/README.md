# Dokumentasi Proyek

Toko online satu brand untuk pasar Indonesia. Dokumen di folder ini ditujukan
untuk **orang yang baru menerima proyek ini** dan perlu memahami, menjalankan,
mengubah, dan men-deploy-nya tanpa harus bertanya ke penulis aslinya.

Riset bisnis dan teknis yang mendasari keputusan-keputusannya ada terpisah di
[`research/`](../research/00-overview.md) — 14 dokumen bisnis dan 14 dokumen
teknis. Dokumentasi di sini menjelaskan **apa yang dibangun**; `research/`
menjelaskan **kenapa arahnya begitu**.

## Baca sesuai kebutuhan

**Hari pertama — sekadar menjalankannya**

1. [Setup lokal](02-setup-lokal.md) — dari nol sampai toko terbuka di browser
2. [Arsitektur](01-arsitektur.md) — peta besar: apa berbicara dengan apa

**Sebelum menyentuh kode**

3. [Model data](03-model-data.md) — tabel, relasi, dan arti kolom yang tidak jelas dari namanya
4. [Alur bisnis](05-alur-bisnis.md) — pesanan, pembayaran, voucher, poin. **Bagian terpenting.**
5. [Referensi API](04-api-reference.md) — seluruh endpoint
6. [Frontend](06-frontend.md) — struktur Next.js, Server Action, caching
7. [Testing](07-testing.md) — cara menjalankan dan menulis test

**Saat akan naik ke production**

8. [Deploy produksi](08-deploy-produksi.md) — termasuk checklist yang harus dicentang
9. [Runbook operasional](09-runbook.md) — apa yang dilakukan saat ada yang rusak

**Saat bingung kenapa sesuatu dibuat begitu**

10. [Keputusan teknis](10-keputusan-teknis.md) — catatan keputusan beserta alasannya

## Ringkasan 60 detik

Toko ini menjual produk satu brand, langsung ke pembeli, dengan tiga jalur beli:
checkout sendiri (Midtrans), Shopee, dan TikTok Shop. Pembeli **tidak wajib punya
akun** — guest checkout adalah jalur utama, dan akun hanya menambah riwayat
pesanan, alamat tersimpan, serta program poin.

Dua aplikasi terpisah:

| | Teknologi | Port dev |
|---|---|---|
| `apps/api` | NestJS 11 + Fastify + Prisma 7 + PostgreSQL 17 | 4000 |
| `apps/web` | Next.js 16 (App Router) + Tailwind v4 | 3000 |

Yang paling penting dipahami sebelum mengubah apa pun:

- **Tidak ada satu pun nilai uang yang dipercaya dari browser.** Harga, ongkir,
  diskon voucher, dan potongan poin semuanya dihitung ulang di server saat
  pesanan dibuat. Client hanya mengirim *kode* — kode kurir, kode voucher,
  jumlah poin.
- **Stok berkurang saat pembayaran lunas, bukan saat pesanan dibuat**, dan hanya
  sekali walau Midtrans mengirim notifikasi berulang.
- **Status pesanan hanya boleh maju.** Aturan transisinya ada di satu tempat:
  [`admin-orders.service.ts`](../apps/api/src/order/admin-orders.service.ts).
- **Pelunasan tidak bisa dilakukan admin secara manual** — hanya lewat Midtrans.

Ketiganya dijaga oleh unit test; kalau ada yang berubah, testnya gagal lebih dulu
sebelum uangnya yang salah.

## Peta berkas cepat

```
apps/api/src/
├── order/           pembuatan pesanan & aturan status  ← logika uang inti
├── payment/         Midtrans: webhook, sinkronisasi, cron kedaluwarsa
├── voucher/         perhitungan potongan + label promosi
├── customer/        akun pembeli, alamat, program poin
├── cart/            keranjang tamu berbasis token
├── shipping/        ongkir (Biteship + tarif lokal cadangan)
├── catalog/         endpoint publik & serialisasi produk
├── landing/         landing page iklan + skema blok
├── admin/           CRUD katalog, dashboard, upload
├── auth/            login admin, JWT, RBAC
├── config/          validasi environment saat boot
└── common/          envelope response, filter galat, slug

apps/web/src/
├── app/(toko)/      halaman publik + Server Action pembeli
├── app/admin/       panel admin + Server Action admin
├── app/lp/          landing page kampanye
├── components/      komponen per area (toko/, admin/, landing/)
└── lib/             klien API, sesi, format, tracking
```
