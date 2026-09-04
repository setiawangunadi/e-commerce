# 01. Frontend

## Ringkasan

Dokumen ini membahas pilihan teknologi untuk sisi frontend (yang dilihat & dipakai langsung oleh pembeli dan admin) dari e-commerce single-store custom build. Frontend menjadi implementasi teknis dari alur bisnis di [research/business/01-customer-journey.md](../business/01-customer-journey.md) dan [research/business/03-cart-checkout.md](../business/03-cart-checkout.md).

## Rekomendasi Utama

**Next.js (App Router) dengan React & TypeScript.**

Alasan:
- **Server Components** untuk halaman produk yang SEO-friendly tanpa mengirim banyak JavaScript ke browser — penting karena SEO adalah kanal akuisisi utama (lihat riset bisnis customer journey).
- **Server Actions** untuk mutasi cart/checkout tanpa perlu membuat REST endpoint terpisah untuk setiap aksi sederhana.
- **Image Optimization bawaan** (`next/image`) — penting karena performa foto produk berdampak langsung ke Core Web Vitals dan konversi.
- **Rendering hybrid** — halaman produk/kategori bisa di-render statis dengan revalidation (ISR) untuk kecepatan, sementara halaman cart/checkout/akun di-render dinamis.
- Ekosistem besar, dokumentasi baik, mudah cari referensi/tutorial — cocok untuk solo developer.

## Arsitektur Rendering per Jenis Halaman

| Halaman | Strategi | Alasan |
|---|---|---|
| Homepage, kategori | Static + ISR (revalidate berkala) | Jarang berubah drastis, butuh load cepat |
| Product Detail Page | Static + ISR (revalidate saat stok/harga berubah) | SEO penting, tapi data harus tetap akurat |
| Search hasil pencarian | Dinamis (Server Component fetch ke search engine) | Query berbeda tiap request |
| Cart, checkout, akun | Dinamis / Client Component | Data spesifik per sesi pengguna |
| Dashboard admin | Client-side rendered (SPA-like) di balik autentikasi | Tidak perlu SEO, interaktivitas tinggi diprioritaskan |

## Pola Pengembangan yang Disarankan

- Push `'use client'` sejauh mungkin ke bawah tree komponen — halaman tetap Server Component yang fetch data, lalu diteruskan ke Client Component kecil untuk interaktivitas (dropdown varian, tombol add-to-cart).
- Gunakan Server Actions hanya untuk mutasi form (submit checkout, apply voucher), bukan untuk semua interaksi.
- Gunakan `Suspense` + `useOptimistic` untuk update UI yang terasa instan (misal jumlah item di cart icon langsung berubah sebelum server selesai memproses).
- Caching data dengan revalidation tag-based (`revalidateTag`) agar saat admin update stok/harga di [02-catalog-inventory.md](../business/02-catalog-inventory.md), halaman produk terkait ikut ter-invalidate.

## State Management

- **Server state** (data dari API/database): cukup ditangani lewat fetching Next.js bawaan (tidak perlu Redux/Zustand untuk ini).
- **Client state** (UI state seperti modal terbuka, filter aktif): `useState`/`useReducer` biasa, atau **Zustand** jika state perlu dibagi antar komponen yang jauh (misal cart drawer yang bisa dibuka dari banyak tempat).
- Hindari over-engineering dengan Redux di awal — untuk single-store MVP, kompleksitasnya jarang dibutuhkan.

## UI Component & Styling

- **Tailwind CSS** — utility-first, cepat untuk membangun UI custom tanpa menulis banyak CSS terpisah, ekosistem besar.
- **shadcn/ui** (komponen berbasis Radix UI + Tailwind) — komponen accessible siap pakai (dialog, dropdown, toast) yang bisa dikustomisasi penuh karena kodenya di-copy ke project, bukan dependency tertutup.
- Untuk form (checkout, alamat, produk admin): **React Hook Form** + **Zod** untuk validasi skema yang bisa dipakai bersama di frontend & backend.

## Mobile & Performance

- Karena mayoritas trafik pembeli Indonesia dari mobile (lihat [research/business/01-customer-journey.md](../business/01-customer-journey.md)), desain mobile-first adalah keharusan, bukan opsional.
- Perhatikan Core Web Vitals (LCP, INP, CLS) — Google memakainya sebagai sinyal ranking SEO, dan halaman lambat langsung menurunkan konversi.
- Lazy load gambar di bawah fold, gunakan format gambar modern (WebP/AVIF) via `next/image`.

## Alternatif yang Dipertimbangkan (dan Kenapa Tidak Dipilih untuk MVP)

- **Vue/Nuxt** — ekosistem lebih kecil dari React/Next.js untuk e-commerce, lebih sedikit referensi khusus Indonesia.
- **SvelteKit** — performa bagus tapi ekosistem plugin/komponen e-commerce lebih terbatas dibanding React.
- **Create React App / SPA murni** — tidak ada SSR bawaan, buruk untuk SEO produk yang jadi andalan akuisisi organik.

## Keputusan Teknis yang Perlu Diambil

1. Apakah memakai App Router penuh (direkomendasikan) atau tetap Pages Router (legacy, tidak disarankan untuk project baru)?
2. Zustand atau cukup React Context untuk state cart di client?
3. Apakah butuh PWA (installable, offline-capable) di fase awal, atau menyusul?
4. Bahasa: apakah UI mendukung multi-bahasa (i18n) sejak awal, atau Bahasa Indonesia saja dulu?

## Referensi

- [Next.js App Router Best Practices for Production (2026)](https://www.javascriptdoctor.blog/2026/07/nextjs-app-router-best-practices-for.html)
- [Next.js 16 App Router: The Complete Guide for 2026 — DEV Community](https://dev.to/getcraftly/nextjs-16-app-router-the-complete-guide-for-2026-2hi3)
- Vercel Next.js Commerce sebagai referensi implementasi headless commerce dengan App Router & React Server Components.
