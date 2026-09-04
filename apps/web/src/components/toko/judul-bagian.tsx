import Link from 'next/link';
import { IkonPanahKanan } from '@/components/ikon';

interface Props {
  judul: string;
  deskripsi?: string;
  tautan?: { href: string; label: string };
}

export function JudulBagian({ judul, deskripsi, tautan }: Props) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-neutral-900 sm:text-2xl">
          {judul}
        </h2>
        {deskripsi && <p className="mt-1 text-sm text-neutral-600">{deskripsi}</p>}
      </div>

      {tautan && (
        <Link
          href={tautan.href}
          className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-merek-700 hover:text-merek-800"
        >
          <span className="hidden sm:inline">{tautan.label}</span>
          <span className="sm:hidden">Lihat</span>
          <IkonPanahKanan className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
