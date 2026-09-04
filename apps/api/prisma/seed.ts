import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { resolve } from 'node:path';
import { PrismaClient } from '../src/generated/prisma/client.ts';
import { buatSlug } from '../src/common/slug';
import { BANNER, KATEGORI, LABEL, LABEL_PRODUK, PRODUK, VOUCHER } from './seed-data';
import { tulisGambarPlaceholder } from './seed-images';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL belum di-set di apps/api/.env');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const UPLOAD_DIR = resolve(process.cwd(), process.env.UPLOAD_DIR ?? './uploads');
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL ?? 'http://localhost:4000';

async function seedAdmin(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@toko.local';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'admin12345';
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  await prisma.adminUser.upsert({
    where: { email },
    update: {},
    create: { email, nama: 'Admin Toko', passwordHash, role: 'ADMIN', aktif: true },
  });

  // Satu akun STAFF untuk menguji pembatasan RBAC (tidak bisa hapus produk).
  await prisma.adminUser.upsert({
    where: { email: 'staff@toko.local' },
    update: {},
    create: {
      email: 'staff@toko.local',
      nama: 'Staf Gudang',
      passwordHash: await argon2.hash('staff12345', { type: argon2.argon2id }),
      role: 'STAFF',
      aktif: true,
    },
  });

  console.log(`  Admin  : ${email} / ${password}`);
  console.log(`  Staff  : staff@toko.local / staff12345`);
}

async function main(): Promise<void> {
  console.log('Menyiapkan data awal...\n');

  // Bersihkan data katalog lama agar seed idempoten (aman dijalankan berulang).
  await prisma.banner.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.productLabel.deleteMany();
  await prisma.product.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.label.deleteMany();
  await prisma.voucherProduct.deleteMany();
  await prisma.voucherCategory.deleteMany();
  await prisma.voucher.deleteMany();
  await prisma.category.deleteMany();

  await seedAdmin();

  // --- Gambar placeholder ---------------------------------------------------
  await tulisGambarPlaceholder(
    [
      ...BANNER.map((b, i) => ({
        nama: `banner-${i + 1}`,
        judul: b.judul,
        subjudul: b.subjudul,
        bentuk: 'lebar' as const,
      })),
      ...KATEGORI.map((k) => ({ nama: `kategori-${k.slug}`, judul: k.nama, subjudul: 'Kategori' })),
      ...PRODUK.map((p) => ({
        nama: `produk-${buatSlug(p.nama)}`,
        judul: p.nama,
        subjudul: p.brand,
      })),
    ],
    UPLOAD_DIR,
  );

  const urlGambar = (nama: string) => `${PUBLIC_BASE_URL}/uploads/seed/${nama}.svg`;

  // --- Banner ---------------------------------------------------------------
  for (const [i, b] of BANNER.entries()) {
    await prisma.banner.create({
      data: {
        judul: b.judul,
        subjudul: b.subjudul,
        gambarUrl: urlGambar(`banner-${i + 1}`),
        teksTombol: b.teksTombol,
        tautanTombol: b.tautanTombol,
        urutan: b.urutan,
        aktif: true,
      },
    });
  }
  console.log(`\n  ${BANNER.length} banner dibuat`);

  // --- Kategori -------------------------------------------------------------
  const kategoriTersimpan = new Map<string, string>();

  // Induk dulu, baru anaknya — parentId tidak bisa dirujuk sebelum induknya ada.
  const berurut = [...KATEGORI].sort((a, b) => Number('induk' in a) - Number('induk' in b));

  for (const k of berurut) {
    const indukSlug = 'induk' in k ? (k.induk as string) : null;
    const dibuat = await prisma.category.create({
      data: {
        nama: k.nama,
        slug: k.slug,
        deskripsi: k.deskripsi,
        gambarUrl: urlGambar(`kategori-${k.slug}`),
        urutan: k.urutan,
        aktif: true,
        parentId: indukSlug ? (kategoriTersimpan.get(indukSlug) ?? null) : null,
      },
    });
    kategoriTersimpan.set(k.slug, dibuat.id);
  }
  const jumlahAnak = KATEGORI.filter((k) => 'induk' in k).length;
  console.log(
    `  ${KATEGORI.length} kategori dibuat (${KATEGORI.length - jumlahAnak} induk, ${jumlahAnak} sub-kategori)`,
  );

  // --- Label promosi --------------------------------------------------------
  const labelTersimpan = new Map<string, string>();
  for (const l of LABEL) {
    const dibuat = await prisma.label.create({
      data: {
        nama: l.nama,
        slug: l.slug,
        warna: l.warna,
        urutan: l.urutan,
        aktif: true,
        selesai:
          'berlakuHari' in l && l.berlakuHari
            ? new Date(Date.now() + l.berlakuHari * 24 * 60 * 60 * 1000)
            : null,
      },
    });
    labelTersimpan.set(l.slug, dibuat.id);
  }
  console.log(`  ${LABEL.length} label promosi dibuat`);

  // --- Merek ----------------------------------------------------------------
  // Dikumpulkan dari data produk supaya tidak ada daftar merek terpisah yang
  // bisa melenceng dari produk yang benar-benar ada.
  const merekTersimpan = new Map<string, string>();
  for (const [i, nama] of [...new Set(PRODUK.map((p) => p.brand))].entries()) {
    const dibuat = await prisma.brand.create({
      data: { nama, slug: buatSlug(nama), urutan: i, aktif: true },
    });
    merekTersimpan.set(nama, dibuat.id);
  }
  console.log(`  ${merekTersimpan.size} merek dibuat`);

  // --- Produk ---------------------------------------------------------------
  // publishedAt dibuat menurun agar urutan "Produk Terbaru" di home terlihat wajar.
  const sekarang = Date.now();

  for (const [i, p] of PRODUK.entries()) {
    const status = p.status ?? 'DRAFT';
    const slug = buatSlug(p.nama);

    await prisma.product.create({
      data: {
        nama: p.nama,
        slug,
        deskripsi: p.deskripsi,
        deskripsiSingkat: p.deskripsiSingkat,
        brandId: merekTersimpan.get(p.brand) ?? null,
        sku: p.sku,
        categoryId: kategoriTersimpan.get(p.kategori) ?? null,
        harga: p.harga,
        hargaCoret: p.hargaCoret ?? null,
        hpp: p.hpp,
        berat: p.berat,
        panjang: p.panjang ?? null,
        lebar: p.lebar ?? null,
        tinggi: p.tinggi ?? null,
        stok: p.stok ?? 0,
        stokMinimum: 5,
        status,
        unggulan: p.unggulan ?? false,
        kenaPpn: true,
        metaTitle: `${p.nama} — ${p.brand}`,
        metaDescription: p.deskripsiSingkat,
        linkShopee: p.linkShopee ?? null,
        linkTiktok: p.linkTiktok ?? null,
        publishedAt:
          status === 'PUBLISHED' ? new Date(sekarang - i * 36 * 60 * 60 * 1000) : null,
        images: {
          create: [
            { url: urlGambar(`produk-${slug}`), alt: p.nama, urutan: 0 },
          ],
        },
        labels: LABEL_PRODUK[p.sku]?.length
          ? {
              create: LABEL_PRODUK[p.sku]
                .map((slug) => labelTersimpan.get(slug))
                .filter((id): id is string => Boolean(id))
                .map((labelId) => ({ labelId })),
            }
          : undefined,
        variants: p.varian?.length
          ? {
              create: p.varian.map((v, vi) => ({
                nama: v.nama,
                sku: v.sku,
                harga: v.harga ?? null,
                stok: v.stok,
                aktif: true,
                urutan: vi,
              })),
            }
          : undefined,
      },
    });
  }

  // --- Voucher --------------------------------------------------------------
  for (const v of VOUCHER) {
    const kategoriSlug = 'kategori' in v ? (v.kategori as string) : null;
    const kategoriId = kategoriSlug ? kategoriTersimpan.get(kategoriSlug) : null;

    await prisma.voucher.create({
      data: {
        kode: v.kode,
        deskripsi: v.deskripsi,
        tipe: v.tipe,
        nilai: v.nilai,
        maksPotongan: v.maksPotongan,
        minBelanja: v.minBelanja,
        kuota: v.kuota,
        aktif: true,
        selesai: new Date(Date.now() + v.berlakuHari * 24 * 60 * 60 * 1000),
        kategori: kategoriId ? { create: [{ categoryId: kategoriId }] } : undefined,
      },
    });
  }
  console.log(`  ${VOUCHER.length} voucher dibuat`);

  const terbit = PRODUK.filter((p) => (p.status ?? 'DRAFT') === 'PUBLISHED').length;
  console.log(`  ${PRODUK.length} produk dibuat (${terbit} terbit, ${PRODUK.length - terbit} draft)`);
  console.log(`  Gambar placeholder ditulis ke ${UPLOAD_DIR}/seed/\n`);
  console.log('Selesai.');
}

main()
  .catch((e) => {
    console.error('Seed gagal:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
