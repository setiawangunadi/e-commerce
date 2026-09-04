# Frontend

Next.js 16 dengan App Router. Etalase dan panel admin berbagi satu aplikasi tapi
punya karakter yang berlawanan: etalase harus statis dan cepat untuk SEO, panel
admin selalu dinamis dan tidak pernah di-cache.

## Struktur

```
src/
├── app/
│   ├── (toko)/            etalase publik
│   │   ├── page.tsx           home
│   │   ├── produk/            katalog & detail
│   │   ├── kategori/[slug]/
│   │   ├── keranjang/
│   │   ├── checkout/
│   │   ├── pesanan/[nomor]/   status pesanan (dibuka lewat token)
│   │   ├── akun/ masuk/ daftar/
│   │   └── actions-*.ts       Server Action pembeli
│   ├── admin/
│   │   ├── (panel)/           halaman panel, dilindungi layout
│   │   ├── login/
│   │   └── actions-*.ts       Server Action admin
│   ├── lp/[slug]/         landing page kampanye (tanpa navigasi toko)
│   └── layout.tsx
├── components/
│   ├── toko/ admin/ landing/
├── lib/
│   ├── api.ts             klien REST + ApiError
│   ├── sesi.ts            cookie sesi admin
│   ├── sesi-pelanggan.ts  cookie sesi pembeli
│   ├── keranjang.ts       cookie token keranjang
│   ├── format.ts          rupiah, tanggal, berat
│   ├── status-pesanan.ts  label & warna status
│   └── tracking.ts        consent, UTM, event iklan
└── proxy.ts               pengganti middleware.ts di Next.js 16
```

## Pembagian tugas

| Jenis berkas | Peran |
|---|---|
| Server Component | mengambil data lewat `lib/api.ts`, merender HTML |
| Server Action (`actions-*.ts`) | menerima form, memanggil API, merevalidasi cache |
| Client Component | interaksi saja — dialog, slider, tombol, hitung mundur |

Client Component **tidak pernah memanggil API langsung**. Token ada di cookie
httpOnly yang tidak bisa dibaca JavaScript, jadi semua panggilan berautentikasi
lewat Server Action atau Server Component.

## Sesi & cookie

Tiga cookie httpOnly, semuanya `sameSite: lax` dan `secure` di produksi:

| Cookie | Isi | Umur |
|---|---|---|
| `sesi_admin` | JWT admin | mengikuti `expiresIn` dari API |
| `sesi_pelanggan` | JWT pelanggan | 30 hari |
| `keranjang` | token keranjang acak | 30 hari |

Cookie admin dan pelanggan **sengaja terpisah**, supaya satu orang bisa membuka
panel admin dan berbelanja sebagai pelanggan di peramban yang sama tanpa saling
menimpa.

## `proxy.ts`

Next.js 16 mengganti nama `middleware` menjadi `proxy`. Di sini ia hanya mengecek
**keberadaan** cookie sesi, bukan keabsahan tokennya:

- `/admin/*` tanpa cookie → redirect ke `/admin/login?lanjut={path}`
- `/admin/login` dengan cookie → redirect ke `/admin`

Validasi token yang sesungguhnya terjadi di layout admin (`ambilProfil()`) dan
pada akhirnya oleh guard di API. Proxy berjalan di **setiap navigasi**, dan
memanggil API di sana akan menambah satu round-trip ke seluruh perpindahan
halaman.

Konsekuensinya: cookie basi akan lolos proxy lalu ditolak layout admin. Itu
disengaja — proxy adalah pengarah, bukan penjaga.

## Caching

| Halaman | Strategi | Alasan |
|---|---|---|
| Home, katalog, detail produk | ISR (`revalidate`) | halaman yang paling butuh cepat dan SEO-friendly |
| Landing page | ISR + `updateTag` | admin harus langsung melihat perubahannya |
| Keranjang, checkout, status pesanan | `cache: 'no-store'` | per pembeli, tidak boleh basi |
| Seluruh panel admin | dinamis | data operasional |

`lib/api.ts` memakai `cache: 'no-store'` **sebagai bawaan**; ISR harus diminta
secara eksplisit lewat opsi `revalidate`. Default yang aman: halaman yang lupa
diatur akan lambat, bukan menampilkan data orang lain.

Dua hal yang gampang merusak ISR tanpa disadari:

1. **Memanggil `cookies()` di layout etalase.** Itu memaksa seluruh etalase jadi
   dinamis dan mematikan ISR di home dan katalog. Karena itu badge jumlah
   keranjang dibaca dari client, bukan dioper lewat layout.
2. **Landing page memakai `updateTag`, bukan `revalidateTag`.** Admin yang
   menekan Simpan lalu membuka "Lihat halaman" harus melihat perubahannya saat
   itu juga, bukan versi lama yang menyegar di belakang layar.

## Form admin

Form produk memanggil Server Action **lewat `useTransition`**, bukan
`<form action={...}>`. Alasannya: React mereset form setelah form-action selesai,
dan pada form sepanjang form produk satu kesalahan validasi akan menghapus seluruh
isian admin.

Gambar dan varian dikirim sebagai **daftar utuh**, lalu diganti seluruhnya di
dalam satu transaksi di API. Pendekatan ini menghindari state setengah jadi bila
sebagian operasi gagal.

## Persetujuan cookie dan tracking

`lib/tracking.ts` adalah lapisan tipis di atas Meta Pixel dan Google gtag dengan
dua aturan yang dipegang ketat:

**1. Tidak ada skrip pihak ketiga yang dimuat sebelum pengunjung menyetujui
cookie.** Memasangnya lebih dulu berarti data pengunjung sudah terkirim ke pihak
ketiga sebelum ia sempat memilih — lihat `research/business/11-legal-compliance.md`
soal UU PDP. Menolak cookie tidak menghilangkan fungsi apa pun di halaman.

**2. Semua pemanggilan aman walau skripnya tidak pernah dimuat.** `fbq?.()` dan
`gtag?.()` dipanggil dengan optional call, sehingga pemblokir iklan — yang sangat
umum — tidak pernah merusak halaman.

Event yang dikirim: `ViewContent`, `AddToCart`, `InitiateCheckout`, dan
`Purchase`.

**`Purchase` dijaga hanya terkirim sekali per nomor pesanan** lewat penanda di
`localStorage`. Halaman status bisa dibuka berkali-kali, dan konversi ganda
membuat ROAS tampak lebih baik dari kenyataan — kesalahan yang mengarah ke
keputusan belanja iklan yang salah.

Atribusi UTM disimpan di `sessionStorage` **tanpa menunggu persetujuan**, karena
itu bukan pelacakan lintas situs melainkan catatan internal asal pesanan.
Kunjungan pertama yang menang.

## Landing page iklan

`/lp/{slug}` sengaja **tanpa navigasi toko** — tanpa menu kategori, pencarian,
atau keranjang di header. Setiap tautan keluar dari halaman iklan adalah jalan
pergi bagi trafik yang sudah dibayar.

Halaman dirakit dari delapan jenis blok:

| Blok | Isinya |
|---|---|
| Hero | judul besar, gambar, poin singkat, tombol utama |
| Produk | grid produk pilihan dengan tombol beli |
| Keunggulan | daftar alasan membeli, dengan ikon |
| Testimoni | ulasan pembeli + rating bintang |
| Tanya Jawab | akordeon FAQ (buka-tutup tanpa JavaScript) |
| Hitung Mundur | penanda batas waktu promo |
| Ajakan Beli | blok penutup dengan tombol besar |
| Teks | paragraf bebas |

Pendekatan blok dipilih ketimbang editor HTML bebas karena hasilnya selalu rapi
di mobile, tidak bisa merusak layout, dan **tidak membuka jalan XSS** — semua isi
blok dirender sebagai teks, tidak pernah sebagai markup.

Tombol CTA punya tiga perilaku: langsung ke checkout (melewati halaman keranjang,
karena setiap langkah tambahan menurunkan konversi), masukkan ke keranjang, atau
pindah ke halaman lain. Produk bervarian tidak bisa dibeli langsung dari tombol
CTA — stok dan SKU melekat pada varian, jadi editornya mengunci pilihan itu.

ID pelacakan diisi **per kampanye**, bukan global, sehingga tiap landing page bisa
punya pixel sendiri. Formatnya divalidasi saat disimpan: salah tempel ID membuat
kampanye berjalan tanpa data konversi, dan itu baru ketahuan setelah anggaran
iklan terpakai.

## Catatan implementasi

- **Kartu produk tidak dibungkus satu `<Link>` besar** — di dalamnya ada tombol
  beli yang menuju tautan lain, dan menyarangkan tautan di dalam tautan tidak
  valid HTML serta membingungkan pembaca layar. Gambar dan judulnya yang jadi
  tautan.
- **`/cari` hanya meneruskan ke `/produk?q=`** — satu implementasi pencarian,
  bukan dua.
- **Halaman detail produk menyertakan structured data `Product`** (harga, mata
  uang, ketersediaan) agar bisa tampil sebagai rich result di Google.
- **`images.dangerouslyAllowLocalIP` hanya aktif di development.** Next.js 16
  memblokir optimasi gambar dari IP lokal sebagai proteksi SSRF. Jangan aktifkan
  di produksi.
- **Tautan marketplace divalidasi dua lapis**: Server Action memastikan skemanya
  `http`/`https`, lalu API membatasi host-nya ke domain resmi Shopee dan TikTok
  termasuk pemendeknya — supaya tombol berlabel "Shopee" benar-benar mengarah ke
  Shopee.

## Variabel `NEXT_PUBLIC_*`

Dibaca saat **build** dan ter-inline ke bundel browser. Mengubahnya menuntut build
ulang; menyetel ulang variabel lalu me-restart container **tidak berpengaruh apa
pun**. Karena itu jangan pernah menaruh rahasia di sana — isinya bisa dibaca siapa
saja yang membuka source halaman.

Yang paling sering terlewat: `NEXT_PUBLIC_MIDTRANS_PRODUKSI` harus sinkron dengan
`MIDTRANS_PRODUKSI` di API. Kalau tidak, popup pembayaran menunjuk lingkungan yang
berbeda dari transaksi yang dibuat server.
