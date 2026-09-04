# Impor produk dari marketplace

Katalog dipindahkan lewat berkas, bukan diambil langsung dari halaman
marketplace. Shopee merender produknya di sisi klien dan memblokir akses
non-peramban: HTML yang dikirim server hanya cangkang kosong, dan API
internalnya membalas `403`. Jadi satu-satunya sumber yang tepercaya adalah
ekspor resmi dari akun penjualnya sendiri.

## 1. Ambil datanya

**Shopee Seller Centre** → Produk Saya → **Mass Update / Ekspor** → unduh berkas
Excel. Isinya nama, SKU, harga, stok, berat, dan varian.

Kalau produknya sedikit, mengetik manual berkas JSON juga wajar.

## 2. Susun jadi JSON

Array objek. Yang wajib hanya empat: `nama`, `sku`, `harga`, `berat`.

```json
[
  {
    "nama": "Dress Linen Lengan Panjang",
    "sku": "ZYR-DRS-001",
    "harga": "Rp 189.000",
    "hargaCoret": 249000,
    "berat": 350,
    "deskripsiSingkat": "Linen adem dengan potongan A-line.",
    "deskripsi": "Uraian panjang...",
    "stok": 12,
    "kategori": "pakaian-wanita",
    "gambar": ["https://contoh.id/1.jpg"],
    "linkShopee": "https://shopee.co.id/product/...",
    "varian": [
      { "nama": "S", "sku": "ZYR-DRS-001-S", "stok": 4 },
      { "nama": "M", "sku": "ZYR-DRS-001-M", "stok": 8 }
    ]
  }
]
```

Catatan:

- **Harga** boleh ditulis `189000`, `"189.000"`, atau `"Rp 189.000"` — ketiganya
  terbaca sama.
- **Berat wajib, dalam gram.** Ongkir dihitung darinya, jadi produk tanpa berat
  ditolak alih-alih ditebak — menebak berarti menagih ongkir yang salah.
- **`kategori`** diisi slug kategori yang sudah ada (lihat `/admin/kategori`).
  Slug yang tidak dikenal diabaikan, produknya tetap masuk tanpa kategori.
- **`gambar`** berisi URL. Maksimal 10 per produk.

## 3. Jalankan

```bash
node scripts/impor-produk.mjs data/produk.json --merek=zyrabelle --uji
```

`--uji` memeriksa seluruh baris tanpa menyimpan apa pun. Jalankan ini dulu.

```bash
node scripts/impor-produk.mjs data/produk.json --merek=zyrabelle
```

Tanpa `--uji` produk benar-benar dibuat, berstatus **DRAFT** supaya bisa
diperiksa dulu di `/admin/produk` sebelum tampil di etalase. Tambahkan
`--terbit` bila memang mau langsung tayang.

Impor berjalan lewat API admin, bukan menulis ke basis data langsung, jadi
seluruh pemeriksaan harga coret, SKU ganda, dan URL marketplace tetap berlaku.
Baris yang gagal dilaporkan satu per satu dan tidak menghentikan sisanya.
