-- CreateEnum
CREATE TYPE "LandingStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LandingBlockType" AS ENUM ('HERO', 'PRODUK', 'KEUNGGULAN', 'TESTIMONI', 'FAQ', 'HITUNG_MUNDUR', 'CTA', 'TEKS');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "landingSlug" TEXT,
ADD COLUMN     "utmCampaign" TEXT,
ADD COLUMN     "utmContent" TEXT,
ADD COLUMN     "utmMedium" TEXT,
ADD COLUMN     "utmSource" TEXT,
ADD COLUMN     "utmTerm" TEXT;

-- CreateTable
CREATE TABLE "landing_pages" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "LandingStatus" NOT NULL DEFAULT 'DRAFT',
    "judulMeta" TEXT,
    "deskripsiMeta" TEXT,
    "gambarOg" TEXT,
    "metaPixelId" TEXT,
    "ga4Id" TEXT,
    "googleAdsId" TEXT,
    "googleAdsLabel" TEXT,
    "gtmId" TEXT,
    "warnaAksen" TEXT NOT NULL DEFAULT '#c96442',
    "mulaiTayang" TIMESTAMP(3),
    "selesaiTayang" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_blocks" (
    "id" TEXT NOT NULL,
    "landingPageId" TEXT NOT NULL,
    "tipe" "LandingBlockType" NOT NULL,
    "urutan" INTEGER NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "konten" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "landing_pages_slug_key" ON "landing_pages"("slug");

-- CreateIndex
CREATE INDEX "landing_pages_status_slug_idx" ON "landing_pages"("status", "slug");

-- CreateIndex
CREATE INDEX "landing_blocks_landingPageId_urutan_idx" ON "landing_blocks"("landingPageId", "urutan");

-- AddForeignKey
ALTER TABLE "landing_blocks" ADD CONSTRAINT "landing_blocks_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "landing_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
