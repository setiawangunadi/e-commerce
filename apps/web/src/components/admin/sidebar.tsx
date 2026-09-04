'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { IkonMenu, IkonTutup } from '@/components/ikon';
import { keluar } from '@/app/admin/actions-auth';
import { TOKO } from '@/lib/toko';
import type { ProfilAdmin } from '@/lib/types';

const MENU = [
  { href: '/admin', label: 'Dashboard', tepat: true },
  { href: '/admin/pesanan', label: 'Pesanan', tepat: false },
  { href: '/admin/pelanggan', label: 'Pelanggan', tepat: false },
  { href: '/admin/produk', label: 'Produk', tepat: false },
  { href: '/admin/kategori', label: 'Kategori', tepat: false },
  { href: '/admin/merek', label: 'Merek', tepat: false },
  { href: '/admin/label', label: 'Label Promosi', tepat: false },
  { href: '/admin/voucher', label: 'Voucher', tepat: false },
  { href: '/admin/banner', label: 'Banner', tepat: false },
  { href: '/admin/landing', label: 'Landing Page', tepat: false },
];

export function SidebarAdmin({ profil }: { profil: ProfilAdmin }) {
  const [terbuka, setTerbuka] = useState(false);
  const pathname = usePathname();

  const isi = (
    <>
      <div className="px-4 py-5">
        <Link href="/admin" className="text-lg font-semibold text-white">
          {TOKO.nama}
        </Link>
        <p className="mt-0.5 text-xs text-merek-200">Panel Admin</p>
      </div>

      <nav className="flex-1 space-y-1 px-3" aria-label="Navigasi admin">
        {MENU.map((m) => {
          const aktif = m.tepat ? pathname === m.href : pathname.startsWith(m.href);
          return (
            <Link
              key={m.href}
              href={m.href}
              onClick={() => setTerbuka(false)}
              aria-current={aktif ? 'page' : undefined}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                aktif ? 'bg-merek-600 text-white' : 'text-merek-100 hover:bg-merek-700/60'
              }`}
            >
              {m.label}
            </Link>
          );
        })}

        <div className="my-3 border-t border-merek-700" />

        <Link
          href="/"
          target="_blank"
          className="block rounded-lg px-3 py-2 text-sm font-medium text-merek-100 hover:bg-merek-700/60"
        >
          Lihat Toko ↗
        </Link>
      </nav>

      <div className="border-t border-merek-700 p-3">
        <div className="px-2 pb-2">
          <p className="truncate text-sm font-medium text-white">{profil.nama}</p>
          <p className="truncate text-xs text-merek-200">{profil.email}</p>
          <span className="mt-1.5 inline-block rounded bg-merek-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-merek-100">
            {profil.role === 'ADMIN' ? 'Admin' : 'Staf'}
          </span>
        </div>
        <form action={keluar}>
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-merek-100 hover:bg-merek-700/60"
          >
            Keluar
          </button>
        </form>
      </div>
    </>
  );

  return (
    <>
      {/* Bar atas khusus mobile */}
      <div className="flex items-center gap-3 bg-merek-800 px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setTerbuka(true)}
          className="rounded-lg p-1.5 text-white hover:bg-merek-700"
          aria-label="Buka menu admin"
        >
          <IkonMenu className="h-6 w-6" />
        </button>
        <span className="font-semibold text-white">Panel Admin</span>
      </div>

      <aside className="hidden w-60 shrink-0 flex-col bg-merek-800 lg:sticky lg:top-0 lg:flex lg:h-screen">
        {isi}
      </aside>

      {terbuka && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-neutral-900/50"
            onClick={() => setTerbuka(false)}
            aria-label="Tutup menu"
          />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-merek-800">
            <button
              type="button"
              onClick={() => setTerbuka(false)}
              className="absolute right-3 top-4 rounded-lg p-1.5 text-white hover:bg-merek-700"
              aria-label="Tutup menu"
            >
              <IkonTutup className="h-5 w-5" />
            </button>
            {isi}
          </div>
        </div>
      )}
    </>
  );
}
