const formatterRupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * 189000 -> "Rp 189.000"
 *
 * Pemisah setelah "Rp" adalah spasi non-breaking (U+00A0) dari Intl, jadi label
 * harga tidak pernah terpotong di tengah saat kartu produk menyempit.
 */
export function rupiah(nilai: number): string {
  return formatterRupiah.format(nilai);
}

/** 1250000 -> "Rp1,3 jt" — untuk kartu statistik yang ruangnya sempit. */
export function rupiahRingkas(nilai: number): string {
  if (nilai >= 1_000_000_000) return `Rp${(nilai / 1_000_000_000).toFixed(2).replace('.', ',')} M`;
  if (nilai >= 1_000_000) return `Rp${(nilai / 1_000_000).toFixed(1).replace('.', ',')} jt`;
  if (nilai >= 1_000) return `Rp${Math.round(nilai / 1_000)} rb`;
  return rupiah(nilai);
}

const formatterTanggal = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function tanggal(nilai: string | Date): string {
  return formatterTanggal.format(typeof nilai === 'string' ? new Date(nilai) : nilai);
}

/** "3 jam lalu", "kemarin", dst. */
export function waktuRelatif(nilai: string | Date): string {
  const tgl = typeof nilai === 'string' ? new Date(nilai) : nilai;
  const detik = Math.round((Date.now() - tgl.getTime()) / 1000);

  if (detik < 60) return 'baru saja';
  if (detik < 3600) return `${Math.floor(detik / 60)} menit lalu`;
  if (detik < 86400) return `${Math.floor(detik / 3600)} jam lalu`;
  if (detik < 172800) return 'kemarin';
  if (detik < 2592000) return `${Math.floor(detik / 86400)} hari lalu`;
  return tanggal(tgl);
}

/** 350 -> "350 g", 1200 -> "1,2 kg" */
export function berat(gram: number): string {
  if (gram >= 1000) return `${(gram / 1000).toFixed(1).replace('.', ',')} kg`;
  return `${gram} g`;
}
