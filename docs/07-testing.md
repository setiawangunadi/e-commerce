# Testing

## Menjalankan

```bash
npm test
```

Per workspace:

```bash
npm run test:api
```

```bash
npm run test:web
```

Mode watch saat sedang mengerjakan sesuatu:

```bash
npm run test:watch --workspace apps/api
```

Laporan cakupan (HTML di `apps/*/coverage/index.html`):

```bash
npm run test:coverage
```

Menjalankan satu berkas atau satu test:

```bash
npx vitest run test/order/order.service.test.ts --dir apps/api
```

```bash
npm run test:api -- -t "tidak pernah membiarkan potongan menutup ongkir"
```

## Susunannya

| | Berkas | Test |
|---|---|---|
| `apps/api` | 29 | 675 |
| `apps/web` | 6 | 85 |

```
apps/api/test/
├── bantuan/
│   ├── prisma-palsu.ts    PrismaService tiruan berbasis Proxy
│   └── konteks.ts         ExecutionContext tiruan untuk guard
├── setup.ts               membungkam Logger, memuat reflect-metadata
├── order/ payment/ voucher/ customer/ cart/    ← logika uang & stok
├── shipping/ catalog/ landing/ admin/ banner/  ← modul pendukung
├── auth/ common/ config/ dto/
apps/web/test/
├── setup.ts               Storage in-memory (lihat catatan Node 25 di bawah)
├── api.test.ts  format.test.ts  tracking.test.ts
├── status-pesanan.test.ts  proxy.test.ts  toko.test.ts
```

## Pendekatan

Semuanya **unit test**, tanpa database dan tanpa jaringan. Service diinstansiasi
langsung dengan `new`, dependensinya diganti tiruan. Konsekuensinya test berjalan
di bawah 5 detik untuk seluruh suite, sehingga benar-benar dijalankan saat
mengubah kode — bukan hanya di CI.

Yang diuji dipilih berdasarkan **apa yang merugikan bila salah**, bukan demi
angka cakupan:

| Prioritas | Contoh |
|---|---|
| Uang | perhitungan total, voucher, poin, verifikasi signature webhook |
| Stok | pengurangan sekali saja, pengembalian saat batal, pengecekan berlapis |
| Akses | pemisahan audience token, RBAC, kepemilikan alamat & item keranjang |
| Aturan status | matriks transisi pesanan, resi wajib |
| Validasi input | penolakan kolom asing, whitelist host marketplace |

Yang **tidak** diuji: modul Nest (tidak punya cabang logika), DTO tanpa aturan
kustom, dan kode hasil generate Prisma. Semuanya dikecualikan dari laporan
cakupan di `vitest.config.mts`.

## Menulis test baru

Nama test ditulis sebagai **kalimat yang menjelaskan aturannya**, dalam Bahasa
Indonesia, sehingga daftar test terbaca seperti spesifikasi:

```
✓ MENOLAK admin melunasi pesanan secara manual
✓ tidak pernah membiarkan potongan menutup ongkir
✓ tidak mengurangi stok dua kali walau Midtrans mengirim notifikasi berulang
✓ HANYA menyentuh pesanan yang belum punya pemilik
```

Bila aturan yang diuji punya alasan yang tidak jelas dari kodenya, alasan itu
ditulis sebagai komentar di dalam test — bukan di nama testnya.

### Prisma tiruan

`buatPrismaPalsu()` mengembalikan Proxy: setiap `prisma.<model>.<metode>` menjadi
`vi.fn()` saat pertama disentuh, dengan nilai balik bawaan yang aman (`null`,
`[]`, `{ count: 0 }`).

```ts
const prisma = buatPrismaPalsu();
prisma.order.findUnique.mockResolvedValue({ id: 'order-1', total: 250_000 });

const service = new PaymentService(prisma as unknown as PrismaService, midtrans);
```

`$transaction` menjalankan callback-nya dengan objek **yang sama**, jadi
ekspektasi pada `prisma.order.update` tetap tertangkap walau kode aslinya
memanggil `tx.order.update`.

**Jebakan yang sering muncul:** service yang membaca baris yang sama dua kali
dengan bentuk berbeda — sekali `select` ringkas untuk pemeriksaan, sekali
`include` lengkap untuk response. Bedakan lewat argumennya:

```ts
prisma.order.findUnique.mockImplementation(async (args) =>
  args.include ? pesananLengkap() : pesananRingkas(),
);
```

### Menguji guard

```ts
const konteks = buatKonteks({ headers: { authorization: 'Bearer token' } });
await guard.canActivate(konteks);
```

### Menguji DTO

`plainToInstance` + `validate` dengan opsi yang sama persis dengan ValidationPipe
global (`whitelist`, `forbidNonWhitelisted`), supaya yang diuji benar-benar
perilaku produksi. Helper `periksa()` di `test/dto/validasi-dto.test.ts`
membungkusnya.

## Catatan lingkungan

**Vitest, bukan Jest.** Transformasinya memakai SWC (`unplugin-swc`) karena kode
ini bergantung pada dekorator dan `emitDecoratorMetadata` — esbuild bawaan Vite
tidak memancarkan metadata itu, dan validasi DTO akan diam-diam melewatkan
konversi tipe implisit.

**Tidak bisa `vi.spyOn` ekspor ESM.** Modul seperti `argon2` harus di-mock penuh
dengan `vi.mock()` di tingkat berkas. Karena itu pemeriksaan perlindungan timing
login berada di berkas terpisah,
[`test/auth/perlindungan-timing.test.ts`](../apps/api/test/auth/perlindungan-timing.test.ts),
supaya berkas lain tetap memakai argon2 sungguhan.

**Node 25 dan `localStorage`.** Node 25 memasang `localStorage`/`sessionStorage`
eksperimentalnya sendiri di `globalThis`, dan versi itu membayangi milik jsdom
tanpa menyediakan API Storage yang lengkap (`clear` tidak ada). `apps/web/test/setup.ts`
memasang implementasi in-memory sendiri, dipasang ulang setiap test supaya
persetujuan cookie atau atribusi UTM dari satu test tidak bocor ke test berikutnya.

**argon2 lambat, dan itu memang gunanya.** Hash dihitung sekali di `beforeAll`
lalu dipakai ulang seluruh berkas. Jangan memanggil `hashPassword()` di dalam
`beforeEach`.

## Yang belum ada

Tidak ada test integrasi maupun end-to-end. Ini keputusan sadar untuk tahap ini,
bukan kelalaian — dua jalur yang paling berisiko sudah tertutup unit test
(perhitungan uang dan aturan status), sementara e2e menuntut database, akun
Midtrans sandbox, dan waktu jalan yang jauh lebih panjang.

Bila nanti ditambahkan, prioritasnya:

1. **Alur checkout lengkap** dengan database sungguhan — memastikan transaksi
   Prisma benar-benar melakukan rollback saat stok kurang.
2. **Webhook Midtrans end-to-end** dengan signature sungguhan.
3. **Migrasi Prisma pada data yang sudah ada** — CI baru menguji migrasi di
   database kosong.
