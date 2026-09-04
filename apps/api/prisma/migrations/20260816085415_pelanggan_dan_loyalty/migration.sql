-- CreateEnum
CREATE TYPE "CustomerTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "PointType" AS ENUM ('EARN', 'REDEEM', 'TO_VOUCHER', 'ADJUST', 'REFUND');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "poinDipakai" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "potonganPoin" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "telepon" TEXT,
    "passwordHash" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "poin" INTEGER NOT NULL DEFAULT 0,
    "tier" "CustomerTier" NOT NULL DEFAULT 'BRONZE',
    "belanja12Bulan" INTEGER NOT NULL DEFAULT 0,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_addresses" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "namaPenerima" TEXT NOT NULL,
    "teleponPenerima" TEXT NOT NULL,
    "alamatLengkap" TEXT NOT NULL,
    "provinsi" TEXT NOT NULL,
    "kota" TEXT NOT NULL,
    "kecamatan" TEXT,
    "kodePos" TEXT NOT NULL,
    "catatan" TEXT,
    "utama" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "point_ledger" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tipe" "PointType" NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "saldoSesudah" INTEGER NOT NULL,
    "orderId" TEXT,
    "kodeVoucher" TEXT,
    "keterangan" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "point_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");

-- CreateIndex
CREATE INDEX "customers_tier_createdAt_idx" ON "customers"("tier", "createdAt");

-- CreateIndex
CREATE INDEX "customer_addresses_customerId_utama_idx" ON "customer_addresses"("customerId", "utama");

-- CreateIndex
CREATE INDEX "point_ledger_customerId_createdAt_idx" ON "point_ledger"("customerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "point_ledger_orderId_tipe_key" ON "point_ledger"("orderId", "tipe");

-- CreateIndex
CREATE INDEX "orders_customerId_createdAt_idx" ON "orders"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "orders_emailPembeli_idx" ON "orders"("emailPembeli");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_ledger" ADD CONSTRAINT "point_ledger_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_ledger" ADD CONSTRAINT "point_ledger_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
