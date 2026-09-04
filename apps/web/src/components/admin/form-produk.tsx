'use client';

import Link from 'next/link';
import { startTransition, useActionState, useState } from 'react';
import { simpanProduk, type HasilSimpan } from '@/app/admin/actions-produk';
import { AreaTeks, Bagian, Bidang, InputRupiah, Pilihan, Sakelar, Teks } from './bidang';
import { EditorGambar, type GambarForm } from './editor-gambar';
import { EditorVarian, type VarianForm } from './editor-varian';
import type { KategoriAdmin, LabelAdmin, MerekAdmin, ProdukAdmin } from '@/lib/types';

const awal: HasilSimpan = { ok: false };

export function FormProduk({
  produk,
  kategori,
  label,
  merek,
}: {
  produk?: ProdukAdmin;
  kategori: KategoriAdmin[];
  label: LabelAdmin[];
  merek: MerekAdmin[];
}) {
  const [status, kirim, menunggu] = useActionState(simpanProduk, awal);
  const [labelTerpilih, setLabelTerpilih] = useState<Set<string>>(
    new Set(produk?.labelIds ?? []),
  );

  // Gambar & varian dikelola di state client, lalu ikut terkirim sebagai JSON
  // lewat hidden input — form biasa tidak bisa mengirim array bersarang.
  const [gambar, setGambar] = useState<GambarForm[]>(
    produk?.gambar.map((g) => ({ url: g.url, alt: g.alt })) ?? [],
  );
  const [varian, setVarian] = useState<VarianForm[]>(
    produk?.varian.map((v) => ({
      nama: v.nama,
      sku: v.sku,
      harga: v.harga,
      stok: v.stok,
      aktif: v.aktif ?? true,
      gambar: (v.gambar ?? []).map((g) => ({ url: g.url, alt: g.alt })),
    })) ?? [],
  );
  const [sku, setSku] = useState(produk?.sku ?? '');

  /**
   * Action dipanggil manual lewat transition, bukan lewat `<form action={...}>`.
   *
   * Alasannya: React mereset form setelah form-action selesai. Untuk form
   * sepanjang ini, satu kesalahan validasi akan menghapus seluruh isian admin.
   * Dengan memanggil action sendiri, isian tetap utuh dan admin cukup
   * memperbaiki field yang salah.
   */
  function tanganiSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => kirim(formData));
  }

  const g = status.galatField ?? {};
  const punyaVarian = varian.length > 0;

  return (
    <form onSubmit={tanganiSubmit} className="space-y-5">
      {produk && <input type="hidden" name="id" value={produk.id} />}
      <input type="hidden" name="gambar" value={JSON.stringify(gambar)} />
      <input type="hidden" name="varian" value={JSON.stringify(varian)} />

      {status.galat && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {status.galat}
        </p>
      )}

      <Bagian judul="Informasi Dasar">
        <Bidang label="Nama produk" nama="nama" galat={g.nama} wajib>
          <Teks
            name="nama"
            defaultValue={produk?.nama}
            required
            placeholder="Kemeja Flanel Lengan Panjang"
          />
        </Bidang>

        <div className="grid gap-4 sm:grid-cols-2">
          <Bidang
            label="SKU"
            nama="sku"
            galat={g.sku}
            petunjuk="Kode unik produk, dipakai untuk stok & gudang"
            wajib
          >
            <Teks
              name="sku"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              required
              placeholder="NSK-KMJ-001"
            />
          </Bidang>

          <Bidang
            label="Merek"
            nama="brandId"
            galat={g.brandId}
            petunjuk={
              merek.length === 0 ? 'Belum ada merek. Buat dulu di menu Merek.' : undefined
            }
          >
            <Pilihan name="brandId" defaultValue={produk?.brand?.id ?? ''}>
              <option value="">— Tanpa merek —</option>
              {merek.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nama}
                  {m.aktif ? '' : ' (nonaktif)'}
                </option>
              ))}
            </Pilihan>
          </Bidang>
        </div>

        <Bidang
          label="Kategori"
          nama="categoryId"
          galat={g.categoryId}
          petunjuk="Satu produk masuk tepat satu kategori. Untuk promo seperti Flash Sale, pakai label di bawah."
        >
          <Pilihan name="categoryId" defaultValue={produk?.categoryId ?? ''}>
            <option value="">— Tanpa kategori —</option>
            {susunKategori(kategori).map((grup) =>
              grup.anak.length > 0 ? (
                <optgroup key={grup.induk.id} label={grup.induk.nama}>
                  <option value={grup.induk.id}>{grup.induk.nama} (umum)</option>
                  {grup.anak.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nama}
                    </option>
                  ))}
                </optgroup>
              ) : (
                <option key={grup.induk.id} value={grup.induk.id}>
                  {grup.induk.nama}
                </option>
              ),
            )}
          </Pilihan>
        </Bidang>

        <Bidang
          label="Label promosi"
          nama="labelIds"
          galat={g.labelIds}
          petunjuk={
            label.length === 0
              ? 'Belum ada label. Buat dulu di menu Label Promosi.'
              : 'Boleh lebih dari satu. Lencana ini muncul di kartu produk dan halaman detail.'
          }
        >
          <PemilihLabel
            semua={label}
            terpilih={labelTerpilih}
            onBerubah={setLabelTerpilih}
          />
        </Bidang>

        <Bidang
          label="Deskripsi singkat"
          nama="deskripsiSingkat"
          galat={g.deskripsiSingkat}
          petunjuk="Satu kalimat yang muncul di kartu produk. Maksimal 300 karakter."
        >
          <AreaTeks
            name="deskripsiSingkat"
            rows={2}
            maxLength={300}
            defaultValue={produk?.deskripsiSingkat ?? ''}
            placeholder="Flanel katun premium yang hangat tanpa gerah."
          />
        </Bidang>

        <Bidang label="Deskripsi lengkap" nama="deskripsi" galat={g.deskripsi}>
          <AreaTeks
            name="deskripsi"
            rows={6}
            defaultValue={produk?.deskripsi ?? ''}
            placeholder="Jelaskan bahan, ukuran, cara perawatan, dan apa yang membedakan produk ini."
          />
        </Bidang>
      </Bagian>

      <Bagian judul="Harga" deskripsi="Semua nilai dalam Rupiah utuh, tanpa titik atau koma.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Bidang label="Harga jual" nama="harga" galat={g.harga} wajib>
            <InputRupiah name="harga" defaultValue={produk?.harga} required placeholder="189000" />
          </Bidang>

          <Bidang
            label="Harga coret"
            nama="hargaCoret"
            galat={g.hargaCoret}
            petunjuk="Harus lebih besar dari harga jual"
          >
            <InputRupiah
              name="hargaCoret"
              defaultValue={produk?.hargaCoret ?? ''}
              placeholder="249000"
            />
          </Bidang>

          <Bidang
            label="HPP"
            nama="hpp"
            galat={g.hpp}
            petunjuk="Harga pokok. Tidak pernah tampil ke pembeli."
          >
            <InputRupiah name="hpp" defaultValue={produk?.hpp ?? ''} placeholder="98000" />
          </Bidang>
        </div>

        <Sakelar
          nama="kenaPpn"
          label="Barang kena PPN"
          petunjuk="Harga yang ditampilkan sudah termasuk PPN"
          bawaan={produk?.kenaPpn ?? true}
        />
      </Bagian>

      <Bagian
        judul="Berat & Dimensi"
        deskripsi="Dipakai untuk menghitung ongkir. Data yang meleset bikin ongkir salah dan toko rugi."
      >
        <div className="grid gap-4 sm:grid-cols-4">
          <Bidang label="Berat (gram)" nama="berat" galat={g.berat} wajib>
            <Teks
              name="berat"
              type="number"
              min={1}
              defaultValue={produk?.berat}
              required
              placeholder="350"
            />
          </Bidang>
          <Bidang label="Panjang (cm)" nama="panjang" galat={g.panjang}>
            <Teks name="panjang" type="number" min={0} defaultValue={produk?.panjang ?? ''} />
          </Bidang>
          <Bidang label="Lebar (cm)" nama="lebar" galat={g.lebar}>
            <Teks name="lebar" type="number" min={0} defaultValue={produk?.lebar ?? ''} />
          </Bidang>
          <Bidang label="Tinggi (cm)" nama="tinggi" galat={g.tinggi}>
            <Teks name="tinggi" type="number" min={0} defaultValue={produk?.tinggi ?? ''} />
          </Bidang>
        </div>
      </Bagian>

      <Bagian judul="Stok">
        <div className="grid gap-4 sm:grid-cols-2">
          <Bidang
            label="Stok produk"
            nama="stok"
            galat={g.stok}
            petunjuk={
              punyaVarian
                ? 'Diabaikan karena produk ini punya varian — stok dihitung dari varian.'
                : undefined
            }
          >
            <Teks
              name="stok"
              type="number"
              min={0}
              defaultValue={produk?.stokProduk ?? 0}
              disabled={punyaVarian}
            />
          </Bidang>

          <Bidang
            label="Ambang stok menipis"
            nama="stokMinimum"
            galat={g.stokMinimum}
            petunjuk="Muncul di dashboard saat stok mencapai angka ini"
          >
            <Teks name="stokMinimum" type="number" min={0} defaultValue={produk?.stokMinimum ?? 5} />
          </Bidang>
        </div>

        {/* Input stok yang disabled tidak ikut terkirim — dikirim lewat hidden. */}
        {punyaVarian && <input type="hidden" name="stok" value={produk?.stokProduk ?? 0} />}
      </Bagian>

      <Bagian
        judul="Varian"
        deskripsi="Ukuran, warna, atau kombinasi. Tiap varian punya SKU dan stok sendiri."
      >
        <EditorVarian awal={produk?.varian ?? []} skuProduk={sku} onBerubah={setVarian} />
      </Bagian>

      <Bagian judul="Gambar" deskripsi="Gambar pertama dipakai sebagai gambar utama di katalog.">
        <EditorGambar awal={produk?.gambar ?? []} onBerubah={setGambar} />
      </Bagian>

      <Bagian
        judul="Kanal Penjualan Lain"
        deskripsi="Isi bila produk ini juga dijual di marketplace. Tombolnya baru muncul di etalase kalau tautannya diisi."
      >
        <Bidang
          label="Link produk di Shopee"
          nama="linkShopee"
          galat={g.linkShopee}
          petunjuk="Salin dari halaman produk di Shopee. Kosongkan bila tidak dijual di sana."
        >
          <Teks
            name="linkShopee"
            type="url"
            defaultValue={produk?.linkShopee ?? ''}
            placeholder="https://shopee.co.id/nama-produk-i.123456.7891011"
          />
        </Bidang>

        <Bidang
          label="Link produk di TikTok Shop"
          nama="linkTiktok"
          galat={g.linkTiktok}
          petunjuk="Salin dari halaman produk di TikTok Shop. Kosongkan bila tidak dijual di sana."
        >
          <Teks
            name="linkTiktok"
            type="url"
            defaultValue={produk?.linkTiktok ?? ''}
            placeholder="https://vt.tiktok.com/ZSxxxxxxx/"
          />
        </Bidang>
      </Bagian>

      <Bagian judul="Publikasi & SEO">
        <div className="grid gap-4 sm:grid-cols-2">
          <Bidang label="Status" nama="status" galat={g.status} wajib>
            <Pilihan name="status" defaultValue={produk?.status ?? 'DRAFT'}>
              <option value="DRAFT">Draft — belum tampil di katalog</option>
              <option value="PUBLISHED">Terbit — tampil & bisa dibeli</option>
              <option value="ARCHIVED">Arsip — tidak dijual lagi</option>
            </Pilihan>
          </Bidang>

          <div className="flex items-end">
            <div className="w-full">
              <Sakelar
                nama="unggulan"
                label="Tampilkan di Produk Unggulan"
                petunjuk="Muncul di bagian atas halaman home"
                bawaan={produk?.unggulan ?? false}
              />
            </div>
          </div>
        </div>

        <Bidang
          label="Meta title"
          nama="metaTitle"
          galat={g.metaTitle}
          petunjuk="Judul di hasil pencarian Google. Kosongkan untuk memakai nama produk."
        >
          <Teks name="metaTitle" maxLength={120} defaultValue={produk?.metaTitle ?? ''} />
        </Bidang>

        <Bidang
          label="Meta description"
          nama="metaDescription"
          galat={g.metaDescription}
          petunjuk="Ringkasan di hasil pencarian. Idealnya 120–160 karakter."
        >
          <AreaTeks
            name="metaDescription"
            rows={2}
            maxLength={320}
            defaultValue={produk?.metaDescription ?? ''}
          />
        </Bidang>
      </Bagian>

      <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 border-t border-neutral-200 bg-neutral-100/95 py-4 backdrop-blur">
        <Link
          href="/admin/produk"
          className="rounded-lg border border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Batal
        </Link>
        <TombolSimpan baru={!produk} menunggu={menunggu} />
      </div>
    </form>
  );
}

function TombolSimpan({ baru, menunggu }: { baru: boolean; menunggu: boolean }) {
  return (
    <button
      type="submit"
      disabled={menunggu}
      className="rounded-lg bg-merek-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-merek-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {menunggu ? 'Menyimpan...' : baru ? 'Simpan Produk' : 'Simpan Perubahan'}
    </button>
  );
}

/**
 * Menyusun kategori jadi induk beserta anaknya agar dropdown mencerminkan
 * hierarki. Kategori yang induknya sudah tidak ada tetap ditampilkan di
 * tingkat atas — lebih baik terlihat janggal daripada hilang dari pilihan.
 */
function susunKategori(kategori: KategoriAdmin[]) {
  const induk = kategori.filter((k) => !k.parentId);
  const idInduk = new Set(induk.map((i) => i.id));
  const yatim = kategori.filter((k) => k.parentId && !idInduk.has(k.parentId));

  return [
    ...induk.map((i) => ({
      induk: i,
      anak: kategori.filter((k) => k.parentId === i.id),
    })),
    ...yatim.map((k) => ({ induk: k, anak: [] as KategoriAdmin[] })),
  ];
}

/**
 * Pemilih label sebagai deretan lencana yang bisa diklik. Warna aslinya
 * ditampilkan langsung supaya admin melihat hasil akhirnya di kartu produk
 * tanpa harus membuka etalase.
 */
function PemilihLabel({
  semua,
  terpilih,
  onBerubah,
}: {
  semua: LabelAdmin[];
  terpilih: Set<string>;
  onBerubah: (nilai: Set<string>) => void;
}) {
  if (semua.length === 0) {
    return (
      <Link
        href="/admin/label/baru"
        className="inline-block rounded-lg border border-dashed border-neutral-300 px-4 py-2 text-sm font-medium text-merek-700 hover:bg-merek-50"
      >
        + Buat label promosi
      </Link>
    );
  }

  function alihkan(id: string) {
    const baru = new Set(terpilih);
    if (baru.has(id)) baru.delete(id);
    else baru.add(id);
    onBerubah(baru);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {semua.map((l) => {
        const aktif = terpilih.has(l.id);
        return (
          <button
            key={l.id}
            type="button"
            onClick={() => alihkan(l.id)}
            aria-pressed={aktif}
            title={aktif ? `Lepas label ${l.nama}` : `Tempel label ${l.nama}`}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity ${
              aktif
                ? 'text-white'
                : 'border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50'
            }`}
            style={aktif ? { backgroundColor: l.warna } : undefined}
          >
            {aktif && <span aria-hidden="true">&#10003; </span>}
            {l.nama}
            {l.keadaan !== 'Tayang' && (
              <span className={aktif ? 'opacity-80' : 'text-neutral-400'}>
                {' '}
                ({l.keadaan.toLowerCase()})
              </span>
            )}
          </button>
        );
      })}

      {[...terpilih].map((id) => (
        <input key={id} type="hidden" name="labelIds" value={id} />
      ))}
    </div>
  );
}
