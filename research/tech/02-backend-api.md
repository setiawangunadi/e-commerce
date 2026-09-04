# 02. Backend & API

## Ringkasan

Dokumen ini membahas pilihan teknologi untuk sisi backend — logika bisnis, API, dan orkestrasi antar sistem (payment gateway, kurir, database). Backend adalah implementasi teknis dari [research/business/06-order-management.md](../business/06-order-management.md) dan seluruh alur transaksional lainnya.

## Rekomendasi Utama

**Node.js dengan TypeScript**, menggunakan **NestJS** untuk domain service utama.

Alasan memilih Node.js/TypeScript:
- Satu bahasa (TypeScript) di frontend & backend — solo developer tidak perlu context-switch antar bahasa, bisa share tipe data (misal skema Zod) antara Next.js dan backend.
- Ekosistem npm sangat besar, termasuk SDK resmi untuk Midtrans/Xendit dan banyak library Indonesia-specific (wilayah, format alamat).

Alasan memilih NestJS dibanding Express/Fastify polos:
- Struktur modular (module, controller, service, dependency injection) memberi organisasi kode yang jelas — penting untuk project yang akan tumbuh mencakup 14+ domain bisnis (katalog, order, payment, shipping, dst.) seperti dipetakan di riset bisnis.
- Built-in dukungan validasi (`class-validator`), guard untuk autentikasi/otorisasi, dan interceptor untuk logging/transformasi response — mengurangi boilerplate berulang.
- NestJS bisa memakai **Fastify sebagai adapter HTTP** (`@nestjs/platform-fastify`) untuk mendapat performa Fastify (~2-3x throughput Express) sambil tetap memakai struktur NestJS.

## Kapan Pakai Express/Fastify Polos

Jika lebih memilih kesederhanaan tanpa struktur berat NestJS, **Fastify** adalah alternatif solid: lebih cepat dari Express, validasi skema JSON bawaan, ekosistem plugin cukup besar. Express tetap layak untuk service kecil/thin (misal microservice webhook handler sederhana), tapi throughput-nya paling rendah di antara ketiganya.

> Untuk skala solo-developer single-store, perbedaan performa murni jarang jadi bottleneck nyata — database dan API pihak ketiga (payment, kurir) biasanya jadi penentu latensi sesungguhnya. Pilih berdasarkan kenyamanan struktur kode, bukan semata benchmark req/s.

## Arsitektur: Modular Monolith (bukan Microservices)

Untuk MVP single-store dengan tim solo/kecil, **modular monolith** adalah pendekatan yang tepat:
- Satu aplikasi backend, tapi dipecah jadi modul-modul jelas mengikuti domain bisnis: `catalog`, `cart`, `order`, `payment`, `shipping`, `customer`, `promotion`, dst. — mengikuti pemetaan domain di [research/business/00-overview.md](../business/00-overview.md).
- Menghindari kompleksitas operasional microservices (banyak service untuk di-deploy, di-monitor, dan koordinasi network) yang tidak sepadan manfaatnya di skala awal.
- Modul dirancang dengan boundary yang jelas (interface antar modul via service layer, bukan akses langsung antar database modul) sehingga **bisa dipecah jadi microservice nanti** jika skala benar-benar membutuhkan.

## Desain API

- **REST API** sebagai pilihan default — lebih sederhana untuk dipahami, cocok untuk kebutuhan CRUD standar e-commerce (produk, order, cart), dan lebih mudah di-cache di level HTTP/CDN dibanding GraphQL.
- Pertimbangkan **GraphQL** hanya jika frontend butuh fleksibilitas query yang tinggi (misal banyak varian tampilan produk dengan field berbeda-beda) — untuk single-store MVP, REST biasanya cukup.
- Versioning API (`/api/v1/...`) sejak awal untuk menghindari breaking change yang menyulitkan saat mobile app/integrasi lain ditambahkan nanti.
- Response format konsisten (envelope `{ data, error, meta }`) di seluruh endpoint.

## Autentikasi & Otorisasi Antar Layanan

Lihat detail di [04-authentication-security.md](04-authentication-security.md). Backend perlu membedakan:
- **Endpoint publik** (katalog, search) — tanpa auth
- **Endpoint pembeli** (cart, order, akun) — auth session/JWT pembeli
- **Endpoint admin** (dashboard order management, [research/business/06-order-management.md](../business/06-order-management.md)) — auth terpisah dengan role-based access control (RBAC)
- **Webhook dari pihak ketiga** (payment gateway, kurir) — verifikasi signature, bukan session biasa

## Job Queue & Background Processing

Beberapa proses tidak boleh blocking request utama:
- Kirim email/WhatsApp notifikasi setelah order dibuat
- Sinkronisasi stok ke marketplace (lihat [research/business/14-omnichannel.md](../business/14-omnichannel.md))
- Auto-cancel order yang tidak dibayar dalam batas waktu (lihat [research/business/04-payment.md](../business/04-payment.md))
- Generate laporan/export data besar

Rekomendasi: **BullMQ** (berbasis Redis) untuk job queue — matang, terintegrasi baik dengan Node.js/NestJS, mendukung scheduled job (cocok untuk auto-cancel order kedaluwarsa) dan retry otomatis.

## Keputusan Teknis yang Perlu Diambil

1. NestJS penuh, atau Fastify/Express polos jika ingin lebih ringan?
2. REST murni, atau ada bagian tertentu yang butuh GraphQL?
3. Modular monolith sejak awal (direkomendasikan) atau langsung microservices?
4. Job queue: BullMQ (Redis) atau alternatif lain?

## Referensi

- [NestJS vs Fastify vs Express: Which Backend Wins in 2026 — DEV Community](https://dev.to/ihor_ostin/nestjs-vs-fastify-vs-express-which-backend-wins-in-2026-2ep2)
- [NestJS vs Fastify 2026 — Performance, DX & Use Cases — Encore](https://encore.dev/articles/nestjs-vs-fastify)
- [Top Node.js Frameworks 2026: NestJS vs Fastify vs Express](https://ortemtech.com/blog/top-nodejs-frameworks-2026/)
