# 14. Performance & SEO Teknis

## Ringkasan

Dokumen ini membahas optimasi teknis performa & SEO — mendukung SEO sebagai kanal akuisisi utama di [research/business/01-customer-journey.md](../business/01-customer-journey.md), sekaligus memastikan pengalaman mobile yang cepat mengingat mayoritas pembeli mengakses via mobile.

## Core Web Vitals

Google memakai tiga metrik ini sebagai sinyal ranking SEO sekaligus indikator pengalaman pengguna nyata:
- **LCP (Largest Contentful Paint)** — waktu elemen terbesar (biasanya gambar produk/hero) selesai dimuat. Target: di bawah 2.5 detik.
- **INP (Interaction to Next Paint)** — responsivitas terhadap interaksi (klik tombol, buka menu). Target: di bawah 200ms.
- **CLS (Cumulative Layout Shift)** — stabilitas visual, hindari elemen yang "loncat" saat halaman dimuat (misal gambar tanpa dimensi eksplisit yang menyebabkan layout bergeser).

Implementasi teknis di Next.js: gunakan `next/image` dengan dimensi eksplisit (mengatasi CLS), Server Components untuk mengurangi JavaScript yang perlu di-parse browser sebelum halaman interaktif (mengatasi LCP & INP) — lihat [01-frontend.md](01-frontend.md).

## SEO Teknis

Mendukung [research/business/01-customer-journey.md](../business/01-customer-journey.md) (SEO sebagai kanal awareness utama):
- **Structured data (Schema.org)** — markup `Product`, `Offer`, `AggregateRating`, `BreadcrumbList` di setiap halaman produk agar Google bisa menampilkan rich snippet (harga, rating bintang) langsung di hasil pencarian.
- **Sitemap XML** yang di-generate otomatis dan diperbarui saat produk baru ditambahkan/dihapus, di-submit ke Google Search Console.
- **URL yang bersih & deskriptif** — `/produk/nama-produk-slug` bukan `/product?id=12345`, mendukung SEO metadata yang sudah direncanakan di [research/business/02-catalog-inventory.md](../business/02-catalog-inventory.md).
- **Meta tag dinamis** per halaman (title, description, Open Graph image) — penting juga untuk tampilan preview yang menarik saat link dibagikan di WhatsApp/media sosial (kanal distribusi dominan di Indonesia).
- **Canonical URL** untuk mencegah duplicate content jika ada varian URL untuk produk yang sama (misal karena parameter filter/tracking).
- **robots.txt** yang mengatur halaman mana yang boleh/tidak boleh di-crawl (misal halaman cart/checkout tidak perlu terindex).

## Optimasi Gambar

Terhubung dengan [09-storage-cdn-media.md](09-storage-cdn-media.md):
- Format modern (WebP/AVIF) dengan fallback otomatis via `next/image`
- Responsive image (`srcset`) agar perangkat mobile tidak mendownload gambar resolusi desktop yang tidak perlu
- Lazy loading untuk gambar di luar viewport awal

## Caching Strategy

- **ISR (Incremental Static Regeneration)** untuk halaman produk & kategori — halaman di-serve dari cache statis (sangat cepat), tapi otomatis di-regenerate berkala atau saat ada trigger (perubahan harga/stok) — lihat [01-frontend.md](01-frontend.md).
- **CDN edge caching** (Cloudflare) untuk aset statis (CSS, JS, gambar) di-cache di lokasi terdekat pengguna, mengurangi latensi terutama untuk pengguna di luar Jawa.
- **HTTP caching headers** yang tepat (`Cache-Control`) untuk API response yang jarang berubah.

## Mobile Performance Khusus Indonesia

Mengingat variasi kualitas jaringan di Indonesia (tidak semua area punya koneksi 4G/5G stabil, lihat konteks geografi kepulauan di [research/business/05-shipping-fulfillment.md](../business/05-shipping-fulfillment.md)):
- Prioritaskan **bundle size JavaScript sekecil mungkin** — setiap KB berpengaruh nyata di koneksi lambat.
- Pertimbangkan **skeleton loading state** yang informatif alih-alih spinner kosong, agar pengguna dengan koneksi lambat tetap merasa halaman responsif.
- Uji performa dengan throttling jaringan (simulasi 3G/4G lambat) di Chrome DevTools, bukan hanya di koneksi kantor/rumah developer yang biasanya cepat.

## Monitoring Performa Berkelanjutan

- **Lighthouse CI** terintegrasi di pipeline CI/CD ([10-devops-cicd-testing.md](10-devops-cicd-testing.md)) — cegah regresi performa lolos ke production tanpa disadari.
- **Real User Monitoring (RUM)** — Vercel Analytics atau Google Search Console memberi data Core Web Vitals dari pengguna nyata (bukan hanya simulasi lab), penting karena kondisi jaringan riil pengguna Indonesia bervariasi.

## Keputusan Teknis yang Perlu Diambil

1. Target skor Core Web Vitals spesifik yang jadi standar minimum sebelum rilis fitur baru?
2. Apakah Lighthouse CI diintegrasikan sejak awal di pipeline, atau ditambahkan setelah MVP stabil?
3. Berapa sering ISR revalidation dijalankan untuk halaman produk (trade-off antara kesegaran data vs beban server)?

## Referensi

- [Top 20 Next.js Best Practices Every Developer Should Follow in 2026](https://cloudrevol.com/blog/nextjs-best-practices)
- Praktik umum Core Web Vitals & SEO teknis e-commerce, disesuaikan konteks variasi kualitas jaringan mobile di Indonesia.
