import { IkonShopee, IkonTiktok } from '@/components/ikon';
import { TombolKeranjang } from './tombol-keranjang';

export interface KanalBeli {
  id: string;
  nama: string;
  slug: string;
  harga: number;
  tersedia: boolean;
  linkShopee: string | null;
  linkTiktok: string | null;
}

/**
 * Tiga kanal pembelian: toko ini, Shopee, dan TikTok Shop.
 *
 * Tombol marketplace hanya muncul bila admin mengisi tautannya di form produk —
 * pembeli tidak pernah melihat tombol yang mengarah ke halaman kosong.
 * Latar belakang omnichannel-nya ada di research/business/14-omnichannel.md.
 *
 * Kanal "toko ini" memasukkan produk ke keranjang untuk diproses lewat
 * checkout & pembayaran Midtrans di website ini sendiri.
 */
export function TombolBeli({
  produk,
  ukuran = 'penuh',
  varianId,
  namaVarian,
  butuhVarian = false,
  tanpaKeranjang = false,
}: {
  produk: KanalBeli;
  ukuran?: 'penuh' | 'ringkas';
  /** Varian yang sedang dipilih di halaman detail. */
  varianId?: string | null;
  /** Nama varian terpilih, ditampilkan di dialog konfirmasi keranjang. */
  namaVarian?: string | null;
  /** Produk bervarian tapi pembeli belum memilih — tombol keranjang dikunci. */
  butuhVarian?: boolean;
  /** Hanya tampilkan tombol marketplace (kartu grid sudah punya tombol sendiri). */
  tanpaKeranjang?: boolean;
}) {
  const ringkas = ukuran === 'ringkas';

  const adaMarketplace = !!(produk.linkShopee || produk.linkTiktok);

  return (
    // Kartu produk di mobile hanya selebar ~166px, jadi mode ringkas menumpuk
    // tombol ke bawah — tiga tombol sejajar akan meluber keluar kartu.
    <div className={ringkas ? 'space-y-1.5' : 'space-y-2.5'}>
      {!tanpaKeranjang && (
        <TombolKeranjang
          produkId={produk.id}
          varianId={varianId ?? null}
          tersedia={produk.tersedia}
          ukuran={ukuran}
          butuhVarian={butuhVarian}
          namaProduk={produk.nama}
          namaVarian={namaVarian}
        />
      )}

      {adaMarketplace && !ringkas && !tanpaKeranjang && (
        <p className="pt-1 text-center text-xs text-neutral-500">
          Atau beli lewat marketplace langganan Anda
        </p>
      )}

      {adaMarketplace && (
        <div className={`flex ${ringkas ? 'gap-1.5' : 'gap-2.5'}`}>
          {produk.linkShopee && (
            <TombolMarketplace
              href={produk.linkShopee}
              label="Shopee"
              ringkas={ringkas}
              kelas="bg-[#ee4d2d] hover:bg-[#d8431f]"
              Ikon={IkonShopee}
            />
          )}
          {produk.linkTiktok && (
            <TombolMarketplace
              href={produk.linkTiktok}
              label="TikTok Shop"
              labelRingkas="TikTok"
              ringkas={ringkas}
              kelas="bg-neutral-900 hover:bg-neutral-800"
              Ikon={IkonTiktok}
            />
          )}
        </div>
      )}
    </div>
  );
}

function TombolMarketplace({
  href,
  label,
  labelRingkas,
  ringkas,
  kelas,
  Ikon,
}: {
  href: string;
  label: string;
  labelRingkas?: string;
  ringkas: boolean;
  kelas: string;
  Ikon: (props: { className?: string }) => React.ReactElement;
}) {
  return (
    <a
      href={href}
      target="_blank"
      // `noopener noreferrer` wajib untuk tautan keluar yang dibuka di tab baru.
      rel="noopener noreferrer nofollow"
      aria-label={`Beli di ${label} (membuka tab baru)`}
      // `min-w-0` supaya tombol boleh menyusut di kartu sempit alih-alih meluber.
      className={`${kelas} ${
        ringkas
          ? 'flex min-w-0 flex-1 items-center justify-center gap-1 rounded-lg px-1.5 py-2 text-[11px] font-semibold text-white transition-colors'
          : 'flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white transition-colors'
      }`}
    >
      <Ikon className={ringkas ? 'h-3.5 w-3.5 shrink-0' : 'h-4.5 w-4.5 shrink-0'} />
      <span className="truncate">{ringkas ? (labelRingkas ?? label) : label}</span>
    </a>
  );
}

/** Penanda kecil di kartu produk: kanal apa saja yang tersedia. */
export function LencanaKanal({ produk }: { produk: Pick<KanalBeli, 'linkShopee' | 'linkTiktok'> }) {
  if (!produk.linkShopee && !produk.linkTiktok) return null;

  return (
    <span className="inline-flex items-center gap-1" title="Juga tersedia di marketplace">
      {produk.linkShopee && <IkonShopee className="h-3.5 w-3.5 text-[#ee4d2d]" />}
      {produk.linkTiktok && <IkonTiktok className="h-3.5 w-3.5 text-neutral-700" />}
    </span>
  );
}

