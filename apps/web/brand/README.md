# Berkas merek

`logo.svg` di sini adalah **pendekatan** dari logo SRN Cullezione — warna dan
komposisinya sudah sesuai (lingkaran kuning, S dan R navy, N teal, "Cullezione"
miring di bawah), tapi monogram aslinya punya bentuk huruf khusus yang tidak bisa
ditiru persis tanpa berkas vektornya.

## Mengganti dengan logo asli

1. Simpan logo asli sebagai **`logo.png`** di folder ini (persegi, minimal
   512×512, latar transparan atau kuning).
2. Jalankan dari akar proyek:

   ```bash
   npm run buat-ikon
   ```

Skrip itu membaca `logo.png` bila ada — kalau tidak, jatuh ke `logo.svg` — lalu
menulis ulang seluruh ikon sekaligus:

| Berkas | Dipakai untuk |
| --- | --- |
| `apps/web/src/app/icon.png` | favicon tab peramban |
| `apps/web/src/app/apple-icon.png` | ikon layar utama iOS (latar kuning penuh, karena iOS tidak mendukung transparansi) |
| `apps/web/public/ikon-192.png` | manifest PWA |
| `apps/web/public/ikon-512.png` | manifest PWA |
| `apps/web/public/ikon-maskable-512.png` | Android, dikecilkan ke area aman 80% agar masker tidak memotong huruf |

Tidak ada ukuran yang perlu disunting manual, jadi tidak ada ikon yang tertinggal
di versi lama.

## Warna

Diambil dari logo dan dipakai di `apps/web/src/app/globals.css`:

| Peran | Heks | Di logo |
| --- | --- | --- |
| `merek-800` | `#123d5b` | navy huruf S dan R |
| `merek-500` | `#1b7f97` | teal huruf N |
| `aksen-500` | `#f5b301` | kuning lingkaran |

Kuning dipakai sebagai **aksen**, bukan warna tombol: teks putih di atasnya hanya
berkontras 1,85:1, jauh di bawah syarat keterbacaan 4,5:1. Lencana berlatar kuning
memakai teks navy (7,89:1).
