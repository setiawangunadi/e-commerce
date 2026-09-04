import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { template: '%s | Admin', default: 'Admin' },
  // Panel admin tidak boleh terindeks mesin pencari.
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
