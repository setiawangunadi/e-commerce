-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('MENUNGGU_PEMBAYARAN', 'DIBAYAR', 'DIPROSES', 'DIKIRIM', 'SELESAI', 'DIBATALKAN', 'KEDALUWARSA');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('MENUNGGU', 'LUNAS', 'GAGAL', 'KEDALUWARSA', 'DITANTANG', 'DIKEMBALIKAN');

-- CreateTable
CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "checkoutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "jumlah" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'MENUNGGU_PEMBAYARAN',
    "namaPembeli" TEXT NOT NULL,
    "emailPembeli" TEXT NOT NULL,
    "teleponPembeli" TEXT NOT NULL,
    "alamatLengkap" TEXT NOT NULL,
    "provinsi" TEXT NOT NULL,
    "kota" TEXT NOT NULL,
    "kecamatan" TEXT,
    "kodePos" TEXT NOT NULL,
    "catatanAlamat" TEXT,
    "kurir" TEXT NOT NULL,
    "layananKurir" TEXT NOT NULL,
    "namaLayanan" TEXT NOT NULL,
    "estimasiTiba" TEXT,
    "beratTotal" INTEGER NOT NULL,
    "nomorResi" TEXT,
    "penyediaOngkir" TEXT NOT NULL DEFAULT 'tarif-lokal',
    "subtotal" INTEGER NOT NULL,
    "ongkir" INTEGER NOT NULL,
    "diskon" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "statusPembayaran" "PaymentStatus" NOT NULL DEFAULT 'MENUNGGU',
    "midtransOrderId" TEXT,
    "snapToken" TEXT,
    "snapRedirectUrl" TEXT,
    "metodePembayaran" TEXT,
    "dibayarPada" TIMESTAMP(3),
    "kedaluwarsaPada" TIMESTAMP(3) NOT NULL,
    "stokSudahDikurangi" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "namaProduk" TEXT NOT NULL,
    "namaVarian" TEXT,
    "sku" TEXT NOT NULL,
    "gambarUrl" TEXT,
    "harga" INTEGER NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "berat" INTEGER NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "carts_token_key" ON "carts"("token");

-- CreateIndex
CREATE INDEX "carts_updatedAt_idx" ON "carts"("updatedAt");

-- CreateIndex
CREATE INDEX "cart_items_cartId_idx" ON "cart_items"("cartId");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cartId_productId_variantId_key" ON "cart_items"("cartId", "productId", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_nomor_key" ON "orders"("nomor");

-- CreateIndex
CREATE UNIQUE INDEX "orders_token_key" ON "orders"("token");

-- CreateIndex
CREATE UNIQUE INDEX "orders_midtransOrderId_key" ON "orders"("midtransOrderId");

-- CreateIndex
CREATE INDEX "orders_status_createdAt_idx" ON "orders"("status", "createdAt");

-- CreateIndex
CREATE INDEX "orders_statusPembayaran_kedaluwarsaPada_idx" ON "orders"("statusPembayaran", "kedaluwarsaPada");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
