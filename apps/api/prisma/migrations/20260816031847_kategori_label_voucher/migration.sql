-- CreateEnum
CREATE TYPE "VoucherType" AS ENUM ('PERSEN', 'NOMINAL');

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "parentId" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "kodeVoucher" TEXT;

-- CreateTable
CREATE TABLE "labels" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "warna" TEXT NOT NULL DEFAULT '#c96442',
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "mulai" TIMESTAMP(3),
    "selesai" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_labels" (
    "productId" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,

    CONSTRAINT "product_labels_pkey" PRIMARY KEY ("productId","labelId")
);

-- CreateTable
CREATE TABLE "vouchers" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "deskripsi" TEXT,
    "tipe" "VoucherType" NOT NULL,
    "nilai" INTEGER NOT NULL,
    "maksPotongan" INTEGER,
    "minBelanja" INTEGER NOT NULL DEFAULT 0,
    "kuota" INTEGER,
    "terpakai" INTEGER NOT NULL DEFAULT 0,
    "mulai" TIMESTAMP(3),
    "selesai" TIMESTAMP(3),
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_products" (
    "voucherId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "voucher_products_pkey" PRIMARY KEY ("voucherId","productId")
);

-- CreateTable
CREATE TABLE "voucher_categories" (
    "voucherId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "voucher_categories_pkey" PRIMARY KEY ("voucherId","categoryId")
);

-- CreateIndex
CREATE UNIQUE INDEX "labels_slug_key" ON "labels"("slug");

-- CreateIndex
CREATE INDEX "labels_aktif_urutan_idx" ON "labels"("aktif", "urutan");

-- CreateIndex
CREATE INDEX "product_labels_labelId_idx" ON "product_labels"("labelId");

-- CreateIndex
CREATE UNIQUE INDEX "vouchers_kode_key" ON "vouchers"("kode");

-- CreateIndex
CREATE INDEX "vouchers_aktif_kode_idx" ON "vouchers"("aktif", "kode");

-- CreateIndex
CREATE INDEX "categories_parentId_idx" ON "categories"("parentId");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_labels" ADD CONSTRAINT "product_labels_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_labels" ADD CONSTRAINT "product_labels_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "labels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_products" ADD CONSTRAINT "voucher_products_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_products" ADD CONSTRAINT "voucher_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_categories" ADD CONSTRAINT "voucher_categories_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_categories" ADD CONSTRAINT "voucher_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
