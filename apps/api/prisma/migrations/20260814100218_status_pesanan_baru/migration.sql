-- Mengganti nama nilai enum OrderStatus ke penamaan baru.
--
-- Memakai ALTER TYPE ... RENAME VALUE, bukan membuat ulang tipe enum, supaya
-- pesanan yang sudah ada tetap utuh — nilai lama otomatis ikut berganti nama.

ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;

ALTER TYPE "OrderStatus" RENAME VALUE 'MENUNGGU_PEMBAYARAN' TO 'WAITING_PAYMENT';
ALTER TYPE "OrderStatus" RENAME VALUE 'DIBAYAR'             TO 'PAYMENT_SUCCESS';
ALTER TYPE "OrderStatus" RENAME VALUE 'DIPROSES'            TO 'PROCESS_ORDER';
ALTER TYPE "OrderStatus" RENAME VALUE 'DIKIRIM'             TO 'ORDER_SEND';
ALTER TYPE "OrderStatus" RENAME VALUE 'SELESAI'             TO 'ORDER_RECEIPT';
ALTER TYPE "OrderStatus" RENAME VALUE 'DIBATALKAN'          TO 'ORDER_CANCELLED';
ALTER TYPE "OrderStatus" RENAME VALUE 'KEDALUWARSA'         TO 'PAYMENT_EXPIRED';

ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'WAITING_PAYMENT';
