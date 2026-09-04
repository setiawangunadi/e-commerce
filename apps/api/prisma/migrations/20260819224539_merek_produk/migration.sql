-- Merek dinaikkan dari teks bebas di products jadi tabel tersendiri.
--
-- Ditulis tangan, bukan hasil generate: Prisma akan langsung membuang kolom
-- `brand` beserta isinya. Di sini nilai lamanya dipanen dulu jadi baris Brand
-- lalu ditautkan, supaya katalog yang sudah berjalan tidak kehilangan mereknya.

-- 1. Tabel merek
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "deskripsi" TEXT,
    "logoUrl" TEXT,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "brands_nama_key" ON "brands"("nama");
CREATE UNIQUE INDEX "brands_slug_key" ON "brands"("slug");
CREATE INDEX "brands_aktif_urutan_idx" ON "brands"("aktif", "urutan");

-- 2. Kolom relasi baru
ALTER TABLE "products" ADD COLUMN "brandId" TEXT;

-- 3. Panen merek dari nilai teks yang sudah ada.
--    DISTINCT di-trim lebih dulu supaya "Nusakara" dan "Nusakara " tidak jadi
--    dua merek berbeda.
INSERT INTO "brands" ("id", "nama", "slug", "urutan", "aktif", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    nama,
    trim(both '-' from lower(regexp_replace(nama, '[^a-zA-Z0-9]+', '-', 'g'))),
    0,
    true,
    now(),
    now()
FROM (
    SELECT DISTINCT btrim("brand") AS nama
    FROM "products"
    WHERE "brand" IS NOT NULL AND btrim("brand") <> ''
) AS sumber;

-- 4. Tautkan produk ke merek hasil panen
UPDATE "products" SET "brandId" = b."id"
FROM "brands" b
WHERE btrim("products"."brand") = b."nama";

-- 5. Kolom lama sudah tidak dipakai
ALTER TABLE "products" DROP COLUMN "brand";

-- 6. Kunci asing. SET NULL: menghapus merek tidak boleh ikut menghapus produknya.
ALTER TABLE "products" ADD CONSTRAINT "products_brandId_fkey"
    FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;
