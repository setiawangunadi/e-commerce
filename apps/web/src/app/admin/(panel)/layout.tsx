import { redirect } from 'next/navigation';
import { SidebarAdmin } from '@/components/admin/sidebar';
import { ambilProfil } from '@/lib/sesi';

/**
 * Shell panel admin. Halaman login tidak memakai layout ini karena berada di
 * luar route group `(panel)`.
 *
 * `proxy.ts` hanya mengecek ada/tidaknya cookie; di sini token benar-benar
 * divalidasi ke API, sehingga token kedaluwarsa langsung dilempar ke login.
 */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const profil = await ambilProfil();
  if (!profil) redirect('/admin/login');

  return (
    <div className="min-h-screen bg-neutral-100 lg:flex">
      <SidebarAdmin profil={profil} />
      <div className="min-w-0 flex-1">
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
