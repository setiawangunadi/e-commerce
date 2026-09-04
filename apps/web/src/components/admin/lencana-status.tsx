import type { StatusProduk } from '@/lib/types';

const GAYA: Record<StatusProduk, { label: string; kelas: string }> = {
  PUBLISHED: { label: 'Terbit', kelas: 'bg-merek-100 text-merek-800' },
  DRAFT: { label: 'Draft', kelas: 'bg-neutral-100 text-neutral-600' },
  ARCHIVED: { label: 'Arsip', kelas: 'bg-amber-50 text-amber-700' },
};

export function LencanaStatus({ status }: { status: StatusProduk }) {
  const { label, kelas } = GAYA[status];
  return (
    <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-semibold ${kelas}`}>{label}</span>
  );
}
