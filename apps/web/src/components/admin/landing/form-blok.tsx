'use client';

import { EditorAksi } from './editor-aksi';
import type { AksiCta, JenisBlok, KartuProduk, TombolCta } from '@/lib/types';

const kelasInput =
  'w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-merek-500 focus:outline-none';

type Konten = Record<string, unknown>;

/**
 * Form isi satu blok. Bentuk isiannya mengikuti jenis blok, dan setiap
 * perubahan langsung dikembalikan ke induk sebagai objek konten utuh.
 */
export function FormBlok({
  tipe,
  konten,
  produk,
  onUbah,
}: {
  tipe: JenisBlok;
  konten: Konten;
  produk: KartuProduk[];
  onUbah: (konten: Konten) => void;
}) {
  const ubah = (tambalan: Konten) => onUbah({ ...konten, ...tambalan });

  switch (tipe) {
    case 'HERO':
      return <FormHero konten={konten} produk={produk} ubah={ubah} />;
    case 'PRODUK':
      return <FormProdukBlok konten={konten} produk={produk} ubah={ubah} />;
    case 'KEUNGGULAN':
      return <FormKeunggulan konten={konten} ubah={ubah} />;
    case 'TESTIMONI':
      return <FormTestimoni konten={konten} ubah={ubah} />;
    case 'FAQ':
      return <FormFaq konten={konten} ubah={ubah} />;
    case 'HITUNG_MUNDUR':
      return <FormHitungMundur konten={konten} ubah={ubah} />;
    case 'CTA':
      return <FormCtaBlok konten={konten} produk={produk} ubah={ubah} />;
    case 'TEKS':
      return <FormTeks konten={konten} ubah={ubah} />;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------

function Bidang({
  label,
  petunjuk,
  children,
}: {
  label: string;
  petunjuk?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-neutral-600">{label}</span>
      <div className="mt-1">{children}</div>
      {petunjuk && <span className="mt-1 block text-xs text-neutral-500">{petunjuk}</span>}
    </label>
  );
}

/** Daftar berulang dengan tambah/hapus — dipakai keunggulan, testimoni, FAQ. */
function DaftarItem<T>({
  items,
  label,
  maks,
  itemBaru,
  onUbah,
  render,
}: {
  items: T[];
  label: string;
  maks: number;
  itemBaru: () => T;
  onUbah: (items: T[]) => void;
  render: (item: T, ubahItem: (t: Partial<T>) => void) => React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border border-neutral-200 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">
              {label} {i + 1}
            </span>
            <button
              type="button"
              onClick={() => onUbah(items.filter((_, x) => x !== i))}
              disabled={items.length <= 1}
              className="rounded px-2 py-0.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
            >
              Hapus
            </button>
          </div>
          {render(item, (tambalan) =>
            onUbah(items.map((it, x) => (x === i ? { ...it, ...tambalan } : it))),
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={() => onUbah([...items, itemBaru()])}
        disabled={items.length >= maks}
        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
      >
        + Tambah {label.toLowerCase()}
      </button>
    </div>
  );
}

function EditorTombol({
  tombol,
  produk,
  onUbah,
}: {
  tombol: TombolCta;
  produk: KartuProduk[];
  onUbah: (t: TombolCta) => void;
}) {
  return (
    <div className="space-y-3">
      <Bidang label="Teks tombol">
        <input
          value={tombol.teks}
          onChange={(e) => onUbah({ ...tombol, teks: e.target.value })}
          className={kelasInput}
          placeholder="Beli Sekarang"
        />
      </Bidang>
      <EditorAksi
        aksi={tombol.aksi}
        produk={produk}
        onUbah={(aksi: AksiCta) => onUbah({ ...tombol, aksi })}
      />
    </div>
  );
}

// --- Form per jenis ---------------------------------------------------------

function FormHero({
  konten,
  produk,
  ubah,
}: {
  konten: Konten;
  produk: KartuProduk[];
  ubah: (t: Konten) => void;
}) {
  const poin = (konten.poin as string[]) ?? [];

  return (
    <div className="space-y-3">
      <Bidang label="Badge kecil di atas judul" petunjuk="Opsional, mis. “Promo Terbatas”">
        <input
          value={(konten.badge as string) ?? ''}
          onChange={(e) => ubah({ badge: e.target.value })}
          className={kelasInput}
        />
      </Bidang>

      <Bidang label="Judul">
        <input
          value={(konten.judul as string) ?? ''}
          onChange={(e) => ubah({ judul: e.target.value })}
          className={kelasInput}
        />
      </Bidang>

      <Bidang label="Subjudul">
        <textarea
          rows={2}
          value={(konten.subjudul as string) ?? ''}
          onChange={(e) => ubah({ subjudul: e.target.value })}
          className={kelasInput}
        />
      </Bidang>

      <Bidang label="URL gambar" petunjuk="Unggah dulu lewat menu Produk, lalu salin URL-nya">
        <input
          value={(konten.gambarUrl as string) ?? ''}
          onChange={(e) => ubah({ gambarUrl: e.target.value })}
          className={kelasInput}
          placeholder="https://..."
        />
      </Bidang>

      <Bidang label="Poin singkat" petunjuk="Satu per baris, maksimal 4">
        <textarea
          rows={3}
          value={poin.join('\n')}
          onChange={(e) =>
            ubah({
              poin: e.target.value
                .split('\n')
                .map((p) => p.trim())
                .filter(Boolean)
                .slice(0, 4),
            })
          }
          className={kelasInput}
          placeholder={'Gratis ongkir\nGaransi 7 hari'}
        />
      </Bidang>

      <div className="rounded-lg border border-neutral-200 p-3">
        <p className="mb-2 text-xs font-semibold text-neutral-700">Tombol utama</p>
        <EditorTombol
          tombol={konten.tombol as TombolCta}
          produk={produk}
          onUbah={(tombol) => ubah({ tombol })}
        />
      </div>
    </div>
  );
}

function FormProdukBlok({
  konten,
  produk,
  ubah,
}: {
  konten: Konten;
  produk: KartuProduk[];
  ubah: (t: Konten) => void;
}) {
  const terpilih = (konten.produkIds as string[]) ?? [];

  function alihkan(id: string) {
    ubah({
      produkIds: terpilih.includes(id)
        ? terpilih.filter((x) => x !== id)
        : [...terpilih, id].slice(0, 12),
    });
  }

  return (
    <div className="space-y-3">
      <Bidang label="Judul bagian">
        <input
          value={(konten.judul as string) ?? ''}
          onChange={(e) => ubah({ judul: e.target.value })}
          className={kelasInput}
        />
      </Bidang>

      <Bidang label="Subjudul">
        <textarea
          rows={2}
          value={(konten.subjudul as string) ?? ''}
          onChange={(e) => ubah({ subjudul: e.target.value })}
          className={kelasInput}
        />
      </Bidang>

      <Bidang label={`Produk yang ditampilkan (${terpilih.length}/12)`}>
        <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-neutral-200 p-2">
          {produk.length === 0 && (
            <p className="p-2 text-xs text-neutral-500">
              Belum ada produk terbit. Terbitkan produk dulu di menu Produk.
            </p>
          )}
          {produk.map((p) => (
            <label
              key={p.id}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-neutral-50"
            >
              <input
                type="checkbox"
                checked={terpilih.includes(p.id)}
                onChange={() => alihkan(p.id)}
                className="h-4 w-4 rounded border-neutral-300 text-merek-600"
              />
              <span className="min-w-0 flex-1 truncate text-neutral-800">{p.nama}</span>
              {p.punyaVarian && (
                <span className="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600">
                  bervarian
                </span>
              )}
            </label>
          ))}
        </div>
      </Bidang>

      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={(konten.tampilkanTombol as boolean) ?? true}
          onChange={(e) => ubah({ tampilkanTombol: e.target.checked })}
          className="h-4 w-4 rounded border-neutral-300 text-merek-600"
        />
        <span className="text-sm text-neutral-700">Tampilkan tombol beli di tiap produk</span>
      </label>
    </div>
  );
}

const IKON_PILIHAN = [
  ['centang', 'Centang'],
  ['truk', 'Pengiriman'],
  ['perisai', 'Keamanan'],
  ['kembali', 'Retur'],
  ['chat', 'Dukungan'],
  ['bintang', 'Bintang'],
] as const;

function FormKeunggulan({ konten, ubah }: { konten: Konten; ubah: (t: Konten) => void }) {
  type Item = { ikon: string; judul: string; teks: string };
  const items = (konten.items as Item[]) ?? [];

  return (
    <div className="space-y-3">
      <Bidang label="Judul bagian">
        <input
          value={(konten.judul as string) ?? ''}
          onChange={(e) => ubah({ judul: e.target.value })}
          className={kelasInput}
        />
      </Bidang>

      <DaftarItem<Item>
        items={items}
        label="Keunggulan"
        maks={8}
        itemBaru={() => ({ ikon: 'centang', judul: '', teks: '' })}
        onUbah={(baru) => ubah({ items: baru })}
        render={(item, ubahItem) => (
          <div className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-[1fr_2fr]">
              <select
                value={item.ikon}
                onChange={(e) => ubahItem({ ikon: e.target.value })}
                className={kelasInput}
              >
                {IKON_PILIHAN.map(([nilai, label]) => (
                  <option key={nilai} value={nilai}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                value={item.judul}
                onChange={(e) => ubahItem({ judul: e.target.value })}
                placeholder="Judul keunggulan"
                className={kelasInput}
              />
            </div>
            <textarea
              rows={2}
              value={item.teks}
              onChange={(e) => ubahItem({ teks: e.target.value })}
              placeholder="Penjelasan singkat"
              className={kelasInput}
            />
          </div>
        )}
      />
    </div>
  );
}

function FormTestimoni({ konten, ubah }: { konten: Konten; ubah: (t: Konten) => void }) {
  type Item = { nama: string; kota: string; teks: string; rating: number };
  const items = (konten.items as Item[]) ?? [];

  return (
    <div className="space-y-3">
      <Bidang label="Judul bagian">
        <input
          value={(konten.judul as string) ?? ''}
          onChange={(e) => ubah({ judul: e.target.value })}
          className={kelasInput}
        />
      </Bidang>

      <DaftarItem<Item>
        items={items}
        label="Testimoni"
        maks={12}
        itemBaru={() => ({ nama: '', kota: '', teks: '', rating: 5 })}
        onUbah={(baru) => ubah({ items: baru })}
        render={(item, ubahItem) => (
          <div className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-3">
              <input
                value={item.nama}
                onChange={(e) => ubahItem({ nama: e.target.value })}
                placeholder="Nama"
                className={kelasInput}
              />
              <input
                value={item.kota}
                onChange={(e) => ubahItem({ kota: e.target.value })}
                placeholder="Kota"
                className={kelasInput}
              />
              <select
                value={item.rating}
                onChange={(e) => ubahItem({ rating: Number(e.target.value) })}
                className={kelasInput}
              >
                {[5, 4, 3, 2, 1].map((r) => (
                  <option key={r} value={r}>
                    {r} bintang
                  </option>
                ))}
              </select>
            </div>
            <textarea
              rows={2}
              value={item.teks}
              onChange={(e) => ubahItem({ teks: e.target.value })}
              placeholder="Isi testimoni"
              className={kelasInput}
            />
          </div>
        )}
      />

      <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
        Gunakan testimoni asli dari pembeli. Ulasan yang dikarang termasuk iklan menyesatkan
        menurut UU Perlindungan Konsumen, dan bisa membuat akun iklan Anda ditangguhkan.
      </p>
    </div>
  );
}

function FormFaq({ konten, ubah }: { konten: Konten; ubah: (t: Konten) => void }) {
  type Item = { tanya: string; jawab: string };
  const items = (konten.items as Item[]) ?? [];

  return (
    <div className="space-y-3">
      <Bidang label="Judul bagian">
        <input
          value={(konten.judul as string) ?? ''}
          onChange={(e) => ubah({ judul: e.target.value })}
          className={kelasInput}
        />
      </Bidang>

      <DaftarItem<Item>
        items={items}
        label="Pertanyaan"
        maks={20}
        itemBaru={() => ({ tanya: '', jawab: '' })}
        onUbah={(baru) => ubah({ items: baru })}
        render={(item, ubahItem) => (
          <div className="space-y-2">
            <input
              value={item.tanya}
              onChange={(e) => ubahItem({ tanya: e.target.value })}
              placeholder="Pertanyaan"
              className={kelasInput}
            />
            <textarea
              rows={2}
              value={item.jawab}
              onChange={(e) => ubahItem({ jawab: e.target.value })}
              placeholder="Jawaban"
              className={kelasInput}
            />
          </div>
        )}
      />
    </div>
  );
}

/** ISO ke nilai `datetime-local` di zona waktu peramban. */
function keInputLokal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function FormHitungMundur({ konten, ubah }: { konten: Konten; ubah: (t: Konten) => void }) {
  return (
    <div className="space-y-3">
      <Bidang label="Judul">
        <input
          value={(konten.judul as string) ?? ''}
          onChange={(e) => ubah({ judul: e.target.value })}
          className={kelasInput}
        />
      </Bidang>

      <Bidang label="Subjudul">
        <input
          value={(konten.subjudul as string) ?? ''}
          onChange={(e) => ubah({ subjudul: e.target.value })}
          className={kelasInput}
        />
      </Bidang>

      <Bidang label="Promo berakhir pada">
        <input
          type="datetime-local"
          value={keInputLokal((konten.berakhirPada as string) ?? '')}
          onChange={(e) => {
            const d = new Date(e.target.value);
            if (!Number.isNaN(d.getTime())) ubah({ berakhirPada: d.toISOString() });
          }}
          className={kelasInput}
        />
      </Bidang>

      <Bidang label="Teks setelah promo habis">
        <input
          value={(konten.teksSetelahHabis as string) ?? ''}
          onChange={(e) => ubah({ teksSetelahHabis: e.target.value })}
          placeholder="Promo sudah berakhir"
          className={kelasInput}
        />
      </Bidang>
    </div>
  );
}

function FormCtaBlok({
  konten,
  produk,
  ubah,
}: {
  konten: Konten;
  produk: KartuProduk[];
  ubah: (t: Konten) => void;
}) {
  return (
    <div className="space-y-3">
      <Bidang label="Judul">
        <input
          value={(konten.judul as string) ?? ''}
          onChange={(e) => ubah({ judul: e.target.value })}
          className={kelasInput}
        />
      </Bidang>

      <Bidang label="Subjudul">
        <textarea
          rows={2}
          value={(konten.subjudul as string) ?? ''}
          onChange={(e) => ubah({ subjudul: e.target.value })}
          className={kelasInput}
        />
      </Bidang>

      <div className="rounded-lg border border-neutral-200 p-3">
        <p className="mb-2 text-xs font-semibold text-neutral-700">Tombol</p>
        <EditorTombol
          tombol={konten.tombol as TombolCta}
          produk={produk}
          onUbah={(tombol) => ubah({ tombol })}
        />
      </div>

      <Bidang label="Catatan kecil di bawah tombol">
        <input
          value={(konten.catatanKecil as string) ?? ''}
          onChange={(e) => ubah({ catatanKecil: e.target.value })}
          placeholder="Gratis ongkir untuk pembelian di atas Rp300.000"
          className={kelasInput}
        />
      </Bidang>
    </div>
  );
}

function FormTeks({ konten, ubah }: { konten: Konten; ubah: (t: Konten) => void }) {
  return (
    <div className="space-y-3">
      <Bidang label="Judul">
        <input
          value={(konten.judul as string) ?? ''}
          onChange={(e) => ubah({ judul: e.target.value })}
          className={kelasInput}
        />
      </Bidang>

      <Bidang label="Isi" petunjuk="Ditulis sebagai teks biasa. Enter membuat paragraf baru.">
        <textarea
          rows={6}
          value={(konten.isi as string) ?? ''}
          onChange={(e) => ubah({ isi: e.target.value })}
          className={kelasInput}
        />
      </Bidang>
    </div>
  );
}
