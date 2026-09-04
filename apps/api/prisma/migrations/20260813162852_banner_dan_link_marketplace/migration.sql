-- AlterTable
ALTER TABLE "products" ADD COLUMN     "linkShopee" TEXT,
ADD COLUMN     "linkTiktok" TEXT;

-- CreateTable
CREATE TABLE "banners" (
    "id" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "subjudul" TEXT,
    "gambarUrl" TEXT NOT NULL,
    "gambarMobileUrl" TEXT,
    "teksTombol" TEXT,
    "tautanTombol" TEXT,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "mulaiTayang" TIMESTAMP(3),
    "selesaiTayang" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "banners_aktif_urutan_idx" ON "banners"("aktif", "urutan");
