-- Gambar bisa menempel ke satu varian, bukan hanya ke produk.
--
-- Kolomnya nullable dan tanpa pengisian data: seluruh gambar yang sudah ada
-- tetap bernilai NULL, artinya "gambar umum" — persis perilaku sebelumnya.
-- Jadi migrasi ini tidak mengubah tampilan produk mana pun yang sudah terbit.

ALTER TABLE "product_images" ADD COLUMN "variantId" TEXT;

CREATE INDEX "product_images_variantId_urutan_idx" ON "product_images"("variantId", "urutan");

-- CASCADE: menghapus varian ikut membuang gambar miliknya, karena gambar itu
-- tidak punya arti tanpa variannya.
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_variantId_fkey"
    FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
