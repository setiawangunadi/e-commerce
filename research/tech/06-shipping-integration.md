# 06. Shipping Integration (Teknis)

## Ringkasan

Dokumen ini membahas implementasi teknis integrasi API kurir untuk kalkulasi ongkir, pembuatan pengiriman, dan tracking — melengkapi sisi bisnis di [research/business/05-shipping-fulfillment.md](../business/05-shipping-fulfillment.md).

## Rekomendasi: Agregator API (Biteship)

Daripada integrasi satu-per-satu ke tiap ekspedisi (JNE, J&T, SiCepat, dll.), gunakan **agregator API** yang menyatukan banyak kurir dalam satu integrasi.

**Biteship** direkomendasikan sebagai pilihan utama:
- Satu API terhubung ke 30+ kurir Indonesia (JNE, J&T, SiCepat, Ninja Express, AnterAja, Grab, Gojek, dll.)
- Menyediakan tiga API inti yang cukup untuk seluruh alur di [research/business/05-shipping-fulfillment.md](../business/05-shipping-fulfillment.md):
  - **Postage/Rates Check API** — kalkulasi ongkir real-time saat checkout
  - **Order API** — membuat pengiriman (booking kurir) setelah order dibayar
  - **Receipt/Tracking API** — cek status pengiriman & webhook update tracking

**RajaOngkir** adalah alternatif yang juga solid, terutama dikenal kuat di kalkulasi ongkir & data wilayah Indonesia (provinsi/kota) — bisa dipertimbangkan sebagai cadangan atau dikombinasikan (misal RajaOngkir untuk data wilayah, Biteship untuk booking & tracking).

## Alur Integrasi Teknis

1. **Saat checkout** — backend memanggil Rates API dengan parameter asal (gudang), tujuan (alamat pembeli), berat/dimensi total item di cart → menerima daftar opsi kurir & estimasi biaya + waktu tiba, ditampilkan ke pembeli (lihat [research/business/03-cart-checkout.md](../business/03-cart-checkout.md)).
2. **Setelah order dibayar** — backend memanggil Order API untuk membuat pesanan pengiriman resmi ke kurir terpilih, menerima nomor resi (tracking number/waybill).
3. **Cetak label** — data label pengiriman (nama, alamat, nomor resi) di-generate untuk dicetak oleh staf gudang (lihat [research/business/05-shipping-fulfillment.md](../business/05-shipping-fulfillment.md)).
4. **Update tracking** — dua opsi:
   - **Webhook** dari agregator setiap status pengiriman berubah (picked up → in transit → delivered) — pendekatan real-time yang disarankan.
   - **Polling** berkala via job terjadwal jika webhook tidak tersedia/kurang reliable untuk kurir tertentu.
5. **Update status order** — status shipment dipetakan ke status order di [research/business/06-order-management.md](../business/06-order-management.md) (`shipped` → `delivered`).

## Data Wilayah Indonesia

Untuk form alamat di checkout yang akurat (lihat edge case format alamat berjenjang di [research/business/03-cart-checkout.md](../business/03-cart-checkout.md)):
- Agregator ongkir (Biteship/RajaOngkir) biasanya menyediakan endpoint data wilayah (provinsi → kota/kabupaten → kecamatan) yang bisa dipakai langsung untuk dropdown/autocomplete alamat, sinkron dengan kode area yang mereka pakai untuk kalkulasi ongkir.
- Alternatif: gunakan dataset wilayah resmi Kemendagri (kode wilayah) sebagai sumber data statis di database sendiri, lalu mapping ke kode area agregator saat memanggil API ongkir.

## Instant Courier (Same-Day/Instant Delivery)

Untuk opsi pengiriman instant di kota besar (lihat [research/business/05-shipping-fulfillment.md](../business/05-shipping-fulfillment.md)):
- Biteship juga mendukung integrasi Gojek/Grab untuk pengiriman instant — API serupa dengan kurir reguler, hanya beda parameter jenis layanan.

## Penanganan Error & Edge Case Teknis

- **Area tidak terjangkau** — API akan mengembalikan response kosong/error untuk kurir tertentu; frontend harus fallback menampilkan kurir lain yang tersedia (bukan error blank).
- **Berat/dimensi tidak diisi di data produk** — validasi wajib di level katalog ([research/business/02-catalog-inventory.md](../business/02-catalog-inventory.md)) sebelum produk bisa dipublish, agar tidak ada produk yang gagal dihitung ongkirnya.
- **Rate limit API agregator** — cache hasil kalkulasi ongkir sebentar (misal beberapa menit) untuk kombinasi asal-tujuan-berat yang sama, mengurangi panggilan API berulang saat pembeli berulang kali membuka halaman checkout.

## Keputusan Teknis yang Perlu Diambil

1. Biteship, RajaOngkir, atau kombinasi keduanya?
2. Webhook atau polling untuk update tracking (webhook direkomendasikan jika tersedia & reliable)?
3. Berapa banyak kurir yang diaktifkan untuk pembeli pilih di checkout (jangan terlalu banyak opsi hingga membingungkan)?
4. Apakah data wilayah disimpan sendiri di database atau selalu fetch dari API agregator?

## Referensi

- [Biteship Shipping API — Multi-Courier Rates & Tracking](https://biteship.com/en/product/api)
- [RajaOngkir API V2 Documentation](https://rajaongkir.com/docs/shipping-cost/getting_started/about)
- [Mengenal Integrasi API Pengiriman — Biteship](https://biteship.com/blog/integrasi-api-pengiriman/)
